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

func TestQuoteMySQLIdentifierRejectsUnsafeNames(t *testing.T) {
	if _, err := quoteMySQLIdentifier("flash-im"); err == nil {
		t.Fatal("quoteMySQLIdentifier should reject unsafe database names")
	}

	value, err := quoteMySQLIdentifier("flash_im")
	if err != nil {
		t.Fatalf("quoteMySQLIdentifier returned error: %v", err)
	}
	if value != "`flash_im`" {
		t.Fatalf("quoted identifier = %q, want `flash_im`", value)
	}
}
