package main

import (
	"crypto/rand"
	"database/sql"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"
	"unicode"

	"github.com/go-sql-driver/mysql"
	"golang.org/x/crypto/bcrypt"
)

type mysqlAuthStore struct {
	db *sql.DB
}

func configureAuthStore(config DatabaseConfig) error {
	if !config.Enabled() {
		authStore = newAuthMemoryStore()
		return nil
	}

	store, err := newMySQLAuthStore(config)
	if err != nil {
		return err
	}

	authStore = store
	return nil
}

func newMySQLAuthStore(config DatabaseConfig) (*mysqlAuthStore, error) {
	if config.DSN == "" {
		if err := ensureMySQLDatabase(config); err != nil {
			return nil, err
		}
	}

	db, err := sql.Open("mysql", config.DSNText())
	if err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(30 * time.Minute)

	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, err
	}

	store := &mysqlAuthStore{db: db}
	if err := store.migrate(); err != nil {
		_ = db.Close()
		return nil, err
	}

	if err := store.seedDefaultPasswordUsers(); err != nil {
		_ = db.Close()
		return nil, err
	}

	return store, nil
}

func ensureMySQLDatabase(config DatabaseConfig) error {
	name, err := quoteMySQLIdentifier(config.Name)
	if err != nil {
		return err
	}

	db, err := sql.Open("mysql", config.AdminDSNText())
	if err != nil {
		return err
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		return err
	}

	_, err = db.Exec(fmt.Sprintf(
		"CREATE DATABASE IF NOT EXISTS %s CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
		name,
	))
	return err
}

func quoteMySQLIdentifier(value string) (string, error) {
	if value == "" {
		return "", errors.New("database name is required")
	}

	for _, r := range value {
		if r != '_' && !unicode.IsLetter(r) && !unicode.IsDigit(r) {
			return "", fmt.Errorf("unsupported database name: %s", value)
		}
	}

	return "`" + value + "`", nil
}

func (store *mysqlAuthStore) migrate() error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id VARCHAR(32) NOT NULL PRIMARY KEY,
			phone VARCHAR(32) NOT NULL UNIQUE,
			nickname VARCHAR(128) NOT NULL,
			avatar VARCHAR(255) NOT NULL,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
		`CREATE TABLE IF NOT EXISTS auth_identities (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
			user_id VARCHAR(32) NOT NULL,
			login_type VARCHAR(32) NOT NULL,
			identifier VARCHAR(128) NOT NULL,
			password_hash VARCHAR(255) NULL,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			UNIQUE KEY uniq_auth_identity (login_type, identifier),
			KEY idx_auth_identity_user_id (user_id),
			CONSTRAINT fk_auth_identity_user
				FOREIGN KEY (user_id) REFERENCES users(id)
				ON DELETE CASCADE
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
		`CREATE TABLE IF NOT EXISTS sms_codes (
			phone VARCHAR(32) NOT NULL PRIMARY KEY,
			code VARCHAR(12) NOT NULL,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
	}

	for _, statement := range statements {
		if _, err := store.db.Exec(statement); err != nil {
			return err
		}
	}

	return nil
}

func (store *mysqlAuthStore) seedDefaultPasswordUsers() error {
	for index, seed := range defaultPasswordUsers {
		userID := fmt.Sprintf("u_%06d", index+1)
		if err := store.seedPasswordUser(userID, seed); err != nil {
			return err
		}
	}

	return nil
}

func (store *mysqlAuthStore) seedPasswordUser(userID string, seed authPasswordSeed) error {
	user, ok, err := store.findUserByPhone(seed.Phone)
	if err != nil {
		return err
	}

	if !ok {
		user = authUser{
			UserID:   userID,
			Nickname: seed.Nickname,
			Avatar:   fmt.Sprintf("https://example.com/avatars/%s.png", userID),
			Phone:    seed.Phone,
		}
		if err := store.insertUser(user); err != nil {
			if isMySQLDuplicateError(err) {
				user, ok, err = store.findUserByPhone(seed.Phone)
				if err != nil {
					return err
				}
				if !ok {
					return errors.New("seed password user duplicate but user not found")
				}
			} else {
				return err
			}
		}
	}

	passwordHash, err := hashPassword(seed.Password)
	if err != nil {
		return err
	}

	_, err = store.db.Exec(
		`INSERT INTO auth_identities (user_id, login_type, identifier, password_hash)
		 VALUES (?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), password_hash = VALUES(password_hash)`,
		user.UserID,
		string(LoginTypePassword),
		seed.Phone,
		passwordHash,
	)

	return err
}

