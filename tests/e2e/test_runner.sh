#!/usr/bin/env bash
# tests/e2e/test_runner.sh
# Master E2E Test Suite Runner for KalPad Redesign

set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
NODE_BIN="/home/srijal/.gemini/antigravity/bin/node"

if [ ! -x "${NODE_BIN}" ]; then
  NODE_BIN="node"
fi

PORT=3000
TARGET_TIER="all"
BASELINE_MODE=false
START_SERVER=false
SERVER_PID=""

# Colors
C_RESET="\033[0m"
C_BOLD="\033[1m"
C_RED="\033[31m"
C_GREEN="\033[32m"
C_YELLOW="\033[33m"
C_CYAN="\033[36m"
C_GRAY="\033[90m"

function show_usage() {
  echo -e "${C_BOLD}KalPad E2E Test Suite Runner${C_RESET}"
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  --all              Run all test suites (default)"
  echo "  --tier1            Run Tier 1 (Feature Coverage) only"
  echo "  --tier2            Run Tier 2 (Boundary & Corner Cases) only"
  echo "  --tier3            Run Tier 3 (Cross-Feature Combinations) only"
  echo "  --tier4            Run Tier 4 (Real-World Student Workloads) only"
  echo "  --slop             Run Slop Elimination Assertions only"
  echo "  --visual           Run Headless Brave Screenshot Verification only"
  echo "  --baseline         Run in baseline observation mode (does not exit on failure)"
  echo "  --with-server      Automatically boot Next.js dev server on port 3000 if inactive"
  echo "  --port <port>      Specify target port (default: 3000)"
  echo "  -h, --help         Display this help message"
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --all) TARGET_TIER="all"; shift ;;
    --tier1) TARGET_TIER="tier1"; shift ;;
    --tier2) TARGET_TIER="tier2"; shift ;;
    --tier3) TARGET_TIER="tier3"; shift ;;
    --tier4) TARGET_TIER="tier4"; shift ;;
    --slop) TARGET_TIER="slop"; shift ;;
    --visual) TARGET_TIER="visual"; shift ;;
    --baseline) BASELINE_MODE=true; shift ;;
    --with-server) START_SERVER=true; shift ;;
    --port) PORT="$2"; shift 2 ;;
    -h|--help) show_usage ;;
    *) echo -e "${C_RED}Unknown option: $1${C_RESET}"; show_usage ;;
  esac
done

export BASE_URL="http://localhost:${PORT}"

function cleanup_server() {
  if [ -n "${SERVER_PID}" ]; then
    echo -e "${C_GRAY}Shutting down background dev server (PID: ${SERVER_PID})...${C_RESET}"
    kill "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
}

trap cleanup_server EXIT

echo -e "${C_BOLD}${C_CYAN}================================================================${C_RESET}"
echo -e "${C_BOLD}${C_CYAN}              KalPad Redesign E2E Test Suite                    ${C_RESET}"
echo -e "${C_BOLD}${C_CYAN}================================================================${C_RESET}"
echo -e "Project Root : ${PROJECT_ROOT}"
echo -e "Node Runtime : $(${NODE_BIN} -v)"
echo -e "Target Tier  : ${TARGET_TIER}"
echo -e "Target URL   : ${BASE_URL}"
echo -e "Baseline Mode: ${BASELINE_MODE}"
echo ""

# Check or start server if requested
SERVER_UP=false
if curl -s -f -o /dev/null "${BASE_URL}"; then
  SERVER_UP=true
  echo -e "${C_GREEN}✓ Dev server detected and responding at ${BASE_URL}${C_RESET}"
elif [ "${START_SERVER}" = true ]; then
  echo -e "${C_YELLOW}Starting Next.js dev server on port ${PORT}...${C_RESET}"
  cd "${PROJECT_ROOT}"
  ./node_modules/.bin/next dev --port "${PORT}" > /tmp/next_e2e_runner.log 2>&1 &
  SERVER_PID=$!
  echo -e "${C_GRAY}Waiting for dev server to become ready (up to 30s)...${C_RESET}"
  for i in {1..30}; do
    if curl -s -f -o /dev/null "${BASE_URL}"; then
      SERVER_UP=true
      echo -e "${C_GREEN}✓ Dev server ready at ${BASE_URL} (after ${i}s)${C_RESET}"
      break
    fi
    sleep 1
  done
  if [ "${SERVER_UP}" = false ]; then
    echo -e "${C_YELLOW}⚠ Dev server did not respond within 30s. Visual tests will be skipped.${C_RESET}"
  fi
