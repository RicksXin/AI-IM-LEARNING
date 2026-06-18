#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SERVER_DIR="${REPO_ROOT}/server"

MYSQL_CONTAINER="${MYSQL_CONTAINER:-flash-im-mysql}"

export PORT="${PORT:-8080}"
export DB_HOST="${DB_HOST:-127.0.0.1}"
export DB_PORT="${DB_PORT:-3307}"
export DB_USER="${DB_USER:-root}"
export DB_PASSWORD="${DB_PASSWORD:-flash_im_pwd}"
export DB_NAME="${DB_NAME:-flash_im}"
export RUN_DB_MIGRATIONS="${RUN_DB_MIGRATIONS:-true}"

if command -v docker >/dev/null 2>&1; then
  if docker inspect "${MYSQL_CONTAINER}" >/dev/null 2>&1; then
    MYSQL_RUNNING="$(docker inspect -f '{{.State.Running}}' "${MYSQL_CONTAINER}")"
    if [ "${MYSQL_RUNNING}" != "true" ]; then
      echo "Starting MySQL container: ${MYSQL_CONTAINER}"
      docker start "${MYSQL_CONTAINER}" >/dev/null
    fi

    echo "Waiting for MySQL container to accept connections..."
    for _ in $(seq 1 30); do
      if docker exec "${MYSQL_CONTAINER}" mysqladmin ping -u"${DB_USER}" -p"${DB_PASSWORD}" --silent >/dev/null 2>&1; then
        break
      fi
      sleep 1
    done
  else
    echo "Warning: MySQL container '${MYSQL_CONTAINER}' was not found."
    echo "The server will still try to connect to ${DB_HOST}:${DB_PORT}."
  fi
else
  echo "Warning: docker command was not found."
  echo "The server will still try to connect to ${DB_HOST}:${DB_PORT}."
fi

echo "Starting server with MySQL:"
echo "  server: ${SERVER_DIR}"
echo "  port:   ${PORT}"
echo "  mysql:  ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

if [ "${RUN_DB_MIGRATIONS}" = "true" ]; then
  "${SCRIPT_DIR}/database_migrate.sh"
else
  echo "Skipping database migrations because RUN_DB_MIGRATIONS=${RUN_DB_MIGRATIONS}."
fi

cd "${SERVER_DIR}"
exec go run .
