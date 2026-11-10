#!/usr/bin/env bash

SCRIPTPATH="$(
	cd -- "$(dirname "$0")" >/dev/null 2>&1 || exit
	pwd -P
)"

ROOT_DIR="$(dirname "$SCRIPTPATH")"

# The repo root is mounted at /app, so scripts are addressed as
# /app/learn/<name>.ts and handleSummary() output lands in ./results.
mkdir -p "$ROOT_DIR/results"

docker run --rm -ti \
	-v "$ROOT_DIR":/app \
	--add-host learn.odl.local:host-gateway \
	--add-host api.learn.odl.local:host-gateway \
	grafana/k6:master-with-browser \
	run "$@"
