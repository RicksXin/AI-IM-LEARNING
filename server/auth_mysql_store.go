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
		`CREATE TABLE IF NOT EXISTS accounts (
			id VARCHAR(32) NOT NULL PRIMARY KEY,
			account_no VARCHAR(64) NOT NULL UNIQUE,
			status VARCHAR(32) NOT NULL DEFAULT 'active',
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
		`CREATE TABLE IF NOT EXISTS user_profiles (
			account_id VARCHAR(32) NOT NULL PRIMARY KEY,
			nickname VARCHAR(128) NOT NULL,
			avatar_url VARCHAR(255) NOT NULL,
			signature VARCHAR(255) NOT NULL DEFAULT '',
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			CONSTRAINT fk_user_profile_account
				FOREIGN KEY (account_id) REFERENCES accounts(id)
				ON DELETE CASCADE
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
		`CREATE TABLE IF NOT EXISTS auth_credentials (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
			account_id VARCHAR(32) NOT NULL,
			credential_type VARCHAR(32) NOT NULL,
			identifier VARCHAR(128) NOT NULL,
			secret_hash VARCHAR(255) NULL,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			UNIQUE KEY uniq_auth_credential (credential_type, identifier),
			KEY idx_auth_credential_account_id (account_id),
			CONSTRAINT fk_auth_credential_account
				FOREIGN KEY (account_id) REFERENCES accounts(id)
				ON DELETE CASCADE
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
		`CREATE TABLE IF NOT EXISTS sms_codes (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
			phone VARCHAR(32) NOT NULL,
			code VARCHAR(12) NOT NULL,
			expires_at TIMESTAMP NOT NULL,
			consumed_at TIMESTAMP NULL,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			KEY idx_sms_codes_phone_expires_at (phone, expires_at)
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
		`INSERT INTO auth_credentials (account_id, credential_type, identifier, secret_hash)
		 VALUES (?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE account_id = VALUES(account_id), secret_hash = VALUES(secret_hash)`,
		user.UserID,
		authCredentialTypePhone,
		seed.Phone,
		passwordHash,
	)

	return err
}

func (store *mysqlAuthStore) saveSMSCode(phone string, code string) error {
	_, err := store.db.Exec(
		`INSERT INTO sms_codes (phone, code, expires_at, consumed_at)
		 VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 5 MINUTE), NULL)`,
		phone,
		code,
	)
	return err
}

func (store *mysqlAuthStore) verifySMSCode(phone string, code string) (bool, error) {
	var id int64
	err := store.db.QueryRow(
		`SELECT id
		 FROM sms_codes
		 WHERE phone = ? AND code = ? AND consumed_at IS NULL AND expires_at >= CURRENT_TIMESTAMP
		 ORDER BY id DESC
		 LIMIT 1`,
		phone,
		code,
	).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	_, err = store.db.Exec(
		`UPDATE sms_codes SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?`,
		id,
	)
	if err != nil {
		return false, err
	}

	return true, nil
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

		return user, nil
	}

	return authUser{}, errors.New("failed to create unique user id")
}

func (store *mysqlAuthStore) authenticatePassword(phone string, password string) (authUser, bool, error) {
	var user authUser
	var passwordHash sql.NullString
	err := store.db.QueryRow(
		`SELECT a.id, p.nickname, p.avatar_url, c.identifier, c.secret_hash
		 FROM auth_credentials c
		 JOIN accounts a ON a.id = c.account_id
		 JOIN user_profiles p ON p.account_id = a.id
		 WHERE c.credential_type = ? AND c.identifier = ?
		 LIMIT 1`,
		authCredentialTypePhone,
		phone,
	).Scan(&user.UserID, &user.Nickname, &user.Avatar, &user.Phone, &passwordHash)
	if errors.Is(err, sql.ErrNoRows) {
		return authUser{}, false, nil
	}
	if err != nil {
		return authUser{}, false, err
	}

	if !passwordHash.Valid || passwordHash.String == "" {
		return authUser{}, false, nil
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash.String), []byte(password)); err != nil {
		return authUser{}, false, nil
	}

	return user, true, nil
}

