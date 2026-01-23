#!/bin/bash
# Ralph Wiggum - Long-running AI agent loop
# Usage: ./ralph.sh [--agent agent|codex] [--model MODEL] [--profile PROFILE] [--debug] [max_iterations]

set -e

# Parse arguments
AGENT="agent"
MODEL="auto"
MAX_ITERATIONS=10
DEBUG=false
PROFILE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --agent)
      AGENT="$2"
      shift 2
      ;;
    --model)
      MODEL="$2"
      shift 2
      ;;
    --profile)
      PROFILE="$2"
      shift 2
      ;;
    --debug)
      DEBUG=true
      shift
      ;;
    *)
      if [[ "$1" =~ ^[0-9]+$ ]]; then
        MAX_ITERATIONS="$1"
      fi
      shift
      ;;
  esac
done

# Debug logging function
debug_log() {
  if [ "$DEBUG" = true ]; then
    echo "[DEBUG] $1" >&2
  fi
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
debug_log "SCRIPT_DIR: $SCRIPT_DIR"

# Resolve agent command
case "$AGENT" in
  agent|codex)
    if [ "$AGENT" = "codex" ]; then
      AGENT_CMD=("codex" "exec")
    else
      AGENT_CMD=("agent")
    fi
    ;;
  *)
    echo "Unknown agent: $AGENT (expected 'agent' or 'codex')" >&2
    exit 2
    ;;
esac

# Resolve codex profile
if [ "$AGENT" = "codex" ] && [ -z "$PROFILE" ] && [ -n "$CODEX_PROFILE" ]; then
  PROFILE="$CODEX_PROFILE"
fi
if [ "$AGENT" = "codex" ] && [ -z "$PROFILE" ]; then
  echo "codex requires a profile; pass --profile <name> or set CODEX_PROFILE" >&2
  exit 2
fi

# Change to project root (parent of ralph directory)
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
debug_log "PROJECT_ROOT: $PROJECT_ROOT"
cd "$PROJECT_ROOT"
debug_log "Changed to PROJECT_ROOT: $(pwd)"

PRD_FILE="$SCRIPT_DIR/prd.json"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"
ARCHIVE_DIR="$SCRIPT_DIR/archive"
LAST_BRANCH_FILE="$SCRIPT_DIR/.last-branch"

debug_log "PRD_FILE: $PRD_FILE"
debug_log "PROGRESS_FILE: $PROGRESS_FILE"
debug_log "ARCHIVE_DIR: $ARCHIVE_DIR"
debug_log "LAST_BRANCH_FILE: $LAST_BRANCH_FILE"

if [ "$DEBUG" = true ]; then
  if [ -f "$PRD_FILE" ]; then
    debug_log "PRD_FILE exists: $(ls -lh "$PRD_FILE")"
  else
    debug_log "PRD_FILE does not exist"
  fi
fi

# Archive previous run if branch changed
debug_log "Checking for branch change and archiving..."
if [ -f "$PRD_FILE" ] && [ -f "$LAST_BRANCH_FILE" ]; then
  debug_log "Both PRD_FILE and LAST_BRANCH_FILE exist, checking branches..."
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  LAST_BRANCH=$(cat "$LAST_BRANCH_FILE" 2>/dev/null || echo "")
  debug_log "CURRENT_BRANCH: $CURRENT_BRANCH"
  debug_log "LAST_BRANCH: $LAST_BRANCH"
  
  if [ -n "$CURRENT_BRANCH" ] && [ -n "$LAST_BRANCH" ] && [ "$CURRENT_BRANCH" != "$LAST_BRANCH" ]; then
    debug_log "Branch changed, archiving previous run..."
    # Archive the previous run
    DATE=$(date +%Y-%m-%d)
    # Strip "ralph/" prefix from branch name for folder
    FOLDER_NAME=$(echo "$LAST_BRANCH" | sed 's|^ralph/||')
    ARCHIVE_FOLDER="$ARCHIVE_DIR/$DATE-$FOLDER_NAME"
    debug_log "ARCHIVE_FOLDER: $ARCHIVE_FOLDER"
    
    echo "Archiving previous run: $LAST_BRANCH"
    mkdir -p "$ARCHIVE_FOLDER"
    [ -f "$PRD_FILE" ] && cp "$PRD_FILE" "$ARCHIVE_FOLDER/" && debug_log "Copied PRD_FILE to archive"
    [ -f "$PROGRESS_FILE" ] && cp "$PROGRESS_FILE" "$ARCHIVE_FOLDER/" && debug_log "Copied PROGRESS_FILE to archive"
    echo "   Archived to: $ARCHIVE_FOLDER"
    
    # Reset progress file for new run
    debug_log "Resetting PROGRESS_FILE for new run"
    echo "# Ralph Progress Log" > "$PROGRESS_FILE"
    echo "Started: $(date)" >> "$PROGRESS_FILE"
    echo "---" >> "$PROGRESS_FILE"
  else
    debug_log "No branch change detected, skipping archive"
  fi
