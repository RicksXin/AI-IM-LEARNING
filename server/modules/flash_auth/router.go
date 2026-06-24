package flashauth

import "github.com/gin-gonic/gin"

func RegisterRoutes(router *gin.Engine) {
	router.POST("/auth/sms", handleSendSMS)
	router.POST("/auth/login", handleLogin)
	router.GET("/auth/profile", handleUserProfile)
	router.POST("/auth/password/setup", handlePasswordSetup)
	router.PUT("/auth/password", handlePasswordChange)
	router.GET("/user/profile", handleUserProfile)
}
