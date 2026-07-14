#!/bin/sh
set -eu

PORT="${PORT:-8000}"

exec php artisan serve --host=0.0.0.0 --port="${PORT}"
