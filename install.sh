#!/usr/bin/env bash
# One-shot install: creates .env, restores the newest DB backup (first run only), starts the app.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  PORT_=${PORT:-8080}
  cat > .env <<ENV
POSTGRES_PASSWORD=$(openssl rand -hex 32)
BETTER_AUTH_SECRET=$(openssl rand -hex 32)
BETTER_AUTH_URL=http://localhost:$PORT_
PORT=$PORT_
ENV
fi

docker compose up -d --wait db
if [ -z "$(docker compose exec -T db psql -U sara -d sara -tAc "select to_regclass('public.building_state')")" ]; then
  backup=$(ls backups/*.sql | sort | tail -1)
  echo "Restoring $backup"
  docker compose exec -T db psql -U sara -d sara -v ON_ERROR_STOP=1 < "$backup"
fi
docker compose up -d --build app
echo "Sara is up on http://localhost:$(grep ^PORT= .env | cut -d= -f2)"
