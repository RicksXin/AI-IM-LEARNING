package main

import (
	"log"
)

func main() {
	config := loadServerConfig()

	router := setupRouter()
	printAccessURLs(config.Host, config.Port)

	if err := router.Run(config.Addr()); err != nil {
		log.Fatalf("server stopped: %v", err)
	}
}
