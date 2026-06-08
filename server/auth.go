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
	Phone string `json:"phone"`
	Code  string `json:"code"`
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

type authClaims struct {
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
}

type authMemoryStore struct {
	mu           sync.RWMutex
	nextUserID   int
	smsCodes     map[string]string
	usersByID    map[string]authUser
	usersByPhone map[string]authUser
}

func newAuthMemoryStore() *authMemoryStore {
	return &authMemoryStore{
		nextUserID:   1,
		smsCodes:     map[string]string{},
		usersByID:    map[string]authUser{},
		usersByPhone: map[string]authUser{},
	}
}

var authStore = newAuthMemoryStore()

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

	authStore.saveSMSCode(phone, code)
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
	code := strings.TrimSpace(request.Code)
	if phone == "" || code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "phone and code are required"})
		return
	}

	if !authStore.verifySMSCode(phone, code) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid phone or code"})
		return
	}

	user := authStore.findOrCreateUserByPhone(phone)
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

	user, ok := authStore.findUserByID(userID)
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

func (store *authMemoryStore) saveSMSCode(phone string, code string) {
	store.mu.Lock()
	defer store.mu.Unlock()

	store.smsCodes[phone] = code
}

func (store *authMemoryStore) verifySMSCode(phone string, code string) bool {
	store.mu.RLock()
	defer store.mu.RUnlock()

	return store.smsCodes[phone] == code
}

func (store *authMemoryStore) findOrCreateUserByPhone(phone string) authUser {
	store.mu.Lock()
	defer store.mu.Unlock()

	if user, ok := store.usersByPhone[phone]; ok {
		return user
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

	return user
}

func (store *authMemoryStore) findUserByID(userID string) (authUser, bool) {
	store.mu.RLock()
	defer store.mu.RUnlock()

	user, ok := store.usersByID[userID]
	return user, ok
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
