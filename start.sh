#!/usr/bin/env bash
#
# Single-container entrypoint for Render's free Web Service: runs the Celery
# worker (solo pool — one process, low memory) alongside the Uvicorn API.
#
# Both children are started in the background and reaped by `wait` so that a
# SIGTERM/SIGINT to this script (PID 1) is forwarded to them and the container
# shuts down cleanly instead of being force-killed.

set -euo pipefail

PORT="${PORT:-8000}"
worker_pid=""
web_pid=""

shutdown() {
    # Ignore further signals while we clean up.
    trap '' TERM INT
    echo "start.sh: shutting down child processes..."
    [ -n "$web_pid" ] && kill -TERM "$web_pid" 2>/dev/null || true
    [ -n "$worker_pid" ] && kill -TERM "$worker_pid" 2>/dev/null || true
    wait
    echo "start.sh: done."
    exit 0
}
trap shutdown TERM INT

echo "start.sh: starting Celery worker (solo pool)..."
celery -A app.worker.celery_app worker --pool=solo --loglevel=info &
worker_pid=$!

echo "start.sh: starting Uvicorn on 0.0.0.0:${PORT}..."
uvicorn app.main:app --host 0.0.0.0 --port "${PORT}" &
web_pid=$!

# Exit as soon as either process dies, then tear the other one down.
wait -n
echo "start.sh: a child process exited; stopping the container."
shutdown
