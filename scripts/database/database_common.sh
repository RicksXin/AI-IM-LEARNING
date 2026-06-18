#!/usr/bin/env bash
set -euo pipefail

DATABASE_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${DATABASE_SCRIPT_DIR}/../.." && pwd)"
SERVER_DIR="${REPO_ROOT}/server"
MIGRATIONS_DIR="${SERVER_DIR}/migrations"

MYSQL_CONTAINER="${MYSQL_CONTAINER:-flash-im-mysql}"

export DB_HOST="${DB_HOST:-127.0.0.1}"
export DB_PORT="${DB_PORT:-3307}"
export DB_USER="${DB_USER:-root}"
export DB_PASSWORD="${DB_PASSWORD:-flash_im_pwd}"
export DB_NAME="${DB_NAME:-flash_im}"

GOOSE_VERSION="${GOOSE_VERSION:-latest}"

database_name() {
  printf '%s' "${DB_NAME}"
}

validate_database_name() {
  local name
  name="$(database_name)"

  if [[ -z "${name}" ]]; then
    echo "DB_NAME is required." >&2
    exit 1
  fi

  if [[ ! "${name}" =~ ^[A-Za-z0-9_]+$ ]]; then
    echo "Unsafe DB_NAME '${name}'. Only letters, digits, and underscore are allowed." >&2
    exit 1
  fi

  case "${name}" in
    mysql|information_schema|performance_schema|sys)
      echo "Refusing to operate on protected database '${name}'." >&2
      exit 1
      ;;
  esac
}

database_dsn() {
  if [[ -n "${DB_DSN:-}" ]]; then
    printf '%s' "${DB_DSN}"
    return
  fi

  if [[ -n "${MYSQL_DSN:-}" ]]; then
    printf '%s' "${MYSQL_DSN}"
    return
  fi

  local auth
  if [[ -n "${DB_PASSWORD}" ]]; then
    auth="${DB_USER}:${DB_PASSWORD}"
  else
    auth="${DB_USER}"
  fi

  printf '%s@tcp(%s:%s)/%s?parseTime=true&charset=utf8mb4&multiStatements=true' \
    "${auth}" \
    "${DB_HOST}" \
    "${DB_PORT}" \
    "$(database_name)"
}

ensure_goose() {
  if command -v goose >/dev/null 2>&1; then
    return
  fi

  if ! command -v go >/dev/null 2>&1; then
    echo "goose is missing, and Go is not installed." >&2
    echo "Install Go first, then re-run this script." >&2
    exit 1
  fi

  echo "goose was not found. Installing github.com/pressly/goose/v3/cmd/goose@${GOOSE_VERSION} ..."
  go install "github.com/pressly/goose/v3/cmd/goose@${GOOSE_VERSION}"

  local go_bin
  go_bin="$(go env GOPATH)/bin"
  export PATH="${go_bin}:${PATH}"

  if ! command -v goose >/dev/null 2>&1; then
    echo "goose installation finished, but goose is still not on PATH." >&2
    echo "Add '${go_bin}' to PATH and re-run this script." >&2
    exit 1
  fi
}

ensure_mysql_container() {
  if ! command -v docker >/dev/null 2>&1; then
    return 1
  fi

  if ! docker inspect "${MYSQL_CONTAINER}" >/dev/null 2>&1; then
    return 1
  fi

  local running
  running="$(docker inspect -f '{{.State.Running}}' "${MYSQL_CONTAINER}")"
  if [[ "${running}" != "true" ]]; then
    echo "Starting MySQL container: ${MYSQL_CONTAINER}"
    docker start "${MYSQL_CONTAINER}" >/dev/null
  fi

  echo "Waiting for MySQL container to accept connections..."
  for _ in $(seq 1 30); do
    local args=(-u"${DB_USER}")
    if [[ -n "${DB_PASSWORD}" ]]; then
      args+=("-p${DB_PASSWORD}")
    fi

    if docker exec "${MYSQL_CONTAINER}" mysqladmin ping "${args[@]}" --silent >/dev/null 2>&1; then
      return 0
    fi

    sleep 1
  done

  echo "MySQL container did not become ready in time." >&2
  exit 1
}

run_mysql_admin_sql() {
  local sql="$1"

  validate_database_name

  if ensure_mysql_container; then
    local args=(-u"${DB_USER}")
    if [[ -n "${DB_PASSWORD}" ]]; then
      args+=("-p${DB_PASSWORD}")
    fi

    docker exec -i "${MYSQL_CONTAINER}" mysql "${args[@]}" -e "${sql}"
    return
  fi

  if command -v mysql >/dev/null 2>&1; then
    MYSQL_PWD="${DB_PASSWORD}" mysql \
      -h "${DB_HOST}" \
      -P "${DB_PORT}" \
      -u "${DB_USER}" \
      -e "${sql}"
    return
  fi

  echo "Neither Docker MySQL container '${MYSQL_CONTAINER}' nor local mysql client is available." >&2
  echo "Start the container or install a MySQL client, then re-run this script." >&2
  exit 1
}

create_database() {
  local name
  name="$(database_name)"

  run_mysql_admin_sql "CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
}

drop_database() {
  local name
  name="$(database_name)"

  run_mysql_admin_sql "DROP DATABASE IF EXISTS \`${name}\`;"
}

run_goose() {
  ensure_goose
  validate_database_name

  goose \
    -dir "${MIGRATIONS_DIR}" \
    mysql "$(database_dsn)" \
    "$@"
}

print_database_target() {
  echo "Database target:"
  echo "  host:       ${DB_HOST}"
  echo "  port:       ${DB_PORT}"
  echo "  user:       ${DB_USER}"
  echo "  database:   ${DB_NAME}"
  echo "  container:  ${MYSQL_CONTAINER}"
  echo "  migrations: ${MIGRATIONS_DIR}"
}
