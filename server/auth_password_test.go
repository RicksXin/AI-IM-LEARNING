package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestPasswordSetupRequiresToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resetAuthStoreForTest()

	router := setupRouter()
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(
		http.MethodPost,
		"/auth/password/setup",
		bytes.NewBufferString(`{"password":"new123456"}`),
	)
	request.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("POST /auth/password/setup status = %d, want %d", recorder.Code, http.StatusUnauthorized)
	}
}

func TestPasswordSetupAllowsSMSUserToCreatePassword(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resetAuthStoreForTest()

	router := setupRouter()
	session := loginBySMSForTest(t, router, "13800007777")
	if session.HasPassword {
		t.Fatal("sms login should report has_password=false before setup")
	}
	if !session.ShouldSetPassword {
		t.Fatal("sms login should guide password setup")
	}

	setupRecorder := httptest.NewRecorder()
	setupRequest := httptest.NewRequest(
		http.MethodPost,
		"/auth/password/setup",
		bytes.NewBufferString(`{"password":"new123456"}`),
	)
	setupRequest.Header.Set("Authorization", "Bearer "+session.Token)
	setupRequest.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(setupRecorder, setupRequest)

	if setupRecorder.Code != http.StatusOK {
		t.Fatalf("POST /auth/password/setup status = %d, want %d; body = %s", setupRecorder.Code, http.StatusOK, setupRecorder.Body.String())
	}

	duplicateRecorder := httptest.NewRecorder()
	duplicateRequest := httptest.NewRequest(
		http.MethodPost,
		"/auth/password/setup",
		bytes.NewBufferString(`{"password":"another123"}`),
	)
	duplicateRequest.Header.Set("Authorization", "Bearer "+session.Token)
	duplicateRequest.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(duplicateRecorder, duplicateRequest)

	if duplicateRecorder.Code != http.StatusConflict {
		t.Fatalf("duplicate password setup status = %d, want %d", duplicateRecorder.Code, http.StatusConflict)
	}

	loginRecorder := httptest.NewRecorder()
	loginRequest := httptest.NewRequest(
		http.MethodPost,
		"/auth/login",
		bytes.NewBufferString(`{"phone":"13800007777","password":"new123456","login_type":"password"}`),
	)
	loginRequest.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(loginRecorder, loginRequest)

	if loginRecorder.Code != http.StatusOK {
		t.Fatalf("password login status = %d, want %d; body = %s", loginRecorder.Code, http.StatusOK, loginRecorder.Body.String())
	}

	var loginResponse LoginResponse
	if err := json.Unmarshal(loginRecorder.Body.Bytes(), &loginResponse); err != nil {
		t.Fatalf("decode password login: %v", err)
	}
	if !loginResponse.HasPassword {
		t.Fatal("password login should report has_password=true")
	}
	if loginResponse.ShouldSetPassword {
		t.Fatal("password login should not guide password setup")
	}
}

func TestPasswordChangeRequiresOldPassword(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resetAuthStoreForTest()

	router := setupRouter()
	session := loginBySMSForTest(t, router, "13800006666")
	setupPasswordForTest(t, router, session.Token, "old123456")

	wrongRecorder := httptest.NewRecorder()
	wrongRequest := httptest.NewRequest(
		http.MethodPut,
		"/auth/password",
		bytes.NewBufferString(`{"old_password":"wrong-password","new_password":"new123456"}`),
	)
	wrongRequest.Header.Set("Authorization", "Bearer "+session.Token)
	wrongRequest.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(wrongRecorder, wrongRequest)

	if wrongRecorder.Code != http.StatusUnauthorized {
		t.Fatalf("wrong old password status = %d, want %d", wrongRecorder.Code, http.StatusUnauthorized)
	}

	changeRecorder := httptest.NewRecorder()
	changeRequest := httptest.NewRequest(
		http.MethodPut,
		"/auth/password",
		bytes.NewBufferString(`{"old_password":"old123456","new_password":"new123456"}`),
	)
	changeRequest.Header.Set("Authorization", "Bearer "+session.Token)
	changeRequest.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(changeRecorder, changeRequest)

	if changeRecorder.Code != http.StatusOK {
		t.Fatalf("change password status = %d, want %d; body = %s", changeRecorder.Code, http.StatusOK, changeRecorder.Body.String())
	}

	oldLoginRecorder := httptest.NewRecorder()
	oldLoginRequest := httptest.NewRequest(
		http.MethodPost,
		"/auth/login",
		bytes.NewBufferString(`{"phone":"13800006666","password":"old123456","login_type":"password"}`),
	)
	oldLoginRequest.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(oldLoginRecorder, oldLoginRequest)

	if oldLoginRecorder.Code != http.StatusUnauthorized {
		t.Fatalf("old password login status = %d, want %d", oldLoginRecorder.Code, http.StatusUnauthorized)
	}

	newLoginRecorder := httptest.NewRecorder()
	newLoginRequest := httptest.NewRequest(
		http.MethodPost,
		"/auth/login",
		bytes.NewBufferString(`{"phone":"13800006666","password":"new123456","login_type":"password"}`),
	)
	newLoginRequest.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(newLoginRecorder, newLoginRequest)

	if newLoginRecorder.Code != http.StatusOK {
		t.Fatalf("new password login status = %d, want %d; body = %s", newLoginRecorder.Code, http.StatusOK, newLoginRecorder.Body.String())
	}
}

func setupPasswordForTest(t *testing.T, router *gin.Engine, token string, password string) {
	t.Helper()

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(
		http.MethodPost,
		"/auth/password/setup",
		bytes.NewBufferString(`{"password":"`+password+`"}`),
	)
	request.Header.Set("Authorization", "Bearer "+token)
	request.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("setup password status = %d, want %d; body = %s", recorder.Code, http.StatusOK, recorder.Body.String())
	}
}
