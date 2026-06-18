#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SERVER_DIR="${REPO_ROOT}/server"
DATABASE_SCRIPT_DIR="${REPO_ROOT}/scripts/database"

MYSQL_CONTAINER="${MYSQL_CONTAINER:-flash-im-mysql}"

export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-8080}"
export DB_HOST="${DB_HOST:-127.0.0.1}"
export DB_PORT="${DB_PORT:-3307}"
export DB_USER="${DB_USER:-root}"
export DB_PASSWORD="${DB_PASSWORD:-flash_im_pwd}"
export DB_NAME="${DB_NAME:-flash_im}"
export RUN_DB_MIGRATIONS="${RUN_DB_MIGRATIONS:-true}"

SERVER_BIN="${SERVER_BIN:-${SERVER_DIR}/bin/flash-im-server}"

log() {
  printf '[server:start] %s\n' "$1"
}

ensure_mysql_started() {
  if ! command -v docker >/dev/null 2>&1; then
    log "docker command was not found. The server will still try ${DB_HOST}:${DB_PORT}."
    return
  fi

  if ! docker inspect "${MYSQL_CONTAINER}" >/dev/null 2>&1; then
    log "MySQL container '${MYSQL_CONTAINER}' was not found. The server will still try ${DB_HOST}:${DB_PORT}."
    return
  fi

  local running
  running="$(docker inspect -f '{{.State.Running}}' "${MYSQL_CONTAINER}")"
  if [[ "${running}" != "true" ]]; then
    log "Starting MySQL container: ${MYSQL_CONTAINER}"
    docker start "${MYSQL_CONTAINER}" >/dev/null
  else
    log "MySQL container is already running: ${MYSQL_CONTAINER}"
  fi

  log "Waiting for MySQL to accept connections..."
  for _ in $(seq 1 30); do
    if [[ -n "${DB_PASSWORD}" ]]; then
      if docker exec "${MYSQL_CONTAINER}" mysqladmin ping -u"${DB_USER}" -p"${DB_PASSWORD}" --silent >/dev/null 2>&1; then
        log "MySQL is ready."
        return
      fi
    elif docker exec "${MYSQL_CONTAINER}" mysqladmin ping -u"${DB_USER}" --silent >/dev/null 2>&1; then
      log "MySQL is ready."
      return
    fi

    sleep 1
  done

  log "MySQL container did not become ready in time."
  exit 1
}

list_backend_pids() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -tiTCP:"${PORT}" -sTCP:LISTEN 2>/dev/null || true
    return
  fi

  if command -v fuser >/dev/null 2>&1; then
    fuser "${PORT}/tcp" 2>/dev/null || true
    return
  fi

  log "Neither lsof nor fuser is available; skipping backend port process detection."
}

stop_existing_backend() {
  local pids
  pids="$(list_backend_pids | tr '\n' ' ' | xargs || true)"

  if [[ -z "${pids}" ]]; then
    log "No backend process is listening on port ${PORT}."
    return
  fi

  log "Stopping process listening on port ${PORT}: ${pids}"
  kill ${pids} 2>/dev/null || true

  for _ in $(seq 1 20); do
    if [[ -z "$(list_backend_pids | tr '\n' ' ' | xargs || true)" ]]; then
      log "Old backend process stopped."
      return
    fi
    sleep 0.5
  done

  local remaining
  remaining="$(list_backend_pids | tr '\n' ' ' | xargs || true)"
  if [[ -n "${remaining}" ]]; then
    log "Force stopping process on port ${PORT}: ${remaining}"
    kill -9 ${remaining} 2>/dev/null || true
  fi
}

run_database_migrations() {
  if [[ "${RUN_DB_MIGRATIONS}" != "true" ]]; then
    log "Skipping database migrations because RUN_DB_MIGRATIONS=${RUN_DB_MIGRATIONS}."
    return
  fi

  log "Running database migrations..."
  "${DATABASE_SCRIPT_DIR}/database_migrate.sh"
}

build_server() {
  log "Rebuilding backend..."
  mkdir -p "$(dirname "${SERVER_BIN}")"
  (
    cd "${SERVER_DIR}"
    go build -o "${SERVER_BIN}" .
  )
  log "Backend binary built: ${SERVER_BIN}"
}

start_server() {
  log "Starting backend:"
  log "  host: ${HOST}"
  log "  port: ${PORT}"
  log "  mysql: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
  exec "${SERVER_BIN}"
}

ensure_mysql_started
stop_existing_backend
run_database_migrations
build_server
start_server
