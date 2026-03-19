#!/bin/bash
# OctoAlly Claude Code Hook — fires on every tool use
# Install by adding to ~/.claude/settings.json hooks

OCTOALLY_URL="${OCTOALLY_URL:-${HIVECOMMAND_URL:-http://localhost:42010}}"

# Send event to OctoAlly (fire and forget, don't block Claude)
curl -s -X POST "$OCTOALLY_URL/api/events" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"tool_use\",
    \"tool_name\": \"$TOOL_NAME\",
    \"session_id\": \"$SESSION_ID\",
    \"data\": {
      \"tool\": \"$TOOL_NAME\",
      \"session\": \"$SESSION_ID\",
      \"file_path\": \"$TOOL_INPUT_file_path\",
      \"command\": \"$TOOL_INPUT_command\"
    }
  }" > /dev/null 2>&1 &
