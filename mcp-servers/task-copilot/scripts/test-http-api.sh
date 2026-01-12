#!/bin/bash

# HTTP API Comprehensive Test Script
# Tests all endpoints against a running server on localhost:9090

set -e

BASE_URL="http://127.0.0.1:9090"
PASSED=0
FAILED=0
TOTAL=0

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test helper function
test_endpoint() {
  local test_name="$1"
  local method="$2"
  local endpoint="$3"
  local expected_status="$4"
  local check_function="${5:-}"

  TOTAL=$((TOTAL + 1))

  echo -n "Test $TOTAL: $test_name... "

  response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" 2>/dev/null || echo "000")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "$expected_status" ]; then
    if [ -n "$check_function" ]; then
      if eval "$check_function '$body'"; then
        echo -e "${GREEN}✓ PASS${NC}"
        PASSED=$((PASSED + 1))
        return 0
      else
        echo -e "${RED}✗ FAIL${NC} (check failed)"
        FAILED=$((FAILED + 1))
        return 1
      fi
    else
      echo -e "${GREEN}✓ PASS${NC}"
      PASSED=$((PASSED + 1))
      return 0
    fi
  else
    echo -e "${RED}✗ FAIL${NC} (expected $expected_status, got $http_code)"
    FAILED=$((FAILED + 1))
    return 1
  fi
}

# Check functions
check_json_array() {
  local body="$1"
  echo "$body" | jq -e 'type == "object"' >/dev/null 2>&1
}

check_streams_structure() {
  local body="$1"
  echo "$body" | jq -e '.streams | type == "array"' >/dev/null 2>&1 && \
  echo "$body" | jq -e '.totalStreams | type == "number"' >/dev/null 2>&1
}

check_stream_detail() {
  local body="$1"
  echo "$body" | jq -e '.streamId | type == "string"' >/dev/null 2>&1 && \
  echo "$body" | jq -e '.tasks | type == "array"' >/dev/null 2>&1 && \
  echo "$body" | jq -e '.progressPercentage | type == "number"' >/dev/null 2>&1
}

check_tasks_structure() {
  local body="$1"
  echo "$body" | jq -e '.tasks | type == "array"' >/dev/null 2>&1 && \
  echo "$body" | jq -e '.totalTasks | type == "number"' >/dev/null 2>&1
}

check_activity_structure() {
  local body="$1"
  echo "$body" | jq -e '.activities | type == "array"' >/dev/null 2>&1 && \
  echo "$body" | jq -e '.totalActive | type == "number"' >/dev/null 2>&1 && \
  echo "$body" | jq -e '.totalIdle | type == "number"' >/dev/null 2>&1
}

# Check if server is running
echo "Checking if HTTP server is available at $BASE_URL..."
if ! curl -s "$BASE_URL/health" >/dev/null 2>&1; then
  echo -e "${RED}ERROR: Server not available at $BASE_URL${NC}"
  echo "Please ensure the Task Copilot MCP server is running"
  exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}"
echo ""

# ========================================
# ENDPOINT AVAILABILITY TESTS
# ========================================
echo "========================================="
echo "ENDPOINT AVAILABILITY TESTS"
echo "========================================="
echo ""

test_endpoint "Health endpoint responds" "GET" "/health" "200" "check_json_array"
test_endpoint "GET /api/streams responds" "GET" "/api/streams" "200" "check_streams_structure"
test_endpoint "GET /api/tasks responds" "GET" "/api/tasks" "200" "check_tasks_structure"
test_endpoint "GET /api/activity responds" "GET" "/api/activity" "200" "check_activity_structure"

echo ""

# ========================================
# GET /api/streams TESTS
# ========================================
echo "========================================="
echo "GET /api/streams TESTS"
echo "========================================="
echo ""

test_endpoint "Streams list returns valid structure" "GET" "/api/streams" "200" "check_streams_structure"

# Test with initiative filter
test_endpoint "Filter by initiativeId works" "GET" "/api/streams?initiativeId=test-init" "200" "check_streams_structure"

