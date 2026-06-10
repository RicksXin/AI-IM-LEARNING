package main

import (
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

const (
	authJWTIssuer   = "learningai-im-playground"
	authJWTDuration = 24 * time.Hour
)

var authJWTSecret = []byte("learningai-im-playground-secret")

type SMSRequest struct {
	Phone string `json:"phone"`
}

type SMSResponse struct {
	Code  string `json:"code"`
	Phone string `json:"phone"`
}

type LoginRequest struct {
	Phone     string    `json:"phone"`
	Code      string    `json:"code"`
	Password  string    `json:"password"`
	LoginType LoginType `json:"login_type"`
}

type LoginResponse struct {
	Token  string `json:"token"`
	UserID string `json:"user_id"`
}

type UserProfileResponse struct {
	UserID   string `json:"user_id"`
	Nickname string `json:"nickname"`
	Avatar   string `json:"avatar"`
	Phone    string `json:"phone"`
}

type authUser struct {
	UserID   string
	Nickname string
	Avatar   string
	Phone    string
}

type authPasswordSeed struct {
	Phone    string
	Password string
	Nickname string
}

type LoginType string

const (
	LoginTypeSMS      LoginType = "sms"
	LoginTypePassword LoginType = "password"
)

type authStoreBackend interface {
	saveSMSCode(phone string, code string) error
	verifySMSCode(phone string, code string) (bool, error)
	findOrCreateUserByPhone(phone string) (authUser, error)
	authenticatePassword(phone string, password string) (authUser, bool, error)
	findUserByID(userID string) (authUser, bool, error)
}

type authClaims struct {
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
}

type authMemoryStore struct {
	mu               sync.RWMutex
	nextUserID       int
	smsCodes         map[string]string
	usersByID        map[string]authUser
	usersByPhone     map[string]authUser
	passwordsByPhone map[string]string
}

var defaultPasswordUsers = []authPasswordSeed{
	{Phone: "13800000001", Password: "im123456", Nickname: "Alice"},
	{Phone: "13800000002", Password: "chat123456", Nickname: "Bob"},
	{Phone: "13800000003", Password: "demo123456", Nickname: "Demo User"},
}

func newAuthMemoryStore() *authMemoryStore {
	store := &authMemoryStore{
		nextUserID:       1,
		smsCodes:         map[string]string{},
		usersByID:        map[string]authUser{},
		usersByPhone:     map[string]authUser{},
		passwordsByPhone: map[string]string{},
	}
	for _, seed := range defaultPasswordUsers {
		store.seedPasswordUser(seed.Phone, seed.Password, seed.Nickname)
	}

	return store
}

var authStore authStoreBackend = newAuthMemoryStore()

func handleSendSMS(c *gin.Context) {
	var request SMSRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	phone := strings.TrimSpace(request.Phone)
	if phone == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "phone is required"})
		return
	}

	code, err := generateSMSCode()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate sms code"})
		return
	}

	if err := authStore.saveSMSCode(phone, code); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save sms code"})
		return
	}

	c.JSON(http.StatusOK, SMSResponse{
		Code:  code,
		Phone: phone,
	})
}

func handleLogin(c *gin.Context) {
	var request LoginRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	phone := strings.TrimSpace(request.Phone)
	loginType, ok := normalizeLoginType(request.LoginType)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported login_type"})
		return
	}

	if phone == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "phone is required"})
		return
	}

	user, err := authenticateLogin(request, phone, loginType)
	if err != nil {
		status := http.StatusUnauthorized
		message := err.Error()
		if errors.Is(err, errInvalidLoginRequest) {
			status = http.StatusBadRequest
			message = strings.TrimPrefix(message, errInvalidLoginRequest.Error()+": ")
		} else if errors.Is(err, errAuthStoreFailure) {
			status = http.StatusInternalServerError
			message = "auth storage failed"
		}
		c.JSON(status, gin.H{"error": message})
		return
	}

	token, err := generateJWTForUser(user.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, LoginResponse{
		Token:  token,
		UserID: user.UserID,
	})
}

var (
	errInvalidLoginRequest = errors.New("invalid login request")
	errAuthStoreFailure    = errors.New("auth store failure")
)

func authenticateLogin(request LoginRequest, phone string, loginType LoginType) (authUser, error) {
	switch loginType {
	case LoginTypeSMS:
		code := strings.TrimSpace(request.Code)
		if code == "" {
			return authUser{}, fmt.Errorf("%w: phone and code are required", errInvalidLoginRequest)
		}

		ok, err := authStore.verifySMSCode(phone, code)
		if err != nil {
			return authUser{}, fmt.Errorf("%w: verify sms code: %v", errAuthStoreFailure, err)
		}

		if !ok {
			return authUser{}, errors.New("invalid phone or code")
		}

		user, err := authStore.findOrCreateUserByPhone(phone)
		if err != nil {
			return authUser{}, fmt.Errorf("%w: find or create user: %v", errAuthStoreFailure, err)
		}

		return user, nil
	case LoginTypePassword:
		password := strings.TrimSpace(request.Password)
		if password == "" {
			return authUser{}, fmt.Errorf("%w: phone and password are required", errInvalidLoginRequest)
		}

		user, ok, err := authStore.authenticatePassword(phone, password)
		if err != nil {
			return authUser{}, fmt.Errorf("%w: verify password: %v", errAuthStoreFailure, err)
		}
		if !ok {
			return authUser{}, errors.New("invalid phone or password")
		}

		return user, nil
	default:
		return authUser{}, fmt.Errorf("%w: unsupported login_type", errInvalidLoginRequest)
	}
}

