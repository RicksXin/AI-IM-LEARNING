package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

const websocketWelcomeMessage = "welcome to websocket playground"

var websocketUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func handleWebSocket(c *gin.Context) {
	conn, err := websocketUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("websocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	remoteAddr := c.Request.RemoteAddr
	log.Printf("websocket connected: %s", remoteAddr)
	defer log.Printf("websocket disconnected: %s", remoteAddr)

	if err := conn.WriteMessage(websocket.TextMessage, []byte(websocketWelcomeMessage)); err != nil {
		log.Printf("websocket welcome failed: %v", err)
		return
	}

	for {
		messageType, message, err := conn.ReadMessage()
		if err != nil {
			log.Printf("websocket read stopped: %v", err)
			return
		}

		if messageType != websocket.TextMessage {
			continue
		}

		reply := fmt.Sprintf("echo: %s", string(message))
		if err := conn.WriteMessage(websocket.TextMessage, []byte(reply)); err != nil {
			log.Printf("websocket echo failed: %v", err)
			return
		}
	}
}
