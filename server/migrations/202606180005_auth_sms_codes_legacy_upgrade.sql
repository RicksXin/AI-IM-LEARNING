-- +goose Up
-- +goose StatementBegin
SET @has_id := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sms_codes'
    AND COLUMN_NAME = 'id'
);

SET @sql := IF(
  @has_id = 0,
  'ALTER TABLE sms_codes DROP PRIMARY KEY, ADD COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_expires_at := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sms_codes'
    AND COLUMN_NAME = 'expires_at'
);

SET @sql := IF(
  @has_expires_at = 0,
  'ALTER TABLE sms_codes ADD COLUMN expires_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER code',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_consumed_at := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sms_codes'
    AND COLUMN_NAME = 'consumed_at'
);

SET @sql := IF(
  @has_consumed_at = 0,
  'ALTER TABLE sms_codes ADD COLUMN consumed_at TIMESTAMP NULL AFTER expires_at',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_sms_index := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sms_codes'
    AND INDEX_NAME = 'idx_sms_codes_phone_expires_at'
);

SET @sql := IF(
  @has_sms_index = 0,
  'ALTER TABLE sms_codes ADD KEY idx_sms_codes_phone_expires_at (phone, expires_at)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
SET @has_sms_index := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sms_codes'
    AND INDEX_NAME = 'idx_sms_codes_phone_expires_at'
);

SET @sql := IF(
  @has_sms_index > 0,
  'ALTER TABLE sms_codes DROP INDEX idx_sms_codes_phone_expires_at',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
-- +goose StatementEnd
