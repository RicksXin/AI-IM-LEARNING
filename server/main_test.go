package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"testing"

	flashauth "learningai/server/modules/flash_auth"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

func resetAuthStoreForTest() {
	flashauth.ResetStoreForTest()
	defaultChatRoomHub = newChatRoomHub()
}

func loginBySMSForTest(t *testing.T, router *gin.Engine, phone string) flashauth.LoginResponse {
	t.Helper()

	smsRecorder := httptest.NewRecorder()
	smsRequest := httptest.NewRequest(
		http.MethodPost,
		"/auth/sms",
		bytes.NewBufferString(`{"phone":"`+phone+`"}`),
	)
	smsRequest.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(smsRecorder, smsRequest)

	if smsRecorder.Code != http.StatusOK {
		t.Fatalf("POST /auth/sms status = %d, want %d; body = %s", smsRecorder.Code, http.StatusOK, smsRecorder.Body.String())
	}

	var smsResponse flashauth.SMSResponse
	if err := json.Unmarshal(smsRecorder.Body.Bytes(), &smsResponse); err != nil {
		t.Fatalf("decode sms response: %v", err)
	}

	loginRecorder := httptest.NewRecorder()
	loginBody := `{"phone":"` + phone + `","code":"` + smsResponse.Code + `","login_type":"sms"}`
	loginRequest := httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewBufferString(loginBody))
	loginRequest.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(loginRecorder, loginRequest)

	if loginRecorder.Code != http.StatusOK {
		t.Fatalf("POST /auth/login status = %d, want %d; body = %s", loginRecorder.Code, http.StatusOK, loginRecorder.Body.String())
	}

	var loginResponse flashauth.LoginResponse
	if err := json.Unmarshal(loginRecorder.Body.Bytes(), &loginResponse); err != nil {
		t.Fatalf("decode login response: %v", err)
	}

	return loginResponse
}

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

func TestChatRoomWebSocketAuthenticatesThenHandlesPingAndChat(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resetAuthStoreForTest()

	user, err := flashauth.FindOrCreateUserByPhone("13800000001")
	if err != nil {
		t.Fatalf("create auth user: %v", err)
	}
	token, err := flashauth.GenerateJWTForUser(user.UserID)
	if err != nil {
		t.Fatalf("generate jwt: %v", err)
	}

	server := httptest.NewServer(setupRouter())
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/chat_room"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("dial chat room websocket: %v", err)
	}
	defer conn.Close()

	var authRequired chatRoomServerMessage
	if err := conn.ReadJSON(&authRequired); err != nil {
		t.Fatalf("read auth_required: %v", err)
	}
	if authRequired.Type != chatRoomAuthRequiredType {
		t.Fatalf("auth_required type = %q, want %q", authRequired.Type, chatRoomAuthRequiredType)
	}

	if err := conn.WriteJSON(chatRoomClientMessage{
		Type:  chatRoomAuthType,
		Token: token,
	}); err != nil {
		t.Fatalf("write auth: %v", err)
	}

	var authSuccess chatRoomServerMessage
	if err := conn.ReadJSON(&authSuccess); err != nil {
		t.Fatalf("read auth_success: %v", err)
	}
	if authSuccess.Type != chatRoomAuthSuccessType {
		t.Fatalf("auth_success type = %q, want %q", authSuccess.Type, chatRoomAuthSuccessType)
	}
	if authSuccess.UserID != user.UserID {
		t.Fatalf("auth_success user_id = %q, want %q", authSuccess.UserID, user.UserID)
	}

	if err := conn.WriteJSON(chatRoomClientMessage{Type: chatRoomPingType}); err != nil {
		t.Fatalf("write ping: %v", err)
	}

	var pong chatRoomServerMessage
	if err := conn.ReadJSON(&pong); err != nil {
		t.Fatalf("read pong: %v", err)
	}
	if pong.Type != chatRoomPongType {
		t.Fatalf("pong type = %q, want %q", pong.Type, chatRoomPongType)
	}

	if err := conn.WriteJSON(chatRoomClientMessage{
		Type:    chatRoomChatType,
		Content: "hello chat room",
	}); err != nil {
		t.Fatalf("write chat: %v", err)
	}

	var chat chatRoomServerMessage
	if err := conn.ReadJSON(&chat); err != nil {
		t.Fatalf("read chat: %v", err)
	}
	if chat.Type != chatRoomChatType {
		t.Fatalf("chat type = %q, want %q", chat.Type, chatRoomChatType)
	}
	if chat.UserID != user.UserID {
		t.Fatalf("chat user_id = %q, want %q", chat.UserID, user.UserID)
	}
	if chat.Nickname != user.Nickname {
		t.Fatalf("chat nickname = %q, want %q", chat.Nickname, user.Nickname)
	}
	if chat.Content != "hello chat room" {
		t.Fatalf("chat content = %q, want %q", chat.Content, "hello chat room")
	}
	if chat.Time == "" {
		t.Fatal("chat time is empty")
	}
}

