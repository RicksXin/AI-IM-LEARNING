package flashauth

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
	Token             string `json:"token"`
	UserID            string `json:"user_id"`
	AccountID         string `json:"account_id"`
	HasPassword       bool   `json:"has_password"`
	ShouldSetPassword bool   `json:"should_set_password"`
}

type UserProfileResponse struct {
	UserID    string `json:"user_id"`
	AccountID string `json:"account_id"`
	Nickname  string `json:"nickname"`
	Avatar    string `json:"avatar"`
	Phone     string `json:"phone"`
}

type PasswordSetupRequest struct {
	Password string `json:"password"`
}

type PasswordChangeRequest struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

type User struct {
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

const authCredentialTypePhone = "phone"

type Store interface {
	saveSMSCode(phone string, code string) error
	verifySMSCode(phone string, code string) (bool, error)
	findOrCreateUserByPhone(phone string) (User, error)
	authenticatePassword(phone string, password string) (User, bool, error)
	findUserByID(userID string) (User, bool, error)
	hasPassword(userID string) (bool, error)
	setInitialPassword(userID string, password string) error
	changePassword(userID string, oldPassword string, newPassword string) error
}

type authClaims struct {
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
}

type MemoryStore struct {
	mu               sync.RWMutex
	nextUserID       int
	smsCodes         map[string]string
	usersByID        map[string]User
	usersByPhone     map[string]User
	passwordsByPhone map[string]string
}

var defaultPasswordUsers = []authPasswordSeed{
	{Phone: "13800000001", Password: "im123456", Nickname: "Alice"},
	{Phone: "13800000002", Password: "chat123456", Nickname: "Bob"},
	{Phone: "13800000003", Password: "demo123456", Nickname: "Demo User"},
}

func NewMemoryStore() *MemoryStore {
	store := &MemoryStore{
		nextUserID:       1,
		smsCodes:         map[string]string{},
		usersByID:        map[string]User{},
		usersByPhone:     map[string]User{},
		passwordsByPhone: map[string]string{},
	}
	for _, seed := range defaultPasswordUsers {
		store.seedPasswordUser(seed.Phone, seed.Password, seed.Nickname)
	}

	return store
}

var store Store = NewMemoryStore()

func ResetStoreForTest() {
	store = NewMemoryStore()
}

func FindOrCreateUserByPhone(phone string) (User, error) {
	return store.findOrCreateUserByPhone(phone)
}

func FindUserByID(userID string) (User, bool, error) {
	return store.findUserByID(userID)
}

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

	if err := store.saveSMSCode(phone, code); err != nil {
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

	token, err := GenerateJWTForUser(user.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	hasPassword, err := store.hasPassword(user.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "auth storage failed"})
		return
	}

	c.JSON(http.StatusOK, LoginResponse{
		Token:             token,
		UserID:            user.UserID,
		AccountID:         user.UserID,
		HasPassword:       hasPassword,
		ShouldSetPassword: !hasPassword,
	})
}

var (
	errInvalidLoginRequest = errors.New("invalid login request")
	errAuthStoreFailure    = errors.New("auth store failure")
	errPasswordAlreadySet  = errors.New("password already set")
	errPasswordMismatch    = errors.New("password mismatch")
)

