package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestVersionEndpoint(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := setupRouter()
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/v", nil)

	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("GET /v status = %d, want %d", recorder.Code, http.StatusOK)
	}

	var response VersionResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if response.Name != appName {
		t.Fatalf("name = %q, want %q", response.Name, appName)
	}

	if response.Version != appVersion {
		t.Fatalf("version = %q, want %q", response.Version, appVersion)
	}
}

func TestConversationEndpoint(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := setupRouter()
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/conversation", nil)

	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("GET /conversation status = %d, want %d", recorder.Code, http.StatusOK)
	}

	var response []ConversationResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if len(response) != 20 {
		t.Fatalf("conversation count = %d, want 20", len(response))
	}

	for index, conversation := range response {
		if conversation.Title == "" {
			t.Fatalf("conversation[%d].title is empty", index)
		}

		if conversation.LastMsg == "" {
			t.Fatalf("conversation[%d].lastMsg is empty", index)
		}

		if conversation.Time == "" {
			t.Fatalf("conversation[%d].time is empty", index)
		}
	}
}