func (store *mysqlAuthStore) saveSMSCode(phone string, code string) error {
	_, err := store.db.Exec(
		`INSERT INTO sms_codes (phone, code)
		 VALUES (?, ?)
		 ON DUPLICATE KEY UPDATE code = VALUES(code), updated_at = CURRENT_TIMESTAMP`,
		phone,
		code,
	)
	return err
}

func (store *mysqlAuthStore) verifySMSCode(phone string, code string) (bool, error) {
	var savedCode string
	err := store.db.QueryRow(
		`SELECT code FROM sms_codes WHERE phone = ?`,
		phone,
	).Scan(&savedCode)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	return savedCode == code, nil
}

func (store *mysqlAuthStore) findOrCreateUserByPhone(phone string) (authUser, error) {
	user, ok, err := store.findUserByPhone(phone)
	if err != nil {
		return authUser{}, err
	}
	if ok {
		return user, nil
	}

	for attempt := 0; attempt < 3; attempt++ {
		userID, err := generatePersistentAuthUserID()
		if err != nil {
			return authUser{}, err
		}

		user := authUser{
			UserID:   userID,
			Nickname: phone,
			Avatar:   fmt.Sprintf("https://example.com/avatars/%s.png", userID),
			Phone:    phone,
		}
		if err := store.insertUser(user); err != nil {
			if isMySQLDuplicateError(err) {
				existingUser, ok, findErr := store.findUserByPhone(phone)
				if findErr != nil {
					return authUser{}, findErr
				}
				if ok {
					return existingUser, nil
				}
				continue
			}

			return authUser{}, err
		}

		_, err = store.db.Exec(
			`INSERT INTO auth_identities (user_id, login_type, identifier)
			 VALUES (?, ?, ?)
		 ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)`,
			user.UserID,
			string(LoginTypeSMS),
			phone,
		)
		if err != nil {
			return authUser{}, err
		}

		return user, nil
	}

	return authUser{}, errors.New("failed to create unique user id")
}

func (store *mysqlAuthStore) authenticatePassword(phone string, password string) (authUser, bool, error) {
	var user authUser
	var passwordHash string
	err := store.db.QueryRow(
		`SELECT u.id, u.nickname, u.avatar, u.phone, ai.password_hash
		 FROM users u
		 JOIN auth_identities ai ON ai.user_id = u.id
		 WHERE ai.login_type = ? AND ai.identifier = ?
		 LIMIT 1`,
		string(LoginTypePassword),
		phone,
	).Scan(&user.UserID, &user.Nickname, &user.Avatar, &user.Phone, &passwordHash)
	if errors.Is(err, sql.ErrNoRows) {
		return authUser{}, false, nil
	}
	if err != nil {
		return authUser{}, false, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(password)); err != nil {
		return authUser{}, false, nil
	}

	return user, true, nil
}

func (store *mysqlAuthStore) findUserByID(userID string) (authUser, bool, error) {
	return store.findUser(
		`SELECT id, nickname, avatar, phone FROM users WHERE id = ? LIMIT 1`,
		userID,
	)
}

func (store *mysqlAuthStore) findUserByPhone(phone string) (authUser, bool, error) {
	return store.findUser(
		`SELECT id, nickname, avatar, phone FROM users WHERE phone = ? LIMIT 1`,
		phone,
	)
}

func (store *mysqlAuthStore) findUser(query string, args ...interface{}) (authUser, bool, error) {
	var user authUser
	err := store.db.QueryRow(query, args...).Scan(
		&user.UserID,
		&user.Nickname,
		&user.Avatar,
		&user.Phone,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return authUser{}, false, nil
	}
	if err != nil {
		return authUser{}, false, err
	}

	return user, true, nil
}

func (store *mysqlAuthStore) insertUser(user authUser) error {
	_, err := store.db.Exec(
		`INSERT INTO users (id, phone, nickname, avatar)
		 VALUES (?, ?, ?, ?)`,
		user.UserID,
		user.Phone,
		user.Nickname,
		user.Avatar,
	)
	return err
}

func hashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}

	return string(hash), nil
}

func generatePersistentAuthUserID() (string, error) {
	value, err := rand.Int(rand.Reader, big.NewInt(1000000000000))
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("u_%012d", value.Int64()), nil
}

func isMySQLDuplicateError(err error) bool {
	var mysqlErr *mysql.MySQLError
	return errors.As(err, &mysqlErr) && mysqlErr.Number == 1062
}

func maskDatabaseConfig(config DatabaseConfig) string {
	if config.DSN != "" {
		return "dsn"
	}

	return strings.Join([]string{
		config.User,
		"@",
		config.Host,
		":",
		config.Port,
		"/",
		config.Name,
	}, "")
}