else
  debug_log "Skipping archive check (PRD_FILE or LAST_BRANCH_FILE missing)"
fi

# Track current branch
debug_log "Tracking current branch..."
if [ -f "$PRD_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  debug_log "Read CURRENT_BRANCH from PRD_FILE: $CURRENT_BRANCH"
  if [ -n "$CURRENT_BRANCH" ]; then
    echo "$CURRENT_BRANCH" > "$LAST_BRANCH_FILE"
    debug_log "Wrote CURRENT_BRANCH to LAST_BRANCH_FILE: $LAST_BRANCH_FILE"
  fi
else
  debug_log "PRD_FILE not found, skipping branch tracking"
fi

# Initialize progress file if it doesn't exist
debug_log "Checking PROGRESS_FILE..."
if [ ! -f "$PROGRESS_FILE" ]; then
  debug_log "PROGRESS_FILE does not exist, initializing..."
  echo "# Ralph Progress Log" > "$PROGRESS_FILE"
  echo "Started: $(date)" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
else
  debug_log "PROGRESS_FILE exists: $(ls -lh "$PROGRESS_FILE")"
fi

debug_log "Configuration: AGENT=$AGENT, MODEL=$MODEL, MAX_ITERATIONS=$MAX_ITERATIONS, DEBUG=$DEBUG"
echo "Starting Ralph - Agent: $AGENT, Model: $MODEL, Max iterations: $MAX_ITERATIONS"

for i in $(seq 1 $MAX_ITERATIONS); do
  echo ""
  echo "═══════════════════════════════════════════════════════"
  echo "  Ralph Iteration $i of $MAX_ITERATIONS"
  echo "═══════════════════════════════════════════════════════"
  
  debug_log "=== Starting iteration $i ==="
  debug_log "Using PRD_FILE: $PRD_FILE"
  debug_log "Using PROGRESS_FILE: $PROGRESS_FILE"
  debug_log "Using PROMPT_FILE: $SCRIPT_DIR/prompt.md"
  
  # Run agent with the ralph prompt
  # Read prompt file and pass as argument (agent CLI expects prompt as argument, not stdin)
  PROMPT=$(cat "$SCRIPT_DIR/prompt.md")
  debug_log "Read prompt from: $SCRIPT_DIR/prompt.md"
  if [ "$AGENT" = "codex" ]; then
    AGENT_ARGS=()
    if [ "$MODEL" != "auto" ]; then
      AGENT_ARGS+=(--model "$MODEL")
    fi
    AGENT_ARGS+=(--profile "$PROFILE")
    debug_log "Running agent command: ${AGENT_CMD[*]} ${AGENT_ARGS[*]} [PROMPT]"
    OUTPUT=$("${AGENT_CMD[@]}" "${AGENT_ARGS[@]}" "$PROMPT" 2>&1 | tee /dev/stderr) || true
  else
    AGENT_ARGS=(-p --model "$MODEL" --output-format text --force)
    debug_log "Running agent command: ${AGENT_CMD[*]} ${AGENT_ARGS[*]} [PROMPT]"
    OUTPUT=$("${AGENT_CMD[@]}" "${AGENT_ARGS[@]}" "$PROMPT" 2>&1 | tee /dev/stderr) || true
  fi
  
  debug_log "Agent command completed"
  
  # Check for completion signal, but verify PRD is actually complete
  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    debug_log "Completion signal detected in output"
    if jq -e 'all(.userStories[]; .passes == true)' "$PRD_FILE" >/dev/null 2>&1; then
      echo ""
      echo "Ralph completed all tasks!"
      echo "Completed at iteration $i of $MAX_ITERATIONS"
      exit 0
    else
      echo "Completion signal received but PRD has incomplete stories; continuing."
      debug_log "PRD not complete; ignoring completion signal"
    fi
  fi
  
  debug_log "No completion signal, continuing to next iteration"
  echo "Iteration $i complete. Continuing..."
  sleep 2
done

debug_log "Reached max iterations without completion"
echo ""
echo "Ralph reached max iterations ($MAX_ITERATIONS) without completing all tasks."
echo "Check $PROGRESS_FILE for status."
debug_log "Final PRD_FILE used: $PRD_FILE"
debug_log "Final PROGRESS_FILE: $PROGRESS_FILE"
exit 1
