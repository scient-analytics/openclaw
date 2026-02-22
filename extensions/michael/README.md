# Michael

Outline wiki KB + coordinator agent for OpenClaw. Michael manages a structured knowledge base on your Outline instance, tracks team progress across workstreams, and proactively surfaces connections, stale projects, and OKR risks.

## Prerequisites

- An [Outline](https://www.getoutline.com/) instance (self-hosted or cloud)
- An Outline API key with read/write access
- (Optional) An Outline webhook signing secret, if you want real-time document event handling

## Installation

The plugin is distributed as `@openclaw/michael`. Add it to your OpenClaw workspace and reference it in your config:

```bash
npm install @openclaw/michael
```

## Configuration

Add the plugin to your OpenClaw config. The `outlineApiUrl` and `outlineApiKey` fields are required; `outlineWebhookSecret` is optional.

```json5
{
  plugins: {
    entries: {
      michael: {
        config: {
          outlineApiUrl: "https://outline.example.com/api",
          outlineApiKey: "${OUTLINE_API_KEY}",
          outlineWebhookSecret: "${OUTLINE_WEBHOOK_SECRET}"
        }
      }
    }
  },
  agents: {
    list: [{
      id: "michael",
      tools: { alsoAllow: ["outline_search", "outline_read", "outline_write", "outline_update", "outline_list"] },
      heartbeat: {
        every: "30m",
        activeHours: { start: "08:00", end: "22:00", timezone: "Europe/Paris" }
      }
    }]
  },
  cron: {
    jobs: [{
      id: "michael-daily-digest",
      schedule: "0 18 * * 1-5",
      agentId: "michael",
      prompt: "Generate the daily digest. Search all workstreams, check OKR status, write synthesis to digest collection, post summary to the team."
    }]
  }
}
```

## Outline Webhook Setup

To enable real-time reactions to document changes:

1. Go to **Outline Settings > Webhooks**
2. Add a new webhook pointing to `https://your-gateway/outline-webhook`
3. Select the document events you want to subscribe to (create, update, delete)
4. Copy the signing secret into your config as `outlineWebhookSecret`

The plugin verifies each incoming payload with HMAC-SHA256 using the signing secret. Without this configuration, Michael still works -- it just won't react to document changes in real time.

## Available Tools

| Tool | Description |
|------|-------------|
| `outline_search` | Search the knowledge base. Optionally scope to a single collection. Returns titles and snippets. |
| `outline_read` | Read a document by ID. Returns full title and markdown content. |
| `outline_write` | Create a new document in a collection. |
| `outline_update` | Update an existing document. Supports `replace` (default) and `append` modes. |
| `outline_list` | List all documents in a collection. Returns titles and IDs. |

## KB Collections

On first startup the plugin creates these collections in Outline (or reuses them if they already exist):

| Key | Name | Purpose |
|-----|------|---------|
| `organization` | Organization | Company info, team members, decisions |
| `okrs` | OKRs | Objectives and key results, roadmap |
| `brain` | Brain | Agent learnings, open questions, follow-ups |
| `projects` | Projects | Active projects, backlog, completed work |
| `sources` | Sources | External sources to watch (repos, docs, sites) |
| `workstreams` | Workstreams | Per-person session summaries and work logs |
| `digest` | Digest | Daily/weekly synthesis of team activity |