func TestChatRoomWebSocketBroadcastsChatToAuthenticatedClients(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resetAuthStoreForTest()

	sender, err := flashauth.FindOrCreateUserByPhone("13800000001")
	if err != nil {
		t.Fatalf("create sender auth user: %v", err)
	}
	receiver, err := flashauth.FindOrCreateUserByPhone("13800000002")
	if err != nil {
		t.Fatalf("create receiver auth user: %v", err)
	}
	senderToken, err := flashauth.GenerateJWTForUser(sender.UserID)
	if err != nil {
		t.Fatalf("generate sender jwt: %v", err)
	}
	receiverToken, err := flashauth.GenerateJWTForUser(receiver.UserID)
	if err != nil {
		t.Fatalf("generate receiver jwt: %v", err)
	}

	server := httptest.NewServer(setupRouter())
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/chat_room"
	senderConn := dialAuthenticatedChatRoom(t, wsURL, senderToken, sender.UserID)
	defer senderConn.Close()
	receiverConn := dialAuthenticatedChatRoom(t, wsURL, receiverToken, receiver.UserID)
	defer receiverConn.Close()

	if err := senderConn.WriteJSON(chatRoomClientMessage{
		Type:    chatRoomChatType,
		Content: "hello everyone",
	}); err != nil {
		t.Fatalf("sender write chat: %v", err)
	}

	senderMessage := readChatRoomMessage(t, senderConn, "sender broadcast")
	receiverMessage := readChatRoomMessage(t, receiverConn, "receiver broadcast")

	for label, message := range map[string]chatRoomServerMessage{
		"sender":   senderMessage,
		"receiver": receiverMessage,
	} {
		if message.Type != chatRoomChatType {
			t.Fatalf("%s message type = %q, want %q", label, message.Type, chatRoomChatType)
		}
		if message.UserID != sender.UserID {
			t.Fatalf("%s message user_id = %q, want %q", label, message.UserID, sender.UserID)
		}
		if message.Nickname != sender.Nickname {
			t.Fatalf("%s message nickname = %q, want %q", label, message.Nickname, sender.Nickname)
		}
		if message.Content != "hello everyone" {
			t.Fatalf("%s message content = %q, want %q", label, message.Content, "hello everyone")
		}
	}
}

func TestChatRoomWebSocketRejectsInvalidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resetAuthStoreForTest()

	server := httptest.NewServer(setupRouter())
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/chat_room"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("dial chat room websocket: %v", err)
	}
	defer conn.Close()

	var authRequired chatRoomServerMessage
	if err := conn.ReadJSON(&authRequired); err != nil {
		t.Fatalf("read auth_required: %v", err)
	}

	if err := conn.WriteJSON(chatRoomClientMessage{
		Type:  chatRoomAuthType,
		Token: "not-a-valid-token",
	}); err != nil {
		t.Fatalf("write invalid auth: %v", err)
	}

	var authFailed chatRoomServerMessage
	if err := conn.ReadJSON(&authFailed); err != nil {
		t.Fatalf("read auth_failed: %v", err)
	}
	if authFailed.Type != chatRoomAuthFailedType {
		t.Fatalf("auth_failed type = %q, want %q", authFailed.Type, chatRoomAuthFailedType)
	}
	if authFailed.Message == "" {
		t.Fatal("auth_failed message is empty")
	}
}

