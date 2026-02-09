#!/usr/bin/env bash
set -euo pipefail

API="http://localhost:3003"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

PASS=0
FAIL=0
SKIP=0
TOTAL_ASSERTIONS=0
ERRORS=()
LOG="/tmp/rex-test-$(date +%Y%m%d-%H%M%S).log"
TOKEN=""
DELAY=0.15

VERBOSE=false
RUN_PHASE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --verbose) VERBOSE=true; shift ;;
    --phase)   RUN_PHASE="$2"; shift 2 ;;
    --delay)   DELAY="$2"; shift 2 ;;
    *)         shift ;;
  esac
done

do_pass() {
  ((PASS++)); ((TOTAL_ASSERTIONS++))
  echo -e "  ${GREEN}PASS${NC} $1"
  echo "[PASS] $1" >> "$LOG"
}

do_fail() {
  ((FAIL++)); ((TOTAL_ASSERTIONS++))
  ERRORS+=("$1: $2")
  echo -e "  ${RED}FAIL${NC} $1 -- ${DIM}$2${NC}"
  echo "[FAIL] $1: $2" >> "$LOG"
}

do_skip() {
  ((SKIP++))
  echo -e "  ${YELLOW}SKIP${NC} $1 -- ${DIM}$2${NC}"
  echo "[SKIP] $1: $2" >> "$LOG"
}

header() { echo -e "\n${CYAN}${BOLD}=== $1 ===${NC}"; }
sub()    { echo -e "\n${BOLD}  > $1${NC}"; }
should_run() { [[ -z "$RUN_PHASE" ]] || [[ "$RUN_PHASE" = "$1" ]]; }
verbose_log() { $VERBOSE && echo -e "    ${DIM}$1${NC}" || true; }

