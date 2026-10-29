#!/bin/sh
# Analyse les deux projets. Le jeton reste dans SONAR_TOKEN, jamais dans un fichier.
set -eu
cd "$(dirname "$0")/.."
if [ -z "${SONAR_TOKEN:-}" ]; then
  echo "Définis SONAR_TOKEN dans l'environnement du shell, pas dans le dépôt." >&2
  exit 1
fi
version="${1:-1.1}"
host="${SONAR_HOST_URL:-http://host.docker.internal:9000}"
scan() {
  docker run --rm \
    -e SONAR_HOST_URL="$host" \
    -e SONAR_TOKEN \
    -v "$PWD:/usr/src" \
    sonarsource/sonar-scanner-cli \
    -Dproject.settings="$1" \
    -Dsonar.projectVersion="$version"
}
scan sonar/backend.properties
scan sonar/frontend.properties
