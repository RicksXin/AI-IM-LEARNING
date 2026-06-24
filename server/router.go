package main

import (
	flashauth "learningai/server/modules/flash_auth"

	"github.com/gin-gonic/gin"
)

func setupRouter() *gin.Engine {
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery())

	router.GET("/v", handleVersion)
	router.GET("/conversation", handleConversations)
	router.GET("/ws", handleWebSocket)
	router.GET("/chat_room", handleChatRoomWebSocket)
	router.GET("/chat_room/status", chatRoomEndpointStatus)
	flashauth.RegisterRoutes(router)

	return router
}
