#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/database_common.sh"

print_database_target
echo "Dropping database '${DB_NAME}'..."

drop_database

echo "Database dropped."
