#!/usr/bin/env bash
#
# Regenerate the k6 API clients under learn/backend/client/ from MIT Learn's
# published OpenAPI schema.
#
# Point LEARN_API_BASE_URL at another deployment to generate against it:
#   LEARN_API_BASE_URL=https://api.rc.learn.mit.edu ./scripts/generate-from-openapi.sh

set -euo pipefail

SCRIPT_DIR=$(
	cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd
)
ROOT_DIR=$(dirname "${SCRIPT_DIR}")

LEARN_API_BASE_URL="${LEARN_API_BASE_URL:-https://api.learn.mit.edu}"

cd "${ROOT_DIR}"

for version in v0 v1; do
	npx @grafana/openapi-to-k6 --mode split \
		"${LEARN_API_BASE_URL}/api/${version}/schema/" \
		"learn/backend/client/${version}/api.ts"
done
