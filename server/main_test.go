package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
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

func TestWebSocketEndpointWelcomesAndEchoesTextMessages(t *testing.T) {
	gin.SetMode(gin.TestMode)

	server := httptest.NewServer(setupRouter())
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("dial websocket: %v", err)
	}
	defer conn.Close()

	messageType, welcome, err := conn.ReadMessage()
	if err != nil {
		t.Fatalf("read welcome: %v", err)
	}

	if messageType != websocket.TextMessage {
		t.Fatalf("welcome message type = %d, want %d", messageType, websocket.TextMessage)
	}

	if string(welcome) != websocketWelcomeMessage {
		t.Fatalf("welcome = %q, want %q", string(welcome), websocketWelcomeMessage)
	}

	if err := conn.WriteMessage(websocket.TextMessage, []byte("hello im")); err != nil {
		t.Fatalf("write text message: %v", err)
	}

	messageType, echo, err := conn.ReadMessage()
	if err != nil {
		t.Fatalf("read echo: %v", err)
	}

	if messageType != websocket.TextMessage {
		t.Fatalf("echo message type = %d, want %d", messageType, websocket.TextMessage)
	}

	if string(echo) != "echo: hello im" {
		t.Fatalf("echo = %q, want %q", string(echo), "echo: hello im")
	}
}