else
  echo -e "${C_GRAY}ℹ Dev server is not running at ${BASE_URL}. Static and code assertions will run directly.${C_RESET}"
fi
echo ""

TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0

declare -A SUITE_RESULTS

function run_suite() {
  local suite_name="$1"
  local suite_file="$2"
  TOTAL_SUITES=$((TOTAL_SUITES + 1))

  echo -e "${C_BOLD}▶ Running: ${suite_name}${C_RESET} (${suite_file})"
  
  if "${NODE_BIN}" "${SCRIPT_DIR}/${suite_file}"; then
    echo -e "${C_GREEN}✔ PASSED: ${suite_name}${C_RESET}\n"
    PASSED_SUITES=$((PASSED_SUITES + 1))
    SUITE_RESULTS["${suite_name}"]="PASSED"
  else
    echo -e "${C_RED}✖ FAILED: ${suite_name}${C_RESET}\n"
    FAILED_SUITES=$((FAILED_SUITES + 1))
    SUITE_RESULTS["${suite_name}"]="FAILED"
  fi
}

cd "${PROJECT_ROOT}"

if [ "${TARGET_TIER}" = "all" ] || [ "${TARGET_TIER}" = "slop" ]; then
  run_suite "Slop Elimination Assertions" "slop_elimination.test.mjs"
fi

if [ "${TARGET_TIER}" = "all" ] || [ "${TARGET_TIER}" = "tier1" ]; then
  run_suite "Tier 1: Feature Coverage (8 Core Sections)" "tier1_feature_coverage.test.mjs"
fi

if [ "${TARGET_TIER}" = "all" ] || [ "${TARGET_TIER}" = "tier2" ]; then
  run_suite "Tier 2: Boundary & Corner Cases" "tier2_boundary_corner.test.mjs"
fi

if [ "${TARGET_TIER}" = "all" ] || [ "${TARGET_TIER}" = "tier3" ]; then
  run_suite "Tier 3: Cross-Feature Combinations" "tier3_cross_feature.test.mjs"
fi

if [ "${TARGET_TIER}" = "all" ] || [ "${TARGET_TIER}" = "tier4" ]; then
  run_suite "Tier 4: Real-World Student Workload Scenarios" "tier4_student_workload.test.mjs"
fi

if [ "${TARGET_TIER}" = "all" ] || [ "${TARGET_TIER}" = "visual" ]; then
  run_suite "Headless Brave Browser Visual Verification" "visual_screenshot.test.mjs"
fi

echo -e "${C_BOLD}${C_CYAN}================================================================${C_RESET}"
echo -e "${C_BOLD}${C_CYAN}                     E2E Execution Summary                      ${C_RESET}"
echo -e "${C_BOLD}${C_CYAN}================================================================${C_RESET}"

for suite in "${!SUITE_RESULTS[@]}"; do
  status="${SUITE_RESULTS[$suite]}"
  if [ "$status" = "PASSED" ]; then
    printf "  %-50s ${C_GREEN}%s${C_RESET}\n" "$suite" "[ PASS ]"
  else
    printf "  %-50s ${C_RED}%s${C_RESET}\n" "$suite" "[ FAIL ]"
  fi
done

echo ""
echo -e "Total Suites  : ${TOTAL_SUITES}"
echo -e "Passed Suites : ${C_GREEN}${PASSED_SUITES}${C_RESET}"
echo -e "Failed Suites : ${C_RED}${FAILED_SUITES}${C_RESET}"
echo ""

if [ "${FAILED_SUITES}" -gt 0 ]; then
  if [ "${BASELINE_MODE}" = true ]; then
    echo -e "${C_YELLOW}⚠ Baseline execution recorded ${FAILED_SUITES} failures on current codebase.${C_RESET}"
    echo -e "${C_YELLOW}  These failures confirm the genuine presence of slop and pre-redesign state.${C_RESET}"
    exit 0
  else
    echo -e "${C_RED}✖ Test run failed with ${FAILED_SUITES} failing suite(s).${C_RESET}"
    exit 1
  fi
else
  echo -e "${C_GREEN}✔ All test suites passed successfully!${C_RESET}"
  exit 0
fi