func authenticateLogin(request LoginRequest, phone string, loginType LoginType) (User, error) {
	switch loginType {
	case LoginTypeSMS:
		code := strings.TrimSpace(request.Code)
		if code == "" {
			return User{}, fmt.Errorf("%w: phone and code are required", errInvalidLoginRequest)
		}

		ok, err := store.verifySMSCode(phone, code)
		if err != nil {
			return User{}, fmt.Errorf("%w: verify sms code: %v", errAuthStoreFailure, err)
		}

		if !ok {
			return User{}, errors.New("invalid phone or code")
		}

		user, err := store.findOrCreateUserByPhone(phone)
		if err != nil {
			return User{}, fmt.Errorf("%w: find or create user: %v", errAuthStoreFailure, err)
		}

		return user, nil
	case LoginTypePassword:
		password := strings.TrimSpace(request.Password)
		if password == "" {
			return User{}, fmt.Errorf("%w: phone and password are required", errInvalidLoginRequest)
		}

		user, ok, err := store.authenticatePassword(phone, password)
		if err != nil {
			return User{}, fmt.Errorf("%w: verify password: %v", errAuthStoreFailure, err)
		}
		if !ok {
			return User{}, errors.New("invalid phone or password")
		}

		return user, nil
	default:
		return User{}, fmt.Errorf("%w: unsupported login_type", errInvalidLoginRequest)
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
	userID, ok := requireAuthUserID(c)
	if !ok {
		return
	}

	user, ok, err := store.findUserByID(userID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}

	c.JSON(http.StatusOK, UserProfileResponse{
		UserID:    user.UserID,
		AccountID: user.UserID,
		Nickname:  user.Nickname,
		Avatar:    user.Avatar,
		Phone:     user.Phone,
	})
}

func handlePasswordSetup(c *gin.Context) {
	userID, ok := requireAuthUserID(c)
	if !ok {
		return
	}

	var request PasswordSetupRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	password := strings.TrimSpace(request.Password)
	if err := validateAuthPassword(password); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := store.setInitialPassword(userID, password); err != nil {
		if errors.Is(err, errPasswordAlreadySet) {
			c.JSON(http.StatusConflict, gin.H{"error": "password already set"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "auth storage failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func handlePasswordChange(c *gin.Context) {
	userID, ok := requireAuthUserID(c)
	if !ok {
		return
	}

	var request PasswordChangeRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	oldPassword := strings.TrimSpace(request.OldPassword)
	newPassword := strings.TrimSpace(request.NewPassword)
	if oldPassword == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "old_password is required"})
		return
	}
	if err := validateAuthPassword(newPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := store.changePassword(userID, oldPassword, newPassword); err != nil {
		if errors.Is(err, errPasswordMismatch) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "old password is invalid"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "auth storage failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func requireAuthUserID(c *gin.Context) (string, bool) {
	tokenText := extractTokenFromHeader(c.GetHeader("Authorization"), c.GetHeader("Token"))
	if tokenText == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "token is required"})
		return "", false
	}

	userID, err := ParseUserIDFromJWT(tokenText)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return "", false
	}

	return userID, true
}

func validateAuthPassword(password string) error {
	if password == "" {
		return errors.New("password is required")
	}
	if len(password) < 6 {
		return errors.New("password must be at least 6 characters")
	}

	return nil
}

func (store *MemoryStore) saveSMSCode(phone string, code string) error {
	store.mu.Lock()
	defer store.mu.Unlock()

	store.smsCodes[phone] = code
	return nil
}

func (store *MemoryStore) verifySMSCode(phone string, code string) (bool, error) {
	store.mu.RLock()
	defer store.mu.RUnlock()

	return store.smsCodes[phone] == code, nil
}

func (store *MemoryStore) findOrCreateUserByPhone(phone string) (User, error) {
	store.mu.Lock()
	defer store.mu.Unlock()

	if user, ok := store.usersByPhone[phone]; ok {
		return user, nil
	}

	userID := fmt.Sprintf("u_%06d", store.nextUserID)
	user := User{
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

func (store *MemoryStore) authenticatePassword(phone string, password string) (User, bool, error) {
	store.mu.RLock()
	defer store.mu.RUnlock()

	if store.passwordsByPhone[phone] != password {
		return User{}, false, nil
	}

	user, ok := store.usersByPhone[phone]
	return user, ok, nil
}

func (store *MemoryStore) findUserByID(userID string) (User, bool, error) {
	store.mu.RLock()
	defer store.mu.RUnlock()

	user, ok := store.usersByID[userID]
	return user, ok, nil
}

func (store *MemoryStore) hasPassword(userID string) (bool, error) {
	store.mu.RLock()
	defer store.mu.RUnlock()

	user, ok := store.usersByID[userID]
	if !ok {
		return false, nil
	}

	password := store.passwordsByPhone[user.Phone]
	return password != "", nil
}

func (store *MemoryStore) setInitialPassword(userID string, password string) error {
	store.mu.Lock()
	defer store.mu.Unlock()

	user, ok := store.usersByID[userID]
	if !ok {
		return errors.New("user not found")
	}
	if store.passwordsByPhone[user.Phone] != "" {
		return errPasswordAlreadySet
	}

	store.passwordsByPhone[user.Phone] = password
	return nil
}

func (store *MemoryStore) changePassword(userID string, oldPassword string, newPassword string) error {
	store.mu.Lock()
	defer store.mu.Unlock()

	user, ok := store.usersByID[userID]
	if !ok {
		return errors.New("user not found")
	}
	if store.passwordsByPhone[user.Phone] != oldPassword {
		return errPasswordMismatch
	}

	store.passwordsByPhone[user.Phone] = newPassword
	return nil
}

func (store *MemoryStore) seedPasswordUser(phone string, password string, nickname string) {
	userID := fmt.Sprintf("u_%06d", store.nextUserID)
	user := User{
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

func GenerateJWTForUser(userID string) (string, error) {
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

func ParseUserIDFromJWT(tokenText string) (string, error) {
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