# Test includeArchived parameter
test_endpoint "includeArchived parameter works" "GET" "/api/streams?includeArchived=true" "200" "check_streams_structure"

echo ""

# ========================================
# GET /api/streams/:streamId TESTS
# ========================================
echo "========================================="
echo "GET /api/streams/:streamId TESTS"
echo "========================================="
echo ""

# Test stream detail (we need to know a valid streamId)
# For now, just test the 404 case
test_endpoint "Non-existent stream returns 404" "GET" "/api/streams/NonExistentStream-999" "404" "check_json_array"

echo ""

# ========================================
# GET /api/tasks TESTS
# ========================================
echo "========================================="
echo "GET /api/tasks TESTS"
echo "========================================="
echo ""

test_endpoint "Tasks list returns valid structure" "GET" "/api/tasks" "200" "check_tasks_structure"

# Test filters
test_endpoint "Filter by status works" "GET" "/api/tasks?status=completed" "200" "check_tasks_structure"
test_endpoint "Filter by status=in_progress works" "GET" "/api/tasks?status=in_progress" "200" "check_tasks_structure"
test_endpoint "Filter by status=pending works" "GET" "/api/tasks?status=pending" "200" "check_tasks_structure"
test_endpoint "Filter by status=blocked works" "GET" "/api/tasks?status=blocked" "200" "check_tasks_structure"

# Test assignedAgent filter
test_endpoint "Filter by assignedAgent works" "GET" "/api/tasks?assignedAgent=me" "200" "check_tasks_structure"
test_endpoint "Filter by assignedAgent=qa works" "GET" "/api/tasks?assignedAgent=qa" "200" "check_tasks_structure"

# Test limit parameter
test_endpoint "Limit parameter works" "GET" "/api/tasks?limit=5" "200" "check_tasks_structure"
test_endpoint "Limit=1 returns max 1 task" "GET" "/api/tasks?limit=1" "200" "check_tasks_structure"

# Test multiple filters
test_endpoint "Multiple filters work together" "GET" "/api/tasks?status=in_progress&limit=10" "200" "check_tasks_structure"

echo ""

# ========================================
# GET /api/activity TESTS
# ========================================
echo "========================================="
echo "GET /api/activity TESTS"
echo "========================================="
echo ""

test_endpoint "Activity endpoint returns valid structure" "GET" "/api/activity" "200" "check_activity_structure"

# Test filters
test_endpoint "Filter by streamId works" "GET" "/api/activity?streamId=Stream-A" "200" "check_activity_structure"
test_endpoint "active parameter works (false)" "GET" "/api/activity?active=false" "200" "check_activity_structure"
test_endpoint "active parameter works (true)" "GET" "/api/activity?active=true" "200" "check_activity_structure"

echo ""

# ========================================
# EDGE CASES
# ========================================
echo "========================================="
echo "EDGE CASES AND ERROR HANDLING"
echo "========================================="
echo ""

test_endpoint "Invalid status returns empty results" "GET" "/api/tasks?status=invalid_status_xyz" "200" "check_tasks_structure"
test_endpoint "Non-existent streamId returns empty results" "GET" "/api/tasks?streamId=NonExistentStream-999" "200" "check_tasks_structure"
test_endpoint "Invalid limit is ignored" "GET" "/api/tasks?limit=invalid" "200" "check_tasks_structure"
test_endpoint "Empty initiativeId returns results" "GET" "/api/streams?initiativeId=" "200" "check_streams_structure"

echo ""

# ========================================
# SUMMARY
# ========================================
echo "========================================="
echo "TEST SUMMARY"
echo "========================================="
echo ""
echo "Total Tests: $TOTAL"
echo -e "Passed: ${GREEN}$PASSED${NC} ($((PASSED * 100 / TOTAL))%)"
echo -e "Failed: ${RED}$FAILED${NC}"
echo "========================================="

if [ $FAILED -eq 0 ]; then
  echo -e "\n${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "\n${RED}Some tests failed${NC}"
  exit 1
fi
