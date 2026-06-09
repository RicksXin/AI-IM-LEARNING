package main

import "github.com/gin-gonic/gin"

func setupRouter() *gin.Engine {
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery())

	router.GET("/v", handleVersion)
	router.GET("/conversation", handleConversations)
	router.GET("/ws", handleWebSocket)
	router.GET("/chat_room", handleChatRoomWebSocket)
	router.GET("/chat_room/status", chatRoomEndpointStatus)
	router.POST("/auth/sms", handleSendSMS)
	router.POST("/auth/login", handleLogin)
	router.GET("/user/profile", handleUserProfile)

	return router
}
