#!/usr/bin/env bash
set -euo pipefail

for name in MYSQL_DATABASE MYSQL_WORKER_USER; do
  value="${!name}"
  if [[ ! "$value" =~ ^[A-Za-z0-9_]+$ ]]; then
    echo "Invalid MySQL identifier in $name" >&2
    exit 1
  fi
done
if [[ -z "$MYSQL_WORKER_PASSWORD" ]]; then
  echo "MYSQL_WORKER_PASSWORD must not be empty" >&2
  exit 1
fi

escaped_password=$(printf '%s' "$MYSQL_WORKER_PASSWORD" | sed -e 's/\\/\\\\/g' -e "s/'/''/g")
mysql --protocol=TCP --host="$MYSQL_HOST" --user=root --password="$MYSQL_ROOT_PASSWORD" \
  --execute="CREATE USER IF NOT EXISTS '${MYSQL_WORKER_USER}'@'%' IDENTIFIED BY '${escaped_password}';
ALTER USER '${MYSQL_WORKER_USER}'@'%' IDENTIFIED BY '${escaped_password}';
REVOKE ALL PRIVILEGES, GRANT OPTION FROM '${MYSQL_WORKER_USER}'@'%';
GRANT SELECT ON \`${MYSQL_DATABASE}\`.* TO '${MYSQL_WORKER_USER}'@'%';"
