-- +goose Up
CREATE TABLE IF NOT EXISTS user_profiles (
  account_id VARCHAR(32) NOT NULL PRIMARY KEY,
  nickname VARCHAR(128) NOT NULL,
  avatar_url VARCHAR(255) NOT NULL,
  signature VARCHAR(255) NOT NULL DEFAULT '',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_profile_account
    FOREIGN KEY (account_id) REFERENCES accounts(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- +goose Down
DROP TABLE IF EXISTS user_profiles;
