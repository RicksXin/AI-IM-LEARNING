#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/database_common.sh"

print_database_target
echo "Creating database and running migrations..."

create_database
run_goose up

echo "Database is ready."
