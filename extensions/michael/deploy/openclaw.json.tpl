{
  "gateway": {
    "controlUi": {
      "allowedOrigins": ["${OPENCLAW_ALLOWED_ORIGIN}"]
    }
  },
  "channels": {
    "msteams": {
      "appId": "${AZURE_BOT_APP_ID}",
      "appPassword": "${AZURE_BOT_APP_SECRET}"
    }
  },
  "plugins": {
    "entries": {
      "michael": {
        "enabled": true,
        "config": {
          "outlineApiUrl": "${OUTLINE_API_URL}",
          "outlineApiKey": "${OUTLINE_API_KEY}",
          "outlineWebhookSecret": "${OUTLINE_WEBHOOK_SECRET}",
          "notify": {
            "teamChannelId": "${TEAMS_CHANNEL_ID}",
            "allowDm": [${MICHAEL_ALLOW_DM}],
            "blockDm": [${MICHAEL_BLOCK_DM}],
            "maxDmPerPersonPerDay": ${MICHAEL_MAX_DM_PER_DAY}
          }
        }
      }
    }
  },
  "agents": {
    "list": [{
      "id": "michael",
      "model": "${MICHAEL_MODEL}",
      "tools": { "alsoAllow": ["outline_search", "outline_read", "outline_write", "outline_update", "outline_list", "michael_notify"] },
      "heartbeat": {
        "every": "30m",
        "activeHours": { "start": "08:00", "end": "22:00", "timezone": "${TIMEZONE}" },
        "target": "${MICHAEL_NOTIFY_CHANNEL}",
        "to": "${TEAMS_CHANNEL_ID}",
        "prompt": "You are Michael, the team coordinator. Check your SKILL.md instructions. Review pending system events, workstreams, stale projects, OKRs. If nothing needs attention, reply HEARTBEAT_OK."
      }
    }]
  }
}
