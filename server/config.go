package main

import (
	"net"
	"os"
	"time"

	"github.com/go-sql-driver/mysql"
)

type ServerConfig struct {
	Host     string
	Port     string
	Database DatabaseConfig
}

type DatabaseConfig struct {
	DSN      string
	Host     string
	Port     string
	User     string
	Password string
	Name     string
}

func loadServerConfig() ServerConfig {
	return ServerConfig{
		Host:     getEnv("HOST", "0.0.0.0"),
		Port:     getEnv("PORT", "8080"),
		Database: loadDatabaseConfig(),
	}
}

func (config ServerConfig) Addr() string {
	return net.JoinHostPort(config.Host, config.Port)
}

func loadDatabaseConfig() DatabaseConfig {
	return DatabaseConfig{
		DSN:      getEnvAny([]string{"DB_DSN", "MYSQL_DSN"}, ""),
		Host:     getEnvAny([]string{"DB_HOST", "MYSQL_HOST"}, "127.0.0.1"),
		Port:     getEnvAny([]string{"DB_PORT", "MYSQL_PORT"}, "3306"),
		User:     getEnvAny([]string{"DB_USER", "MYSQL_USER"}, "root"),
		Password: getEnvAny([]string{"DB_PASSWORD", "MYSQL_PASSWORD"}, ""),
		Name:     getEnvAny([]string{"DB_NAME", "MYSQL_DATABASE"}, ""),
	}
}

func (config DatabaseConfig) Enabled() bool {
	return config.DSN != "" || config.Name != ""
}

func (config DatabaseConfig) DSNText() string {
	if config.DSN != "" {
		return config.DSN
	}

	mysqlConfig := mysql.NewConfig()
	mysqlConfig.User = config.User
	mysqlConfig.Passwd = config.Password
	mysqlConfig.Net = "tcp"
	mysqlConfig.Addr = net.JoinHostPort(config.Host, config.Port)
	mysqlConfig.DBName = config.Name
	mysqlConfig.ParseTime = true
	mysqlConfig.Loc = time.Local
	mysqlConfig.Collation = "utf8mb4_unicode_ci"
	mysqlConfig.Params = map[string]string{
		"charset": "utf8mb4",
	}

	return mysqlConfig.FormatDSN()
}

func (config DatabaseConfig) AdminDSNText() string {
	mysqlConfig := mysql.NewConfig()
	mysqlConfig.User = config.User
	mysqlConfig.Passwd = config.Password
	mysqlConfig.Net = "tcp"
	mysqlConfig.Addr = net.JoinHostPort(config.Host, config.Port)
	mysqlConfig.ParseTime = true
	mysqlConfig.Loc = time.Local
	mysqlConfig.Collation = "utf8mb4_unicode_ci"
	mysqlConfig.Params = map[string]string{
		"charset": "utf8mb4",
	}

	return mysqlConfig.FormatDSN()
}

func getEnv(key string, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func getEnvAny(keys []string, fallback string) string {
	for _, key := range keys {
		value := os.Getenv(key)
		if value != "" {
			return value
		}
	}

	return fallback
}
