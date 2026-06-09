package main

import (
	"net"
	"os"
)

type ServerConfig struct {
	Host string
	Port string
}

func loadServerConfig() ServerConfig {
	return ServerConfig{
		Host: getEnv("HOST", "0.0.0.0"),
		Port: getEnv("PORT", "8080"),
	}
}

func (config ServerConfig) Addr() string {
	return net.JoinHostPort(config.Host, config.Port)
}

func getEnv(key string, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
