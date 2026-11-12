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

# `k6 x openapi` is a subcommand extension, so generating needs a k6 built with
# it. Only generating does: the client written below is plain TypeScript that
# runs on a stock k6.
#
# This pin is in a shell script rather than a lockfile, so no language manager
# sees it. The annotation below is what the customManagers block in
# renovate.json matches, so a new release still opens a pull request.
# renovate: datasource=github-releases depName=grafana/xk6-subcommand-openapi
XK6_OPENAPI_VERSION=v0.1.0

# The release publishes no checksum file, so these digests come from the GitHub
# API. Renovate can bump the version above but cannot compute these, so a
# version bump lands with four stale digests and the next run of this script
# stops at the mismatch below. Refresh all four from the bumped version:
#   gh api repos/grafana/xk6-subcommand-openapi/releases/tags/${XK6_OPENAPI_VERSION} \
#     --jq '.assets[] | "\(.name) \(.digest | sub("^sha256:"; ""))"'
# The API prefixes each digest with `sha256:`; the comparison below is against
# bare hex, so the prefix has to come off.
case "$(uname -s)-$(uname -m)" in
Linux-x86_64)
	PLATFORM=linux_amd64
	SHA256=309a6ed0822a6afadf9a29b52c574ddbded90b74dd85f558521a713e1a181521
	;;
Linux-aarch64 | Linux-arm64)
	PLATFORM=linux_arm64
	SHA256=fcdb938e49715ab38b2f99d06a3120a3ac057ae548fe8fd92cf13fa64cde68f8
	;;
Darwin-x86_64)
	PLATFORM=darwin_amd64
	SHA256=473f7fc54774ec7e055df0e8b460aad52b0545a31664da9c1895adda49fc90f1
	;;
Darwin-arm64)
	PLATFORM=darwin_arm64
	SHA256=65e068788ac307e0acc8a5a5a5bbc0f968ee74ff6a18bafd35032811a331cc0b
	;;
*)
	echo "xk6-subcommand-openapi publishes no build for $(uname -s)-$(uname -m)." >&2
	exit 1
	;;
esac

sha256_of() {
	if command -v sha256sum &>/dev/null; then
		sha256sum "$1" | cut -d' ' -f1
	else
		shasum -a 256 "$1" | cut -d' ' -f1
	fi
}

cd "${ROOT_DIR}"

CACHE_DIR=".cache/k6-openapi/${XK6_OPENAPI_VERSION}"
K6="${CACHE_DIR}/xk6-subcommand-openapi_${XK6_OPENAPI_VERSION}_${PLATFORM}/k6"

if [[ ! -x ${K6} ]]; then
	ARCHIVE="${CACHE_DIR}/${PLATFORM}.tar.gz"
	URL="https://github.com/grafana/xk6-subcommand-openapi/releases/download/${XK6_OPENAPI_VERSION}/xk6-subcommand-openapi_${XK6_OPENAPI_VERSION}_${PLATFORM}.tar.gz"

	mkdir -p "${CACHE_DIR}"
	echo "Fetching ${URL}"
	curl --fail --silent --show-error --location \
		--proto '=https' --proto-redir '=https' \
		--output "${ARCHIVE}" "${URL}"

	ACTUAL=$(sha256_of "${ARCHIVE}")
	if [[ ${ACTUAL} != "${SHA256}" ]]; then
		rm -f "${ARCHIVE}"
		echo "Checksum mismatch for ${ARCHIVE}: expected ${SHA256}, got ${ACTUAL}." >&2
		echo "If XK6_OPENAPI_VERSION was just bumped, refresh all four digests:" >&2
		echo "  gh api repos/grafana/xk6-subcommand-openapi/releases/tags/${XK6_OPENAPI_VERSION} \\" >&2
		echo "    --jq '.assets[] | \"\\(.name) \\(.digest | sub(\"^sha256:\"; \"\"))\"'" >&2
		exit 1
	fi

	tar -xzf "${ARCHIVE}" -C "${CACHE_DIR}"
	rm -f "${ARCHIVE}"
fi

# Each descriptor construct the generator skips or approximates is logged as a
# warning on stderr, so read the output rather than only the exit status.
for version in v0 v1; do
	mkdir -p "learn/backend/client/${version}"
	"${K6}" x openapi \
		"${LEARN_API_BASE_URL}/api/${version}/schema/" \
		--out "learn/backend/client/${version}/api.ts"
done