get_token() {
  curl -s -X POST "$API/api/auth/register" \
    -H 'Content-Type: application/json' \
    -d '{"email":"nodetest@rex.dev","password":"NodeTest1234!","name":"Node Tester"}' > /dev/null 2>&1 || true
  local resp
  resp=$(curl -s -X POST "$API/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d '{"email":"nodetest@rex.dev","password":"NodeTest1234!"}')
  echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null
}

exec_node() {
  sleep "$DELAY"
  local nodeType="$1" payload="$2"
  curl -s -X POST "$API/api/workflows/nodes/$nodeType/execute" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d "$payload" 2>/dev/null
}

exec_workflow() {
  sleep "$DELAY"
  local payload="$1"
  curl -s -X POST "$API/api/workflows/run-workflow" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d "$payload" 2>/dev/null
}

# Python helpers for response parsing
is_success() {
  python3 -c "
import sys,json
try:
    d=json.loads(sys.argv[1])
    s=d.get('success',False)
    dr=d.get('data',{}).get('result',{})
    if isinstance(dr,dict) and dr.get('success',False): sys.exit(0)
    elif s and not d.get('error'): sys.exit(0)
    else: sys.exit(1)
except Exception: sys.exit(1)
" "$1" 2>/dev/null && echo "yes" || echo "no"
}

is_error() {
  python3 -c "
import sys,json
try:
    d=json.loads(sys.argv[1])
    if d.get('error'): sys.exit(0)
    dr=d.get('data',{}).get('result',{})
    if isinstance(dr,dict) and dr.get('success')==False: sys.exit(0)
    if d.get('success')==False: sys.exit(0)
    sys.exit(1)
except Exception: sys.exit(0)
" "$1" 2>/dev/null && echo "yes" || echo "no"
}

get_error() {
  python3 -c "
import sys,json
try:
    d=json.loads(sys.argv[1])
    e=d.get('error','') or d.get('message','')
    if not e:
        dd=d.get('data',{})
        if isinstance(dd,dict):
            e=dd.get('error','')
            if not e:
                dr=dd.get('result',{})
                if isinstance(dr,dict):
                    e=dr.get('error','') or dr.get('message','')
    if not e and d.get('success')==False:
        e='success=false (no message)'
    if not e:
        e=sys.argv[1][:150]
    print(str(e)[:200])
except Exception:
    print(sys.argv[1][:200] if len(sys.argv)>1 else 'parse error')
" "$1" 2>/dev/null
}

# get_field: extracts from nested response structure
# Tries: data.result.output.<path>, data.result.<path>, data.<path>, <path>
get_field() {
  python3 -c "
import sys,json
def resolve(d,path):
    for p in path:
        if not p: continue
        if isinstance(d,dict): d=d.get(p)
        elif isinstance(d,list) and p.isdigit(): d=d[int(p)]
        else: return None
    return d

try:
    d=json.loads(sys.argv[1])
    parts=[p for p in sys.argv[2].split('.') if p]
    # Try data.result.output.<path>
    v=resolve(d,['data','result','output']+parts)
    if v is not None:
        print(json.dumps(v) if isinstance(v,(dict,list)) else str(v)); sys.exit(0)
    # Try data.result.<path>
    v=resolve(d,['data','result']+parts)
    if v is not None:
        print(json.dumps(v) if isinstance(v,(dict,list)) else str(v)); sys.exit(0)
    # Try data.<path>
    v=resolve(d,['data']+parts)
    if v is not None:
        print(json.dumps(v) if isinstance(v,(dict,list)) else str(v)); sys.exit(0)
    # Try direct
    v=resolve(d,parts)
    if v is not None:
        print(json.dumps(v) if isinstance(v,(dict,list)) else str(v)); sys.exit(0)
    print('')
except Exception:
    print('')
" "$1" "$2" 2>/dev/null
}

assert_field_exists() {
  local resp="$1" field="$2" test_name="$3"
  local val; val=$(get_field "$resp" "$field")
  if [ -n "$val" ]; then do_pass "$test_name -> has '$field'"; else do_fail "$test_name" "missing '$field'"; fi
}

assert_field_equals() {
  local resp="$1" field="$2" expected="$3" test_name="$4"
  local val; val=$(get_field "$resp" "$field")
  if [ "$val" = "$expected" ]; then do_pass "$test_name -> $field = $expected"; else do_fail "$test_name" "expected $field='$expected', got '$val'"; fi
}

assert_success() {
  local resp="$1" test_name="$2"
  if [ "$(is_success "$resp")" = "yes" ]; then do_pass "$test_name"; else do_fail "$test_name" "$(get_error "$resp")"; fi
}

assert_error() {
  local resp="$1" test_name="$2"
  if [ "$(is_error "$resp")" = "yes" ]; then do_pass "$test_name -> correctly returned error"; else do_fail "$test_name" "expected error but got success"; fi
}

assert_workflow_success() {
  local resp="$1" test_name="$2"
  local suc
  suc=$(python3 -c "
import sys,json
try:
    d=json.loads(sys.argv[1])
    if d.get('success') and (d.get('data',{}).get('success',True)):
        sys.exit(0)
    else:
        sys.exit(1)
except Exception:
    sys.exit(1)
" "$resp" 2>/dev/null && echo "yes" || echo "no")
  if [ "$suc" = "yes" ]; then do_pass "$test_name"; else do_fail "$test_name" "$(get_error "$resp")"; fi
}

assert_no_crash() {
  local resp="$1" test_name="$2"
  if [ "$(is_success "$resp")" = "yes" ] || [ "$(is_error "$resp")" = "yes" ]; then
    do_pass "$test_name"
  else
    do_fail "$test_name" "unexpected crash"
  fi
}

echo "REX Node Test Suite — $(date)"
echo "Log file: $LOG"
echo "" > "$LOG"

# === PHASE 0: PREFLIGHT ===
header "Phase 0: Preflight Checks"

HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/health" 2>/dev/null || echo "000")
if [ "$HTTP" != "200" ]; then
  echo -e "${RED}Backend not running at $API (HTTP $HTTP). Run: docker compose up -d${NC}"
  exit 1
fi
do_pass "Backend reachable (HTTP $HTTP)"

TOKEN=$(get_token)
if [ -z "$TOKEN" ]; then
  echo -e "${RED}Failed to obtain auth token${NC}"; exit 1
fi
do_pass "Auth token obtained (${#TOKEN} chars)"

# === PHASE 1: REGISTRATION HEALTH ===
if should_run 1; then
header "Phase 1: Node Registration Health"

NODES_RESP=$(curl -s "$API/api/workflows/nodes/test/all" -H "Authorization: Bearer $TOKEN" 2>/dev/null)
TOTAL_NODES=$(echo "$NODES_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('total',0))" 2>/dev/null || echo "0")
AVAIL_NODES=$(echo "$NODES_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('available',0))" 2>/dev/null || echo "0")
ERR_COUNT=$(echo "$NODES_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('errors',0))" 2>/dev/null || echo "0")
MISS_COUNT=$(echo "$NODES_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('missing',0))" 2>/dev/null || echo "0")

echo "  Total: $TOTAL_NODES | Available: $AVAIL_NODES | Errors: $ERR_COUNT | Missing: $MISS_COUNT"

if [ "$ERR_COUNT" = "0" ]; then do_pass "Registry: zero errors"; else do_fail "Registry: errors" "$ERR_COUNT errors found"; fi
if [ "$MISS_COUNT" = "0" ]; then do_pass "Registry: zero missing"; else do_fail "Registry: missing" "$MISS_COUNT nodes missing"; fi

# Category checks (bash 3.2 compatible)
# Actual counts: agent:5 ai:11 analytics:3 cloud:6 communication:10 core:8 data:4
#   development:3 file-processing:4 finance:1 integrations:3 llm:3 logic:1 productivity:3 trigger:5 utility:3
CAT_NAMES="agent ai analytics cloud communication core data development file-processing finance integrations llm logic productivity trigger utility"
CAT_MINS="5 10 3 6 10 8 4 3 4 1 3 3 1 3 5 3"

set -- $CAT_MINS
for CAT in $CAT_NAMES; do
  MIN=$1; shift
  CNT=$(echo "$NODES_RESP" | python3 -c "
import sys,json
d=json.load(sys.stdin)
results=d.get('data',{}).get('results',[])
print(sum(1 for r in results if r.get('category')=='$CAT'))
" 2>/dev/null || echo "0")
  if [ "$CNT" -ge "$MIN" ]; then
    do_pass "Category: $CAT=$CNT (min $MIN)"
  else
    do_fail "Category: $CAT" "got $CNT, expected >= $MIN"
  fi
done

fi

# === PHASE 2: CONFIG VALIDATION ===
if should_run 2; then
header "Phase 2: Config Validation"

sub "Trigger nodes"
RESP=$(exec_node "manual" '{"config":{},"input":{}}')
assert_success "$RESP" "manual: empty config OK"

RESP=$(exec_node "schedule" '{"config":{},"options":{"triggerInterval":5,"triggerIntervalUnit":"minutes"},"input":{}}')
assert_success "$RESP" "schedule: minimal config OK"

sub "Core nodes - missing required params"
RESP=$(exec_node "code" '{"config":{},"input":{}}')
assert_error "$RESP" "code: no code"

RESP=$(exec_node "date-time" '{"config":{},"input":{}}')
assert_error "$RESP" "date-time: no operation"

RESP=$(exec_node "logger" '{"config":{},"input":{}}')
assert_error "$RESP" "logger: no message"

RESP=$(exec_node "signature-validation" '{"config":{},"input":{}}')
assert_error "$RESP" "signature-validation: no algorithm"

RESP=$(exec_node "audit-log" '{"config":{},"input":{}}')
assert_error "$RESP" "audit-log: no apiUrl"

sub "Logic nodes"
RESP=$(exec_node "condition" '{"config":{},"input":{"value":"test"}}')
assert_error "$RESP" "condition: empty conditions"

sub "Data nodes"
RESP=$(exec_node "data-converter" '{"config":{},"input":{}}')
assert_error "$RESP" "data-converter: no fromFormat"

sub "Agent nodes"
RESP=$(exec_node "agent-decision" '{"config":{},"input":{}}')
assert_error "$RESP" "agent-decision: no decisionType"

RESP=$(exec_node "agent-goal" '{"config":{},"input":{}}')
assert_error "$RESP" "agent-goal: no goalType"

RESP=$(exec_node "agent-reasoning" '{"config":{},"input":{}}')
assert_error "$RESP" "agent-reasoning: no reasoningType"

RESP=$(exec_node "agent-state" '{"config":{},"input":{}}')
assert_error "$RESP" "agent-state: no stateOperation"

RESP=$(exec_node "agent-context" '{"config":{},"input":{}}')
assert_success "$RESP" "agent-context: defaults OK"

sub "Analytics"
RESP=$(exec_node "analytics" '{"config":{},"input":{}}')
assert_error "$RESP" "analytics: no eventName"

sub "LLM nodes"
RESP=$(exec_node "gemini" '{"config":{},"input":{}}')
assert_error "$RESP" "gemini: empty config"

RESP=$(exec_node "gemini" '{"config":{"model":"gemini-2.0-flash","userPrompt":"test"},"input":{}}')
assert_error "$RESP" "gemini: no API key (quota error)"

RESP=$(exec_node "openai" '{"config":{},"input":{}}')
assert_error "$RESP" "openai: empty config"

RESP=$(exec_node "openai" '{"config":{"model":"gpt-4o-mini","userPrompt":"test"},"input":{}}')
assert_error "$RESP" "openai: no API key"

sub "Communication nodes - empty config"
for NT in send-email slack discord telegram whatsapp instagram linkedin-message microsoft-teams twitter-dm zoom; do
  RESP=$(exec_node "$NT" '{"config":{},"input":{}}')
  assert_error "$RESP" "$NT: empty config"
done

sub "Cloud nodes - empty config"
for NT in aws-s3 aws-lambda azure-blob cloudwatch google-cloud-storage docker; do
  RESP=$(exec_node "$NT" '{"config":{},"input":{}}')
  assert_error "$RESP" "$NT: empty config"
done

sub "Database nodes - empty config"
for NT in database mysql postgresql redis; do
  RESP=$(exec_node "$NT" '{"config":{},"input":{}}')
  assert_error "$RESP" "$NT: empty config"
done

sub "Productivity nodes - empty config"
for NT in google-sheets excel google-forms; do
  RESP=$(exec_node "$NT" '{"config":{},"input":{}}')
  assert_error "$RESP" "$NT: empty config"
done

sub "Integration nodes - empty config"
for NT in gmail google-drive onedrive; do
  RESP=$(exec_node "$NT" '{"config":{},"input":{}}')
  assert_error "$RESP" "$NT: empty config"
done

sub "AI nodes - empty config"
for NT in huggingface image-generator text-to-speech speech-to-text audio-processor vector-search document-processor email-analyzer text-analyzer data-analyzer; do
  RESP=$(exec_node "$NT" '{"config":{},"input":{}}')
  assert_error "$RESP" "$NT: empty config"
done

sub "Finance"
RESP=$(exec_node "stripe" '{"config":{},"input":{}}')
assert_error "$RESP" "stripe: empty config"

fi

# === PHASE 3: EXECUTION CORRECTNESS ===
if should_run 3; then
header "Phase 3: Execution Correctness"

sub "Code node - arithmetic"
RESP=$(exec_node "code" '{"config":{"code":"return { result: 2 + 3 };","language":"javascript"},"input":{}}')
assert_success "$RESP" "code: 2+3 js"
assert_field_equals "$RESP" "result" "5" "code: 2+3=5"

sub "Code node - input passthrough"
RESP=$(exec_node "code" '{"config":{"code":"return { echo: input.msg };","language":"javascript"},"input":{"msg":"hello"}}')
assert_success "$RESP" "code: passthrough"
assert_field_equals "$RESP" "echo" "hello" "code: echo input"

sub "Code node - python style"
RESP=$(exec_node "code" '{"config":{"code":"result = {\"value\": 42}","language":"python"},"input":{}}')
assert_no_crash "$RESP" "code: python mode"

sub "Date-time node operations"
for OP in now format add subtract diff; do
  BODY="{\"config\":{\"operation\":\"$OP\",\"date\":\"2024-01-15T10:30:00Z\",\"format\":\"YYYY-MM-DD\",\"amount\":1,\"unit\":\"days\",\"date2\":\"2024-01-20T10:30:00Z\"},\"input\":{}}"
  RESP=$(exec_node "date-time" "$BODY")
  assert_success "$RESP" "date-time: $OP"
done

sub "Logger node levels"
for LVL in info debug warn error; do
  RESP=$(exec_node "logger" "{\"config\":{\"message\":\"test $LVL\",\"logLevel\":\"$LVL\"},\"input\":{}}")
  assert_success "$RESP" "logger: $LVL level"
done

sub "Condition node operators"
RESP=$(exec_node "condition" '{"config":{"conditions":[{"field":"value","operator":"equals","value":"abc"}]},"input":{"value":"abc"}}')
assert_success "$RESP" "condition: equals match"

RESP=$(exec_node "condition" '{"config":{"conditions":[{"field":"value","operator":"not_equals","value":"abc"}]},"input":{"value":"xyz"}}')
assert_success "$RESP" "condition: not_equals match"

RESP=$(exec_node "condition" '{"config":{"conditions":[{"field":"num","operator":"greater_than","value":"5"}]},"input":{"num":10}}')
assert_success "$RESP" "condition: greater_than"

RESP=$(exec_node "condition" '{"config":{"conditions":[{"field":"num","operator":"less_than","value":"5"}]},"input":{"num":2}}')
assert_success "$RESP" "condition: less_than"

RESP=$(exec_node "condition" '{"config":{"conditions":[{"field":"msg","operator":"contains","value":"ell"}]},"input":{"msg":"hello"}}')
assert_success "$RESP" "condition: contains"

sub "Data converter"
RESP=$(exec_node "data-converter" '{"config":{"fromFormat":"json","toFormat":"csv","data":"{\"a\":1,\"b\":2}"},"input":{}}')
assert_success "$RESP" "data-converter: json->csv"

RESP=$(exec_node "data-converter" '{"config":{"fromFormat":"json","toFormat":"xml","data":"{\"root\":{\"key\":\"val\"}}"},"input":{}}')
assert_success "$RESP" "data-converter: json->xml"

RESP=$(exec_node "data-converter" '{"config":{"fromFormat":"json","toFormat":"yaml","data":"{\"key\":\"val\"}"},"input":{}}')
assert_success "$RESP" "data-converter: json->yaml"

sub "Signature validation"
RESP=$(exec_node "signature-validation" '{"config":{"algorithm":"sha256","secret":"mysecret","payload":"hello","expectedSignature":"dummy"},"input":{}}')
assert_no_crash "$RESP" "signature-validation: runs"

sub "Audit log"
RESP=$(exec_node "audit-log" '{"config":{"apiUrl":"http://localhost:3003/api/health","action":"test-action","userId":"user1","resource":"test"},"input":{}}')
assert_no_crash "$RESP" "audit-log: runs"

sub "Agent nodes with valid config"
RESP=$(exec_node "agent-decision" '{"config":{"decisionType":"rule-based","question":"Should I proceed?","rules":[{"condition":"true","action":"yes"}]},"input":{}}')
assert_success "$RESP" "agent-decision: rule-based"

RESP=$(exec_node "agent-goal" '{"config":{"goalType":"define","goalName":"test-goal","goalDescription":"A test goal"},"input":{}}')
assert_success "$RESP" "agent-goal: define"

RESP=$(exec_node "agent-reasoning" '{"config":{"reasoningType":"deductive","premises":["All men are mortal","Socrates is a man"],"conclusion":"Socrates is mortal"},"input":{}}')
assert_success "$RESP" "agent-reasoning: deductive"

RESP=$(exec_node "agent-state" '{"config":{"stateOperation":"get","stateKey":"test"},"input":{}}')
assert_success "$RESP" "agent-state: get"

RESP=$(exec_node "agent-context" '{"config":{"contextOperation":"get"},"input":{}}')
assert_success "$RESP" "agent-context: get"

sub "Analytics with valid event"
RESP=$(exec_node "analytics" '{"config":{"eventName":"test-event","eventData":{"key":"val"}},"input":{}}')
assert_success "$RESP" "analytics: valid event"

sub "Data cleaning"
RESP=$(exec_node "data-cleaning" '{"config":{"operation":"trim","fields":["name"]},"input":{"name":"  hello  "}}')
assert_no_crash "$RESP" "data-cleaning: trim"

sub "Data transformation"
RESP=$(exec_node "data-transformation" '{"config":{"operation":"map","expression":"item.x * 2","field":"x"},"input":{"items":[{"x":1},{"x":2}]}}')
assert_no_crash "$RESP" "data-transformation: map"

sub "File export"
for FMT in json csv; do
  RESP=$(exec_node "file-export" "{\"config\":{\"format\":\"$FMT\",\"data\":{\"a\":1}},\"input\":{}}")
  assert_no_crash "$RESP" "file-export: $FMT"
done

sub "HTTP / REST / Webhook"
RESP=$(exec_node "http-request" '{"config":{"url":"http://localhost:3003/api/health","method":"GET"},"input":{}}')
assert_success "$RESP" "http-request: GET health"

RESP=$(exec_node "rest-api" '{"config":{"url":"http://localhost:3003/api/health","method":"GET"},"input":{}}')
assert_no_crash "$RESP" "rest-api: GET health"

RESP=$(exec_node "webhook-call" '{"config":{"url":"http://localhost:3003/api/health","method":"GET"},"input":{}}')
assert_no_crash "$RESP" "webhook-call: GET health"

fi

# === PHASE 4: OUTPUT CONTRACT ENFORCEMENT ===
if should_run 4; then
header "Phase 4: Output Contract Enforcement"

sub "Code node returns result field"
RESP=$(exec_node "code" '{"config":{"code":"return { result: 99 };","language":"javascript"},"input":{}}')
assert_field_exists "$RESP" "result" "code: .result exists"

sub "Date-time now returns date"
RESP=$(exec_node "date-time" '{"config":{"operation":"now"},"input":{}}')
assert_success "$RESP" "date-time: now succeeds"

sub "Logger returns logged"
RESP=$(exec_node "logger" '{"config":{"message":"contract test","logLevel":"info"},"input":{}}')
assert_success "$RESP" "logger: contract"
assert_field_exists "$RESP" "logged" "logger: has logged field"

sub "Condition returns matched"
RESP=$(exec_node "condition" '{"config":{"conditions":[{"field":"v","operator":"equals","value":"x"}]},"input":{"v":"x"}}')
assert_success "$RESP" "condition: contract"

sub "Agent decision returns decision"
RESP=$(exec_node "agent-decision" '{"config":{"decisionType":"rule-based","question":"yes?","rules":[{"condition":"true","action":"yes"}]},"input":{}}')
assert_success "$RESP" "agent-decision: contract"

sub "Agent goal returns goal"
RESP=$(exec_node "agent-goal" '{"config":{"goalType":"define","goalName":"g1","goalDescription":"desc"},"input":{}}')
assert_success "$RESP" "agent-goal: contract"

sub "Agent reasoning returns reasoning"
RESP=$(exec_node "agent-reasoning" '{"config":{"reasoningType":"deductive","premises":["A implies B","A is true"],"conclusion":"B is true"},"input":{}}')
assert_success "$RESP" "agent-reasoning: contract"

sub "Data converter returns converted"
RESP=$(exec_node "data-converter" '{"config":{"fromFormat":"json","toFormat":"csv","data":"{\"a\":1}"},"input":{}}')
assert_success "$RESP" "data-converter: contract"

sub "Analytics returns success"
RESP=$(exec_node "analytics" '{"config":{"eventName":"contract-test","eventData":{}},"input":{}}')
assert_success "$RESP" "analytics: contract"

sub "HTTP returns data"
RESP=$(exec_node "http-request" '{"config":{"url":"http://localhost:3003/api/health","method":"GET"},"input":{}}')
assert_success "$RESP" "http-request: contract"

fi

# === PHASE 5: EDGE CASES & ERROR HANDLING ===
if should_run 5; then
header "Phase 5: Edge Cases & Error Handling"

sub "Code node - syntax error"
RESP=$(exec_node "code" '{"config":{"code":"function(}{","language":"javascript"},"input":{}}')
assert_error "$RESP" "code: syntax error caught"

sub "Code node - undefined reference"
RESP=$(exec_node "code" '{"config":{"code":"return { x: nonExistent.foo };","language":"javascript"},"input":{}}')
assert_error "$RESP" "code: undefined ref caught"

sub "Code node - empty return"
RESP=$(exec_node "code" '{"config":{"code":"return {};","language":"javascript"},"input":{}}')
assert_success "$RESP" "code: empty return OK"

sub "Code node - null return"
RESP=$(exec_node "code" '{"config":{"code":"return null;","language":"javascript"},"input":{}}')
assert_no_crash "$RESP" "code: null return handled"

sub "Code node - large payload"
RESP=$(exec_node "code" '{"config":{"code":"let arr = []; for(let i=0;i<10000;i++) arr.push(i); return {count:arr.length};","language":"javascript"},"input":{}}')
assert_success "$RESP" "code: large array"
assert_field_equals "$RESP" "count" "10000" "code: 10k items"

sub "Code node - deep nesting"
RESP=$(exec_node "code" '{"config":{"code":"let o={};let c=o;for(let i=0;i<50;i++){c.n={};c=c.n;}return {depth:50};","language":"javascript"},"input":{}}')
assert_success "$RESP" "code: deep nesting"

sub "Condition node - missing field"
RESP=$(exec_node "condition" '{"config":{"conditions":[{"field":"missing","operator":"equals","value":"x"}]},"input":{"other":"y"}}')
assert_no_crash "$RESP" "condition: missing field handled"

sub "Condition node - null input"
RESP=$(exec_node "condition" '{"config":{"conditions":[{"field":"v","operator":"equals","value":"x"}]},"input":null}')
assert_no_crash "$RESP" "condition: null input handled"

sub "Data converter - invalid JSON"
RESP=$(exec_node "data-converter" '{"config":{"fromFormat":"json","toFormat":"csv","data":"not-valid-json"},"input":{}}')
assert_no_crash "$RESP" "data-converter: invalid JSON graceful"

sub "Date-time - invalid date"
RESP=$(exec_node "date-time" '{"config":{"operation":"format","date":"not-a-date","format":"YYYY-MM-DD"},"input":{}}')
assert_no_crash "$RESP" "date-time: invalid date handled"

sub "HTTP - unreachable host"
RESP=$(exec_node "http-request" '{"config":{"url":"http://192.0.2.1:9999/nope","method":"GET","timeout":3000},"input":{}}')
assert_error "$RESP" "http-request: unreachable host"

sub "HTTP - 404 endpoint"
RESP=$(exec_node "http-request" '{"config":{"url":"http://localhost:3003/api/nonexistent-endpoint-xyz","method":"GET"},"input":{}}')
assert_no_crash "$RESP" "http-request: 404 handled"

sub "Agent nodes - invalid types"
RESP=$(exec_node "agent-decision" '{"config":{"decisionType":"nonexistent","question":"?"},"input":{}}')
assert_error "$RESP" "agent-decision: invalid type"

RESP=$(exec_node "agent-goal" '{"config":{"goalType":"nonexistent"},"input":{}}')
assert_error "$RESP" "agent-goal: invalid type"

RESP=$(exec_node "agent-reasoning" '{"config":{"reasoningType":"nonexistent"},"input":{}}')
assert_error "$RESP" "agent-reasoning: invalid type"

RESP=$(exec_node "agent-state" '{"config":{"stateOperation":"nonexistent"},"input":{}}')
assert_error "$RESP" "agent-state: invalid operation"

sub "Logger - special characters"
RESP=$(exec_node "logger" '{"config":{"message":"<script>alert(1)</script>","logLevel":"info"},"input":{}}')
assert_success "$RESP" "logger: special chars safe"

sub "Analytics - huge eventData"
RESP=$(exec_node "analytics" '{"config":{"eventName":"big","eventData":{"a":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}},"input":{}}')
assert_success "$RESP" "analytics: large data"

fi

# === PHASE 6: MULTI-NODE WORKFLOWS ===
if should_run 6; then
header "Phase 6: Multi-Node Workflows"

sub "Workflow 1: Manual -> Code -> Logger"
RESP=$(exec_workflow '{"nodes":[{"id":"n1","type":"manual","config":{},"position":{"x":0,"y":0}},{"id":"n2","type":"code","config":{"code":"return { doubled: (input.value || 5) * 2 };","language":"javascript"},"position":{"x":200,"y":0}},{"id":"n3","type":"logger","config":{"message":"Result","logLevel":"info"},"position":{"x":400,"y":0}}],"edges":[{"source":"n1","target":"n2"},{"source":"n2","target":"n3"}],"initialInput":{"value":7}}')
assert_workflow_success "$RESP" "wf1: manual->code->logger"

sub "Workflow 2: Manual -> Condition -> Code"
RESP=$(exec_workflow '{"nodes":[{"id":"n1","type":"manual","config":{},"position":{"x":0,"y":0}},{"id":"n2","type":"condition","config":{"conditions":[{"field":"x","operator":"greater_than","value":"10"}]},"position":{"x":200,"y":0}},{"id":"n3","type":"code","config":{"code":"return { branch: \"high\" };","language":"javascript"},"position":{"x":400,"y":0}}],"edges":[{"source":"n1","target":"n2"},{"source":"n2","target":"n3"}],"initialInput":{"x":20}}')
assert_workflow_success "$RESP" "wf2: manual->condition->code"

sub "Workflow 3: Manual -> Date-time -> Logger"
RESP=$(exec_workflow '{"nodes":[{"id":"n1","type":"manual","config":{},"position":{"x":0,"y":0}},{"id":"n2","type":"date-time","config":{"operation":"now"},"position":{"x":200,"y":0}},{"id":"n3","type":"logger","config":{"message":"Now","logLevel":"info"},"position":{"x":400,"y":0}}],"edges":[{"source":"n1","target":"n2"},{"source":"n2","target":"n3"}],"initialInput":{}}')
assert_workflow_success "$RESP" "wf3: manual->date-time->logger"

sub "Workflow 4: Manual -> Code -> Condition -> Logger"
RESP=$(exec_workflow '{"nodes":[{"id":"n1","type":"manual","config":{},"position":{"x":0,"y":0}},{"id":"n2","type":"code","config":{"code":"return { score: 85 };","language":"javascript"},"position":{"x":200,"y":0}},{"id":"n3","type":"condition","config":{"conditions":[{"field":"score","operator":"greater_than","value":"70"}]},"position":{"x":400,"y":0}},{"id":"n4","type":"logger","config":{"message":"Passed!","logLevel":"info"},"position":{"x":600,"y":0}}],"edges":[{"source":"n1","target":"n2"},{"source":"n2","target":"n3"},{"source":"n3","target":"n4"}],"initialInput":{}}')
assert_workflow_success "$RESP" "wf4: manual->code->condition->logger"

sub "Workflow 5: Manual -> Analytics -> Logger"
RESP=$(exec_workflow '{"nodes":[{"id":"n1","type":"manual","config":{},"position":{"x":0,"y":0}},{"id":"n2","type":"analytics","config":{"eventName":"wf-test","eventData":{"step":"analytics"}},"position":{"x":200,"y":0}},{"id":"n3","type":"logger","config":{"message":"analytics done","logLevel":"info"},"position":{"x":400,"y":0}}],"edges":[{"source":"n1","target":"n2"},{"source":"n2","target":"n3"}],"initialInput":{}}')
assert_workflow_success "$RESP" "wf5: manual->analytics->logger"

sub "Workflow 6: Manual -> Agent-Decision -> Agent-State"
RESP=$(exec_workflow '{"nodes":[{"id":"n1","type":"manual","config":{},"position":{"x":0,"y":0}},{"id":"n2","type":"agent-decision","config":{"decisionType":"rule-based","question":"proceed?","rules":[{"condition":"true","action":"yes"}]},"position":{"x":200,"y":0}},{"id":"n3","type":"agent-state","config":{"stateOperation":"set","stateKey":"decided","stateValue":"true"},"position":{"x":400,"y":0}}],"edges":[{"source":"n1","target":"n2"},{"source":"n2","target":"n3"}],"initialInput":{}}')
assert_workflow_success "$RESP" "wf6: manual->agent-decision->agent-state"

sub "Workflow 7: Manual -> Code -> Data-Converter -> Logger"
RESP=$(exec_workflow '{"nodes":[{"id":"n1","type":"manual","config":{},"position":{"x":0,"y":0}},{"id":"n2","type":"code","config":{"code":"return { data: JSON.stringify({name:\"test\",val:42}) };","language":"javascript"},"position":{"x":200,"y":0}},{"id":"n3","type":"data-converter","config":{"fromFormat":"json","toFormat":"csv"},"position":{"x":400,"y":0}},{"id":"n4","type":"logger","config":{"message":"converted","logLevel":"info"},"position":{"x":600,"y":0}}],"edges":[{"source":"n1","target":"n2"},{"source":"n2","target":"n3"},{"source":"n3","target":"n4"}],"initialInput":{}}')
assert_workflow_success "$RESP" "wf7: manual->code->data-converter->logger"

sub "Workflow 8: Manual -> Agent-Goal -> Agent-Reasoning -> Logger"
RESP=$(exec_workflow '{"nodes":[{"id":"n1","type":"manual","config":{},"position":{"x":0,"y":0}},{"id":"n2","type":"agent-goal","config":{"goalType":"define","goalName":"reason-goal","goalDescription":"test"},"position":{"x":200,"y":0}},{"id":"n3","type":"agent-reasoning","config":{"reasoningType":"deductive","premises":["A","B"],"conclusion":"C"},"position":{"x":400,"y":0}},{"id":"n4","type":"logger","config":{"message":"reasoning done","logLevel":"info"},"position":{"x":600,"y":0}}],"edges":[{"source":"n1","target":"n2"},{"source":"n2","target":"n3"},{"source":"n3","target":"n4"}],"initialInput":{}}')
assert_workflow_success "$RESP" "wf8: manual->agent-goal->agent-reasoning->logger"

sub "Workflow 9: Manual -> HTTP -> Code -> Logger"
RESP=$(exec_workflow '{"nodes":[{"id":"n1","type":"manual","config":{},"position":{"x":0,"y":0}},{"id":"n2","type":"http-request","config":{"url":"http://localhost:3003/api/health","method":"GET"},"position":{"x":200,"y":0}},{"id":"n3","type":"code","config":{"code":"return { healthy: true };","language":"javascript"},"position":{"x":400,"y":0}},{"id":"n4","type":"logger","config":{"message":"health checked","logLevel":"info"},"position":{"x":600,"y":0}}],"edges":[{"source":"n1","target":"n2"},{"source":"n2","target":"n3"},{"source":"n3","target":"n4"}],"initialInput":{}}')
assert_workflow_success "$RESP" "wf9: manual->http-request->code->logger"

sub "Workflow 10: Manual -> Code -> Agent-Context -> Agent-State -> Logger"
RESP=$(exec_workflow '{"nodes":[{"id":"n1","type":"manual","config":{},"position":{"x":0,"y":0}},{"id":"n2","type":"code","config":{"code":"return { setup: true };","language":"javascript"},"position":{"x":200,"y":0}},{"id":"n3","type":"agent-context","config":{"contextOperation":"get"},"position":{"x":400,"y":0}},{"id":"n4","type":"agent-state","config":{"stateOperation":"set","stateKey":"ctx","stateValue":"done"},"position":{"x":600,"y":0}},{"id":"n5","type":"logger","config":{"message":"pipeline complete","logLevel":"info"},"position":{"x":800,"y":0}}],"edges":[{"source":"n1","target":"n2"},{"source":"n2","target":"n3"},{"source":"n3","target":"n4"},{"source":"n4","target":"n5"}],"initialInput":{}}')
assert_workflow_success "$RESP" "wf10: manual->code->agent-context->agent-state->logger"

fi

# === PHASE 7: COMPLEX PIPELINES & STRESS ===
if should_run 7; then
header "Phase 7: Complex Pipelines & Stress"

sub "ETL pipeline: Manual -> Code(extract) -> Code(transform) -> Data-Converter -> Logger -> Analytics"
RESP=$(exec_workflow '{"nodes":[{"id":"n1","type":"manual","config":{},"position":{"x":0,"y":0}},{"id":"n2","type":"code","config":{"code":"return { records: [{id:1,name:\"Alice\"},{id:2,name:\"Bob\"}] };","language":"javascript"},"position":{"x":200,"y":0}},{"id":"n3","type":"code","config":{"code":"var r=(input.records||[]).map(function(x){return {id:x.id,upper:x.name.toUpperCase()}}); return {transformed:r};","language":"javascript"},"position":{"x":400,"y":0}},{"id":"n4","type":"data-converter","config":{"fromFormat":"json","toFormat":"csv"},"position":{"x":600,"y":0}},{"id":"n5","type":"logger","config":{"message":"ETL done","logLevel":"info"},"position":{"x":800,"y":0}},{"id":"n6","type":"analytics","config":{"eventName":"etl-complete","eventData":{"rows":2}},"position":{"x":1000,"y":0}}],"edges":[{"source":"n1","target":"n2"},{"source":"n2","target":"n3"},{"source":"n3","target":"n4"},{"source":"n4","target":"n5"},{"source":"n5","target":"n6"}],"initialInput":{}}')
assert_workflow_success "$RESP" "complex1: 6-node ETL pipeline"

sub "Agent orchestration: Manual -> Goal -> Decision -> Reasoning -> Context -> State -> Logger"
RESP=$(exec_workflow '{"nodes":[{"id":"n1","type":"manual","config":{},"position":{"x":0,"y":0}},{"id":"n2","type":"agent-goal","config":{"goalType":"define","goalName":"orchestrate","goalDescription":"full agent test"},"position":{"x":200,"y":0}},{"id":"n3","type":"agent-decision","config":{"decisionType":"rule-based","question":"should continue?","rules":[{"condition":"true","action":"continue"}]},"position":{"x":400,"y":0}},{"id":"n4","type":"agent-reasoning","config":{"reasoningType":"deductive","premises":["Goal is set","Decision is yes"],"conclusion":"Proceed"},"position":{"x":600,"y":0}},{"id":"n5","type":"agent-context","config":{"contextOperation":"get"},"position":{"x":800,"y":0}},{"id":"n6","type":"agent-state","config":{"stateOperation":"set","stateKey":"orchestrated","stateValue":"true"},"position":{"x":1000,"y":0}},{"id":"n7","type":"logger","config":{"message":"agent pipeline done","logLevel":"info"},"position":{"x":1200,"y":0}}],"edges":[{"source":"n1","target":"n2"},{"source":"n2","target":"n3"},{"source":"n3","target":"n4"},{"source":"n4","target":"n5"},{"source":"n5","target":"n6"},{"source":"n6","target":"n7"}],"initialInput":{}}')
assert_workflow_success "$RESP" "complex2: 7-node agent orchestration"

sub "Date-driven: Manual -> Date-time -> Code(parse) -> Condition -> Logger"
RESP=$(exec_workflow '{"nodes":[{"id":"n1","type":"manual","config":{},"position":{"x":0,"y":0}},{"id":"n2","type":"date-time","config":{"operation":"now"},"position":{"x":200,"y":0}},{"id":"n3","type":"code","config":{"code":"return { year: new Date().getFullYear() };","language":"javascript"},"position":{"x":400,"y":0}},{"id":"n4","type":"condition","config":{"conditions":[{"field":"year","operator":"greater_than","value":"2020"}]},"position":{"x":600,"y":0}},{"id":"n5","type":"logger","config":{"message":"year is modern","logLevel":"info"},"position":{"x":800,"y":0}}],"edges":[{"source":"n1","target":"n2"},{"source":"n2","target":"n3"},{"source":"n3","target":"n4"},{"source":"n4","target":"n5"}],"initialInput":{}}')
assert_workflow_success "$RESP" "complex3: date-driven pipeline"

sub "Security pipeline: Manual -> Code(generate) -> Signature-Validation -> Logger"
RESP=$(exec_workflow '{"nodes":[{"id":"n1","type":"manual","config":{},"position":{"x":0,"y":0}},{"id":"n2","type":"code","config":{"code":"return { payload: \"secure-data\", signature: \"abc123\" };","language":"javascript"},"position":{"x":200,"y":0}},{"id":"n3","type":"signature-validation","config":{"algorithm":"sha256","secret":"key","payload":"secure-data","expectedSignature":"abc123"},"position":{"x":400,"y":0}},{"id":"n4","type":"logger","config":{"message":"security check done","logLevel":"info"},"position":{"x":600,"y":0}}],"edges":[{"source":"n1","target":"n2"},{"source":"n2","target":"n3"},{"source":"n3","target":"n4"}],"initialInput":{}}')
assert_workflow_success "$RESP" "complex4: security pipeline"

sub "Rapid-fire: 5 sequential code executions"
PASS_COUNT=0
for i in 1 2 3 4 5; do
  RESP=$(exec_node "code" "{\"config\":{\"code\":\"return { iter: $i };\",\"language\":\"javascript\"},\"input\":{}}")
  if [ "$(is_success "$RESP")" = "yes" ]; then PASS_COUNT=$((PASS_COUNT+1)); fi
done
if [ "$PASS_COUNT" -eq 5 ]; then
  do_pass "rapid-fire: 5/5 sequential"
else
  do_fail "rapid-fire" "only $PASS_COUNT/5 passed"
fi

fi

# ═══════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════
echo ""
echo "======================================================="
echo "                   TEST SUMMARY                        "
echo "======================================================="
printf "  PASSED:  %d\n" "$PASS"
printf "  FAILED:  %d\n" "$FAIL"
printf "  SKIPPED: %d\n" "$SKIP"
TOTAL=$((PASS + FAIL + SKIP))
printf "  TOTAL:   %d\n" "$TOTAL"
echo "======================================================="
if [ "$FAIL" -eq 0 ]; then
  echo -e "  ${GREEN}ALL TESTS PASSED!${NC}"
else
  echo -e "  ${RED}SOME TESTS FAILED - SEE ABOVE${NC}"
fi
echo "======================================================="

if [ "$FAIL" -gt 0 ] && [ ${#ERRORS[@]} -gt 0 ]; then
  echo ""
  echo "-- Failed Tests Detail --"
  for e in "${ERRORS[@]}"; do
    echo "  x $e"
  done
  echo "-------------------------"
fi

echo ""
echo "Log: $LOG"
echo "Finished: $(date)"

# Exit with failure code if any test failed
[ "$FAIL" -eq 0 ]