func dialAuthenticatedChatRoom(t *testing.T, wsURL string, token string, wantUserID string) *websocket.Conn {
	t.Helper()

	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("dial chat room websocket: %v", err)
	}

	var authRequired chatRoomServerMessage
	if err := conn.ReadJSON(&authRequired); err != nil {
		_ = conn.Close()
		t.Fatalf("read auth_required: %v", err)
	}
	if authRequired.Type != chatRoomAuthRequiredType {
		_ = conn.Close()
		t.Fatalf("auth_required type = %q, want %q", authRequired.Type, chatRoomAuthRequiredType)
	}

	if err := conn.WriteJSON(chatRoomClientMessage{
		Type:  chatRoomAuthType,
		Token: token,
	}); err != nil {
		_ = conn.Close()
		t.Fatalf("write auth: %v", err)
	}

	authSuccess := readChatRoomMessage(t, conn, "auth_success")
	if authSuccess.Type != chatRoomAuthSuccessType {
		_ = conn.Close()
		t.Fatalf("auth_success type = %q, want %q", authSuccess.Type, chatRoomAuthSuccessType)
	}
	if authSuccess.UserID != wantUserID {
		_ = conn.Close()
		t.Fatalf("auth_success user_id = %q, want %q", authSuccess.UserID, wantUserID)
	}

	return conn
}

func readChatRoomMessage(t *testing.T, conn *websocket.Conn, label string) chatRoomServerMessage {
	t.Helper()

	var message chatRoomServerMessage
	if err := conn.ReadJSON(&message); err != nil {
		t.Fatalf("read %s: %v", label, err)
	}

	return message
}

func TestChatRoomWebSocketRejectsChatBeforeAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resetAuthStoreForTest()

	server := httptest.NewServer(setupRouter())
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/chat_room"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("dial chat room websocket: %v", err)
	}
	defer conn.Close()

	var authRequired chatRoomServerMessage
	if err := conn.ReadJSON(&authRequired); err != nil {
		t.Fatalf("read auth_required: %v", err)
	}

	if err := conn.WriteJSON(chatRoomClientMessage{
		Type:    chatRoomChatType,
		Content: "message before auth",
	}); err != nil {
		t.Fatalf("write chat before auth: %v", err)
	}

	var authFailed chatRoomServerMessage
	if err := conn.ReadJSON(&authFailed); err != nil {
		t.Fatalf("read auth_failed: %v", err)
	}
	if authFailed.Type != chatRoomAuthFailedType {
		t.Fatalf("auth_failed type = %q, want %q", authFailed.Type, chatRoomAuthFailedType)
	}
}

