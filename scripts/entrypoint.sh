#!/bin/sh
set -e
echo "Aguardando banco e aplicando migrations..."
npx prisma migrate deploy
echo "Migrations ok. Iniciando API."
exec "$@"
