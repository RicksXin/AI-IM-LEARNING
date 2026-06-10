package main

import (
	"log"
)

func main() {
	config := loadServerConfig()
	if err := configureAuthStore(config.Database); err != nil {
		log.Fatalf("auth store setup failed: %v", err)
	}
	if config.Database.Enabled() {
		log.Printf("auth store: mysql (%s)", maskDatabaseConfig(config.Database))
	} else {
		log.Printf("auth store: memory")
	}

	router := setupRouter()
	printAccessURLs(config.Host, config.Port)

	if err := router.Run(config.Addr()); err != nil {
		log.Fatalf("server stopped: %v", err)
	}
}