func normalizeLoginType(loginType LoginType) (LoginType, bool) {
	switch loginType {
	case "":
		return LoginTypeSMS, true
	case LoginTypeSMS, LoginTypePassword:
		return loginType, true
	default:
		return "", false
	}
}

func handleUserProfile(c *gin.Context) {
	tokenText := extractTokenFromHeader(c.GetHeader("Authorization"), c.GetHeader("Token"))
	if tokenText == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "token is required"})
		return
	}

	userID, err := parseUserIDFromJWT(tokenText)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}

	user, ok, err := authStore.findUserByID(userID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}

	c.JSON(http.StatusOK, UserProfileResponse{
		UserID:   user.UserID,
		Nickname: user.Nickname,
		Avatar:   user.Avatar,
		Phone:    user.Phone,
	})
}

func (store *authMemoryStore) saveSMSCode(phone string, code string) error {
	store.mu.Lock()
	defer store.mu.Unlock()

	store.smsCodes[phone] = code
	return nil
}

func (store *authMemoryStore) verifySMSCode(phone string, code string) (bool, error) {
	store.mu.RLock()
	defer store.mu.RUnlock()

	return store.smsCodes[phone] == code, nil
}

func (store *authMemoryStore) findOrCreateUserByPhone(phone string) (authUser, error) {
	store.mu.Lock()
	defer store.mu.Unlock()

	if user, ok := store.usersByPhone[phone]; ok {
		return user, nil
	}

	userID := fmt.Sprintf("u_%06d", store.nextUserID)
	user := authUser{
		UserID:   userID,
		Nickname: phone,
		Avatar:   fmt.Sprintf("https://example.com/avatars/%s.png", userID),
		Phone:    phone,
	}
	store.nextUserID += 1
	store.usersByID[user.UserID] = user
	store.usersByPhone[phone] = user

	return user, nil
}

func (store *authMemoryStore) authenticatePassword(phone string, password string) (authUser, bool, error) {
	store.mu.RLock()
	defer store.mu.RUnlock()

	if store.passwordsByPhone[phone] != password {
		return authUser{}, false, nil
	}

	user, ok := store.usersByPhone[phone]
	return user, ok, nil
}

func (store *authMemoryStore) findUserByID(userID string) (authUser, bool, error) {
	store.mu.RLock()
	defer store.mu.RUnlock()

	user, ok := store.usersByID[userID]
	return user, ok, nil
}

func (store *authMemoryStore) seedPasswordUser(phone string, password string, nickname string) {
	userID := fmt.Sprintf("u_%06d", store.nextUserID)
	user := authUser{
		UserID:   userID,
		Nickname: nickname,
		Avatar:   fmt.Sprintf("https://example.com/avatars/%s.png", userID),
		Phone:    phone,
	}
	store.nextUserID += 1
	store.usersByID[user.UserID] = user
	store.usersByPhone[phone] = user
	store.passwordsByPhone[phone] = password
}

func generateSMSCode() (string, error) {
	value, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%06d", value.Int64()), nil
}

func generateJWTForUser(userID string) (string, error) {
	now := time.Now()
	claims := authClaims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(authJWTDuration)),
			IssuedAt:  jwt.NewNumericDate(now),
			Issuer:    authJWTIssuer,
			Subject:   userID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(authJWTSecret)
}

func parseUserIDFromJWT(tokenText string) (string, error) {
	token, err := jwt.ParseWithClaims(tokenText, &authClaims{}, func(token *jwt.Token) (interface{}, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("unexpected signing method: %s", token.Method.Alg())
		}

		return authJWTSecret, nil
	})
	if err != nil {
		return "", err
	}

	claims, ok := token.Claims.(*authClaims)
	if !ok || !token.Valid || claims.UserID == "" {
		return "", errors.New("invalid token claims")
	}

	return claims.UserID, nil
}

func extractTokenFromHeader(authorization string, tokenHeader string) string {
	authorization = strings.TrimSpace(authorization)
	if authorization != "" {
		const bearerPrefix = "Bearer "
		if strings.HasPrefix(authorization, bearerPrefix) {
			return strings.TrimSpace(strings.TrimPrefix(authorization, bearerPrefix))
		}

		return authorization
	}

	return strings.TrimSpace(tokenHeader)
}
