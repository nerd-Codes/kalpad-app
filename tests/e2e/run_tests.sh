#!/usr/bin/env bash
# tests/e2e/run_tests.sh
# Alias wrapper pointing to test_runner.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${SCRIPT_DIR}/test_runner.sh" "$@"
