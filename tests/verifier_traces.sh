#!/bin/sh
# Trois preuves : ciel-api, ciel-web, et un span de base sous l'API.
set -eu
base="${JAEGER_URL:-http://127.0.0.1:16686}"
ok=0
fail=0

point() {
  if [ "$1" -eq 0 ]; then
    echo "OK  $2"
    ok=$((ok + 1))
  else
    echo "ÉCHEC  $2"
    fail=$((fail + 1))
  fi
}

services=$(curl -sf "$base/api/v3/services" || true)
if printf '%s' "$services" | grep -q ciel-api; then point 0 "Jaeger propose ciel-api"; else point 1 "Jaeger propose ciel-api"; fi
if printf '%s' "$services" | grep -q ciel-web; then point 0 "Jaeger propose ciel-web"; else point 1 "Jaeger propose ciel-web"; fi

start=$(python3 -c 'from datetime import datetime, timedelta, timezone; print((datetime.now(timezone.utc)-timedelta(hours=6)).isoformat())')
end=$(python3 -c 'from datetime import datetime, timezone; print(datetime.now(timezone.utc).isoformat())')
traces=$(curl -sf --get "$base/api/v3/traces" \
  --data-urlencode "query.service_name=ciel-api" \
  --data-urlencode "query.start_time_min=$start" \
  --data-urlencode "query.start_time_max=$end" \
  --data-urlencode "query.num_traces=5" || true)
if printf '%s' "$traces" | grep -q countDocuments; then
  point 0 "une trace ciel-api contient un span de base"
else
  point 1 "une trace ciel-api contient un span de base"
fi

echo "Bilan : $ok OK, $fail ÉCHEC"
[ "$fail" -eq 0 ]
