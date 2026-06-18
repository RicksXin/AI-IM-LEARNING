-- +goose Up
CREATE TABLE IF NOT EXISTS auth_credentials (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- +goose Down
DROP TABLE IF EXISTS auth_credentials;
