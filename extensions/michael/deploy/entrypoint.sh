#!/bin/sh
set -e

CONFIG_DIR="/home/node/.openclaw"
CONFIG_FILE="${CONFIG_DIR}/openclaw.json"
TEMPLATE="/app/extensions/michael/deploy/openclaw.json.tpl"

# Create config and workspace directories
mkdir -p "$CONFIG_DIR"
WORKSPACE_DIR="${CONFIG_DIR}/workspace"
mkdir -p "$WORKSPACE_DIR"

# Copy workspace bootstrap files (SOUL.md, etc.) into the agent workspace
cp -n /app/extensions/michael/workspace/* "$WORKSPACE_DIR/" 2>/dev/null || true

# Set defaults for optional variables (envsubst doesn't handle ${VAR:-default} syntax)
export AZURE_BOT_APP_ID="${AZURE_BOT_APP_ID:-}"
export AZURE_BOT_APP_SECRET="${AZURE_BOT_APP_SECRET:-}"
export TEAMS_CHANNEL_ID="${TEAMS_CHANNEL_ID:-}"
export MICHAEL_ALLOW_DM="${MICHAEL_ALLOW_DM:-}"
export MICHAEL_BLOCK_DM="${MICHAEL_BLOCK_DM:-}"
export MICHAEL_MAX_DM_PER_DAY="${MICHAEL_MAX_DM_PER_DAY:-1}"
export TIMEZONE="${TIMEZONE:-Europe/Paris}"
export MICHAEL_NOTIFY_CHANNEL="${MICHAEL_NOTIFY_CHANNEL:-msteams}"
export OPENCLAW_ALLOWED_ORIGIN="${OPENCLAW_ALLOWED_ORIGIN:-https://openclaw.scient.io}"
export MICHAEL_MODEL="${MICHAEL_MODEL:-openai/gpt-4o}"

# Expand environment variables in template -> final config
envsubst < "$TEMPLATE" > "$CONFIG_FILE"

echo "Config written to ${CONFIG_FILE}"

# Exec the gateway (replaces this shell process)
exec node openclaw.mjs gateway --allow-unconfigured --bind lan