func TestAuthSMSLoginAndProfileFlow(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resetAuthStoreForTest()

	router := setupRouter()
	phone := "13899990000"

	smsRecorder := httptest.NewRecorder()
	smsRequest := httptest.NewRequest(
		http.MethodPost,
		"/auth/sms",
		bytes.NewBufferString(`{"phone":"`+phone+`"}`),
	)
	smsRequest.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(smsRecorder, smsRequest)

	if smsRecorder.Code != http.StatusOK {
		t.Fatalf("POST /auth/sms status = %d, want %d", smsRecorder.Code, http.StatusOK)
	}

	var smsResponse flashauth.SMSResponse
	if err := json.Unmarshal(smsRecorder.Body.Bytes(), &smsResponse); err != nil {
		t.Fatalf("decode sms response: %v", err)
	}

	if smsResponse.Phone != phone {
		t.Fatalf("sms phone = %q, want %q", smsResponse.Phone, phone)
	}

	if matched := regexp.MustCompile(`^\d{6}$`).MatchString(smsResponse.Code); !matched {
		t.Fatalf("sms code = %q, want six digits", smsResponse.Code)
	}

	loginRecorder := httptest.NewRecorder()
	loginBody := `{"phone":"` + phone + `","code":"` + smsResponse.Code + `","login_type":"sms"}`
	loginRequest := httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewBufferString(loginBody))
	loginRequest.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(loginRecorder, loginRequest)

	if loginRecorder.Code != http.StatusOK {
		t.Fatalf("POST /auth/login status = %d, want %d", loginRecorder.Code, http.StatusOK)
	}

	var loginResponse flashauth.LoginResponse
	if err := json.Unmarshal(loginRecorder.Body.Bytes(), &loginResponse); err != nil {
		t.Fatalf("decode login response: %v", err)
	}

	if loginResponse.UserID == "" {
		t.Fatal("login response user_id is empty")
	}

	if loginResponse.AccountID != loginResponse.UserID {
		t.Fatalf("login response account_id = %q, want %q", loginResponse.AccountID, loginResponse.UserID)
	}

	if loginResponse.HasPassword {
		t.Fatal("sms login should report has_password=false")
	}

	if !loginResponse.ShouldSetPassword {
		t.Fatal("sms login should report should_set_password=true")
	}

	if loginResponse.Token == "" {
		t.Fatal("login response token is empty")
	}

	userIDFromToken, err := flashauth.ParseUserIDFromJWT(loginResponse.Token)
	if err != nil {
		t.Fatalf("parse jwt token: %v", err)
	}

	if userIDFromToken != loginResponse.UserID {
		t.Fatalf("token user_id = %q, want %q", userIDFromToken, loginResponse.UserID)
	}

	profileRecorder := httptest.NewRecorder()
	profileRequest := httptest.NewRequest(http.MethodGet, "/auth/profile", nil)
	profileRequest.Header.Set("Authorization", "Bearer "+loginResponse.Token)

	router.ServeHTTP(profileRecorder, profileRequest)

	if profileRecorder.Code != http.StatusOK {
		t.Fatalf("GET /auth/profile status = %d, want %d", profileRecorder.Code, http.StatusOK)
	}

	var profile flashauth.UserProfileResponse
	if err := json.Unmarshal(profileRecorder.Body.Bytes(), &profile); err != nil {
		t.Fatalf("decode profile response: %v", err)
	}

	if profile.UserID != loginResponse.UserID {
		t.Fatalf("profile user_id = %q, want %q", profile.UserID, loginResponse.UserID)
	}

	if profile.Nickname != phone {
		t.Fatalf("profile nickname = %q, want %q", profile.Nickname, phone)
	}

	if profile.Phone != phone {
		t.Fatalf("profile phone = %q, want %q", profile.Phone, phone)
	}

	if profile.Avatar == "" {
		t.Fatal("profile avatar is empty")
	}
}

