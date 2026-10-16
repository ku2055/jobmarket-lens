#!/usr/bin/env bash
# Backward-compatible local entry point; no upstream private repository access.
set -euo pipefail
exec "$(dirname "$0")/run_independent.sh" "$@"
