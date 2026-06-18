# Database Scripts

These scripts use `goose` to maintain MySQL schema migrations for the Go IM playground server.

## Defaults

```bash
MYSQL_CONTAINER=flash-im-mysql
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=root
DB_PASSWORD=flash_im_pwd
DB_NAME=flash_im
```

You can override any value before running a script:

```bash
DB_NAME=flash_im_test ./scripts/database/database_create.sh
```

## Commands

Create the database and run all migrations:

```bash
./scripts/database/database_create.sh
```

Run pending migrations:

```bash
./scripts/database/database_migrate.sh
```

Start the server after ensuring the database and migrations are ready:

```bash
./scripts/database/start_server_with_mysql.sh
```

Skip automatic migration during server startup:

```bash
RUN_DB_MIGRATIONS=false ./scripts/database/start_server_with_mysql.sh
```

Check migration status:

```bash
./scripts/database/database_status.sh
```

Drop the database:

```bash
./scripts/database/database_drop.sh
```

Drop, recreate, and migrate the database:

```bash
./scripts/database/database_reset.sh
```

## Tool Installation

If `goose` is missing, the scripts install it automatically with:

```bash
go install github.com/pressly/goose/v3/cmd/goose@latest
```

The scripts use the Docker MySQL container when `flash-im-mysql` exists. If that container is unavailable, they fall back to the local `mysql` client.

## Safety

Drop and reset refuse to operate on protected database names:

- `mysql`
- `information_schema`
- `performance_schema`
- `sys`

Database names may only contain letters, digits, and underscores.