func TestAuthPasswordLoginAndProfileFlow(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resetAuthStoreForTest()

	router := setupRouter()
	loginRecorder := httptest.NewRecorder()
	loginBody := `{"phone":"13800000001","password":"im123456","login_type":"password"}`
	loginRequest := httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewBufferString(loginBody))
	loginRequest.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(loginRecorder, loginRequest)

	if loginRecorder.Code != http.StatusOK {
		t.Fatalf("POST /auth/login status = %d, want %d", loginRecorder.Code, http.StatusOK)
	}

	var loginResponse flashauth.LoginResponse
	if err := json.Unmarshal(loginRecorder.Body.Bytes(), &loginResponse); err != nil {
		t.Fatalf("decode login response: %v", err)
	}

	if loginResponse.UserID == "" {
		t.Fatal("login response user_id is empty")
	}

	if loginResponse.AccountID != loginResponse.UserID {
		t.Fatalf("login response account_id = %q, want %q", loginResponse.AccountID, loginResponse.UserID)
	}

	if !loginResponse.HasPassword {
		t.Fatal("password login should report has_password=true")
	}

	if loginResponse.ShouldSetPassword {
		t.Fatal("password login should report should_set_password=false")
	}

	if loginResponse.Token == "" {
		t.Fatal("login response token is empty")
	}

	profileRecorder := httptest.NewRecorder()
	profileRequest := httptest.NewRequest(http.MethodGet, "/user/profile", nil)
	profileRequest.Header.Set("Authorization", "Bearer "+loginResponse.Token)

	router.ServeHTTP(profileRecorder, profileRequest)

	if profileRecorder.Code != http.StatusOK {
		t.Fatalf("GET /user/profile status = %d, want %d", profileRecorder.Code, http.StatusOK)
	}

	var profile flashauth.UserProfileResponse
	if err := json.Unmarshal(profileRecorder.Body.Bytes(), &profile); err != nil {
		t.Fatalf("decode profile response: %v", err)
	}

	if profile.UserID != loginResponse.UserID {
		t.Fatalf("profile user_id = %q, want %q", profile.UserID, loginResponse.UserID)
	}

	if profile.Nickname != "Alice" {
		t.Fatalf("profile nickname = %q, want %q", profile.Nickname, "Alice")
	}

	if profile.Phone != "13800000001" {
		t.Fatalf("profile phone = %q, want %q", profile.Phone, "13800000001")
	}
}

func TestLoginRejectsInvalidSMSCode(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resetAuthStoreForTest()

	router := setupRouter()
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(
		http.MethodPost,
		"/auth/login",
		bytes.NewBufferString(`{"phone":"13800000002","code":"000000"}`),
	)
	request.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("POST /auth/login status = %d, want %d", recorder.Code, http.StatusUnauthorized)
	}
}

func TestLoginRejectsInvalidPassword(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resetAuthStoreForTest()

	router := setupRouter()
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(
		http.MethodPost,
		"/auth/login",
		bytes.NewBufferString(`{"phone":"13800000001","password":"wrong-password","login_type":"password"}`),
	)
	request.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("POST /auth/login status = %d, want %d", recorder.Code, http.StatusUnauthorized)
	}
}

func TestLoginRejectsUnsupportedLoginType(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resetAuthStoreForTest()

	router := setupRouter()
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(
		http.MethodPost,
		"/auth/login",
		bytes.NewBufferString(`{"phone":"13800000001","password":"im123456","login_type":"magic"}`),
	)
	request.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("POST /auth/login status = %d, want %d", recorder.Code, http.StatusBadRequest)
	}
}

func TestUserProfileRequiresValidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resetAuthStoreForTest()

	router := setupRouter()

	missingTokenRecorder := httptest.NewRecorder()
	missingTokenRequest := httptest.NewRequest(http.MethodGet, "/user/profile", nil)
	router.ServeHTTP(missingTokenRecorder, missingTokenRequest)

	if missingTokenRecorder.Code != http.StatusUnauthorized {
		t.Fatalf("missing token status = %d, want %d", missingTokenRecorder.Code, http.StatusUnauthorized)
	}

	invalidTokenRecorder := httptest.NewRecorder()
	invalidTokenRequest := httptest.NewRequest(http.MethodGet, "/user/profile", nil)
	invalidTokenRequest.Header.Set("Authorization", "Bearer not-a-valid-token")
	router.ServeHTTP(invalidTokenRecorder, invalidTokenRequest)

	if invalidTokenRecorder.Code != http.StatusUnauthorized {
		t.Fatalf("invalid token status = %d, want %d", invalidTokenRecorder.Code, http.StatusUnauthorized)
	}
}
