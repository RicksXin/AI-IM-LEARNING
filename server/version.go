package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

const (
	appName    = "LearningAI IM Backend"
	appVersion = "0.1.0"
)

type VersionResponse struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}

func handleVersion(c *gin.Context) {
	c.JSON(http.StatusOK, VersionResponse{
		Name:    appName,
		Version: appVersion,
	})
}
