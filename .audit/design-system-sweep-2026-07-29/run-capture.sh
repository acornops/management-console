#!/usr/bin/env bash
set -euo pipefail

audit_server_pid=''
audit_port="${AUDIT_PORT:-4186}"

cleanup() {
  if [[ -n "${audit_server_pid}" ]] && kill -0 "${audit_server_pid}" 2>/dev/null; then
    kill "${audit_server_pid}"
    wait "${audit_server_pid}" 2>/dev/null || true
  fi
}

trap cleanup EXIT

VITE_APP_DATA_MODE=mock \
VITE_CONTROL_PLANE_API_BASE_URL=http://127.0.0.1:59999 \
./node_modules/.bin/vite --host 127.0.0.1 --port "${audit_port}" --strictPort \
  > .audit/design-system-sweep-2026-07-29/vite.log 2>&1 &
audit_server_pid=$!

for _ in {1..80}; do
  if curl -fsS "http://127.0.0.1:${audit_port}/" >/dev/null; then
    node .audit/design-system-sweep-2026-07-29/capture.mjs
    exit 0
  fi
  sleep 0.25
done

echo "Fixture server did not become ready." >&2
exit 1
