package main

import (
	"strings"
	"testing"
)

func TestDatabaseConfigIsDisabledByDefault(t *testing.T) {
	t.Setenv("DB_DSN", "")
	t.Setenv("MYSQL_DSN", "")
	t.Setenv("DB_NAME", "")
	t.Setenv("MYSQL_DATABASE", "")

	config := loadDatabaseConfig()

	if config.Enabled() {
		t.Fatal("database config should be disabled without DSN or database name")
	}
}

func TestDatabaseConfigBuildsMySQLDSN(t *testing.T) {
	config := DatabaseConfig{
		Host:     "127.0.0.1",
		Port:     "3306",
		User:     "root",
		Password: "secret",
		Name:     "flash_im",
	}

	dsn := config.DSNText()

	if !strings.Contains(dsn, "root:secret@tcp(127.0.0.1:3306)/flash_im") {
		t.Fatalf("dsn = %q, want configured mysql address", dsn)
	}
	if !strings.Contains(dsn, "parseTime=true") {
		t.Fatalf("dsn = %q, want parseTime=true", dsn)
	}
}
