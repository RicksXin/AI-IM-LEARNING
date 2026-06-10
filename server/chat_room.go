package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

const (
	chatRoomAuthRequiredType = "auth_required"
	chatRoomAuthType         = "auth"
	chatRoomAuthSuccessType  = "auth_success"
	chatRoomAuthFailedType   = "auth_failed"
	chatRoomChatType         = "chat"
	chatRoomErrorType        = "error"
	chatRoomPingType         = "ping"
	chatRoomPongType         = "pong"
)

type chatRoomClientMessage struct {
	Type    string `json:"type"`
	Token   string `json:"token,omitempty"`
	Content string `json:"content,omitempty"`
}

type chatRoomServerMessage struct {
	Type     string `json:"type"`
	Message  string `json:"message,omitempty"`
	UserID   string `json:"user_id,omitempty"`
	Nickname string `json:"nickname,omitempty"`
	Content  string `json:"content,omitempty"`
	Time     string `json:"time,omitempty"`
}

type chatRoomHub struct {
	mu      sync.RWMutex
	clients map[*chatRoomClient]struct{}
}

type chatRoomClient struct {
	conn *websocket.Conn
	mu   sync.Mutex
	user authUser
}

func newChatRoomHub() *chatRoomHub {
	return &chatRoomHub{
		clients: map[*chatRoomClient]struct{}{},
	}
}

var defaultChatRoomHub = newChatRoomHub()

