#!/bin/sh
set -e

echo "Waiting for Postgres..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT"; do
  sleep 2
done

echo "Running migrations..."
node ace migration:run --force

EXISTS=$(psql "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_DATABASE" -tAc "SELECT 1 FROM information_schema.tables WHERE table_name='exercises'")

if [ "$EXISTS" != "1" ]; then
  echo "Seeding database..."
  node ace db:seed
fi

echo "Starting Adonis server..."
node ace serve --watch