package main

import (
	"log"

	flashauth "learningai/server/modules/flash_auth"
)

func main() {
	config := loadServerConfig()
	if err := flashauth.ConfigureStore(toFlashAuthDatabaseConfig(config.Database)); err != nil {
		log.Fatalf("auth store setup failed: %v", err)
	}
	if config.Database.Enabled() {
		log.Printf("auth store: mysql (%s)", flashauth.MaskDatabaseConfig(toFlashAuthDatabaseConfig(config.Database)))
	} else {
		log.Printf("auth store: memory")
	}

	router := setupRouter()
	printAccessURLs(config.Host, config.Port)

	if err := router.Run(config.Addr()); err != nil {
		log.Fatalf("server stopped: %v", err)
	}
}

func toFlashAuthDatabaseConfig(config DatabaseConfig) flashauth.DatabaseConfig {
	return flashauth.DatabaseConfig{
		DSN:      config.DSN,
		Host:     config.Host,
		Port:     config.Port,
		User:     config.User,
		Password: config.Password,
		Name:     config.Name,
	}
}