func (store *mysqlAuthStore) findUserByID(userID string) (authUser, bool, error) {
	return store.findUser(
		`SELECT a.id, p.nickname, p.avatar_url, COALESCE(c.identifier, '')
		 FROM accounts a
		 JOIN user_profiles p ON p.account_id = a.id
		 LEFT JOIN auth_credentials c ON c.account_id = a.id AND c.credential_type = 'phone'
		 WHERE a.id = ?
		 LIMIT 1`,
		userID,
	)
}

func (store *mysqlAuthStore) findUserByPhone(phone string) (authUser, bool, error) {
	return store.findUser(
		`SELECT a.id, p.nickname, p.avatar_url, c.identifier
		 FROM auth_credentials c
		 JOIN accounts a ON a.id = c.account_id
		 JOIN user_profiles p ON p.account_id = a.id
		 WHERE c.credential_type = 'phone' AND c.identifier = ?
		 LIMIT 1`,
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
	tx, err := store.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(
		`INSERT INTO accounts (id, account_no, status)
		 VALUES (?, ?, 'active')`,
		user.UserID,
		user.UserID,
	); err != nil {
		return err
	}

	if _, err := tx.Exec(
		`INSERT INTO user_profiles (account_id, nickname, avatar_url)
		 VALUES (?, ?, ?)`,
		user.UserID,
		user.Nickname,
		user.Avatar,
	); err != nil {
		return err
	}

	if _, err := tx.Exec(
		`INSERT INTO auth_credentials (account_id, credential_type, identifier)
		 VALUES (?, ?, ?)`,
		user.UserID,
		authCredentialTypePhone,
		user.Phone,
	); err != nil {
		return err
	}

	return tx.Commit()
}

func (store *mysqlAuthStore) hasPassword(userID string) (bool, error) {
	var passwordHash sql.NullString
	err := store.db.QueryRow(
		`SELECT secret_hash
		 FROM auth_credentials
		 WHERE account_id = ? AND credential_type = ?
		 LIMIT 1`,
		userID,
		authCredentialTypePhone,
	).Scan(&passwordHash)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	return passwordHash.Valid && passwordHash.String != "", nil
}

func (store *mysqlAuthStore) setInitialPassword(userID string, password string) error {
	hasPassword, err := store.hasPassword(userID)
	if err != nil {
		return err
	}
	if hasPassword {
		return errPasswordAlreadySet
	}

	passwordHash, err := hashPassword(password)
	if err != nil {
		return err
	}

	result, err := store.db.Exec(
		`UPDATE auth_credentials
		 SET secret_hash = ?
		 WHERE account_id = ? AND credential_type = ? AND (secret_hash IS NULL OR secret_hash = '')`,
		passwordHash,
		userID,
		authCredentialTypePhone,
	)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return errPasswordAlreadySet
	}

	return nil
}

func (store *mysqlAuthStore) changePassword(userID string, oldPassword string, newPassword string) error {
	var passwordHash sql.NullString
	err := store.db.QueryRow(
		`SELECT secret_hash
		 FROM auth_credentials
		 WHERE account_id = ? AND credential_type = ?
		 LIMIT 1`,
		userID,
		authCredentialTypePhone,
	).Scan(&passwordHash)
	if errors.Is(err, sql.ErrNoRows) {
		return errPasswordMismatch
	}
	if err != nil {
		return err
	}
	if !passwordHash.Valid || passwordHash.String == "" {
		return errPasswordMismatch
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash.String), []byte(oldPassword)); err != nil {
		return errPasswordMismatch
	}

	nextHash, err := hashPassword(newPassword)
	if err != nil {
		return err
	}

	_, err = store.db.Exec(
		`UPDATE auth_credentials
		 SET secret_hash = ?
		 WHERE account_id = ? AND credential_type = ?`,
		nextHash,
		userID,
		authCredentialTypePhone,
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