func handleChatRoomWebSocket(c *gin.Context) {
	conn, err := websocketUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("chat_room websocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	remoteAddr := c.Request.RemoteAddr
	log.Printf("chat_room connected: %s", remoteAddr)
	defer log.Printf("chat_room disconnected: %s", remoteAddr)

	if err := writeChatRoomJSON(conn, chatRoomServerMessage{
		Type:    chatRoomAuthRequiredType,
		Message: "send auth message with jwt token",
	}); err != nil {
		log.Printf("chat_room auth_required failed: %v", err)
		return
	}

	user, ok := authenticateChatRoomConnection(conn)
	if !ok {
		return
	}

	log.Printf("chat_room authenticated: user_id=%s remote=%s", user.UserID, remoteAddr)
	client := &chatRoomClient{
		conn: conn,
		user: user,
	}
	defaultChatRoomHub.register(client)
	defer defaultChatRoomHub.unregister(client)

	if err := client.writeJSON(chatRoomServerMessage{
		Type:    chatRoomAuthSuccessType,
		Message: "chat room authenticated",
		UserID:  user.UserID,
	}); err != nil {
		log.Printf("chat_room auth_success failed: %v", err)
		return
	}

	for {
		messageType, message, err := conn.ReadMessage()
		if err != nil {
			log.Printf("chat_room read stopped: %v", err)
			return
		}

		if messageType != websocket.TextMessage {
			continue
		}

		var clientMessage chatRoomClientMessage
		if err := json.Unmarshal(message, &clientMessage); err != nil {
			if writeErr := writeChatRoomError(conn, "invalid json message"); writeErr != nil {
				log.Printf("chat_room write invalid json error failed: %v", writeErr)
				return
			}
			continue
		}

		switch clientMessage.Type {
		case chatRoomPingType:
			if err := client.writeJSON(chatRoomServerMessage{
				Type:    chatRoomPongType,
				Message: "pong",
				Time:    nowChatRoomTime(),
			}); err != nil {
				log.Printf("chat_room pong failed: %v", err)
				return
			}
		case chatRoomChatType:
			content := strings.TrimSpace(clientMessage.Content)
			if content == "" {
				if err := client.writeError("chat content is required"); err != nil {
					log.Printf("chat_room write empty content error failed: %v", err)
					return
				}
				continue
			}

			message := chatRoomServerMessage{
				Type:     chatRoomChatType,
				UserID:   user.UserID,
				Nickname: user.Nickname,
				Content:  content,
				Time:     nowChatRoomTime(),
			}
			defaultChatRoomHub.broadcast(message)
		default:
			if err := client.writeError("unsupported message type"); err != nil {
				log.Printf("chat_room write unsupported type error failed: %v", err)
				return
			}
		}
	}
}

func (hub *chatRoomHub) register(client *chatRoomClient) {
	hub.mu.Lock()
	defer hub.mu.Unlock()

	hub.clients[client] = struct{}{}
}

func (hub *chatRoomHub) unregister(client *chatRoomClient) {
	hub.mu.Lock()
	defer hub.mu.Unlock()

	delete(hub.clients, client)
}

func (hub *chatRoomHub) broadcast(message chatRoomServerMessage) {
	hub.mu.RLock()
	clients := make([]*chatRoomClient, 0, len(hub.clients))
	for client := range hub.clients {
		clients = append(clients, client)
	}
	hub.mu.RUnlock()

	for _, client := range clients {
		if err := client.writeJSON(message); err != nil {
			log.Printf("chat_room broadcast failed: user_id=%s error=%v", client.user.UserID, err)
			hub.unregister(client)
			_ = client.conn.Close()
		}
	}
}

func (client *chatRoomClient) writeJSON(message chatRoomServerMessage) error {
	client.mu.Lock()
	defer client.mu.Unlock()

	return client.conn.WriteJSON(message)
}

func (client *chatRoomClient) writeError(message string) error {
	return client.writeJSON(chatRoomServerMessage{
		Type:    chatRoomErrorType,
		Message: message,
	})
}

func authenticateChatRoomConnection(conn *websocket.Conn) (authUser, bool) {
	messageType, message, err := conn.ReadMessage()
	if err != nil {
		log.Printf("chat_room read auth failed: %v", err)
		return authUser{}, false
	}

	if messageType != websocket.TextMessage {
		_ = writeChatRoomAuthFailed(conn, "auth message must be text")
		return authUser{}, false
	}

	var clientMessage chatRoomClientMessage
	if err := json.Unmarshal(message, &clientMessage); err != nil {
		_ = writeChatRoomAuthFailed(conn, "invalid auth json")
		return authUser{}, false
	}

	if clientMessage.Type != chatRoomAuthType {
		_ = writeChatRoomAuthFailed(conn, "first message must be auth")
		return authUser{}, false
	}

	tokenText := strings.TrimSpace(clientMessage.Token)
	if tokenText == "" {
		_ = writeChatRoomAuthFailed(conn, "token is required")
		return authUser{}, false
	}

	userID, err := parseUserIDFromJWT(tokenText)
	if err != nil {
		_ = writeChatRoomAuthFailed(conn, "invalid token")
		return authUser{}, false
	}

	user, ok, err := authStore.findUserByID(userID)
	if err != nil {
		log.Printf("chat_room find user failed: %v", err)
		_ = writeChatRoomAuthFailed(conn, "invalid token")
		return authUser{}, false
	}
	if !ok {
		_ = writeChatRoomAuthFailed(conn, "invalid token")
		return authUser{}, false
	}

	return user, true
}

func writeChatRoomAuthFailed(conn *websocket.Conn, message string) error {
	if err := writeChatRoomJSON(conn, chatRoomServerMessage{
		Type:    chatRoomAuthFailedType,
		Message: message,
	}); err != nil {
		return err
	}

	return conn.WriteControl(
		websocket.CloseMessage,
		websocket.FormatCloseMessage(websocket.ClosePolicyViolation, message),
		time.Now().Add(time.Second),
	)
}

func writeChatRoomError(conn *websocket.Conn, message string) error {
	return writeChatRoomJSON(conn, chatRoomServerMessage{
		Type:    chatRoomErrorType,
		Message: message,
	})
}

func writeChatRoomJSON(conn *websocket.Conn, message chatRoomServerMessage) error {
	return conn.WriteJSON(message)
}

func nowChatRoomTime() string {
	return time.Now().Format("15:04:05")
}

func chatRoomEndpointStatus(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"endpoint": "/chat_room",
		"protocol": "websocket",
		"auth":     "first message must be auth with jwt token",
	})
}
