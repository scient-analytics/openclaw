import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";

interface NotifyConfig {
  /** Messaging channel (msteams, telegram, etc.) */
  channel: string;
  /** Channel ID for team-wide posts */
  teamChannelId: string;
  /** User IDs Michael is allowed to DM (empty = nobody) */
  allowDm: string[];
  /** User IDs Michael must never DM (overrides allowDm) */
  blockDm: string[];
  /** Max proactive DMs per person per day (default: 1) */
  maxDmPerPersonPerDay: number;
  /** Gateway port for internal delivery */
  gatewayPort: number;
  /** Hooks token for auth */
  hooksToken?: string;
}

/** Track DMs sent today: userId -> count */
const dmCounts = new Map<string, { count: number; date: string }>();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function checkRateLimit(userId: string, max: number): boolean {
  const entry = dmCounts.get(userId);
  const d = today();
  if (!entry || entry.date !== d) {
    return true; // new day or first DM
  }
  return entry.count < max;
}

function recordDm(userId: string): void {
  const d = today();
  const entry = dmCounts.get(userId);
  if (!entry || entry.date !== d) {
    dmCounts.set(userId, { count: 1, date: d });
  } else {
    entry.count++;
  }
}

function json(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    details: data,
  };
}

export function registerNotifyTool(api: OpenClawPluginApi, cfg: NotifyConfig) {
  api.registerTool({
    name: "michael_notify",
    label: "Send Notification",
    description: `Send a message to the team channel or DM a specific person.
For team posts, use target "channel".
For DMs, use target set to the person's user ID.
Current channel: ${cfg.channel}.
Allowed DM targets: ${cfg.allowDm.length > 0 ? cfg.allowDm.join(", ") : "(none configured)"}`,
    parameters: Type.Object({
      target: Type.String({
        description:
          'Who to message: "channel" for the team channel, or a user ID for a direct message',
      }),
      message: Type.String({ description: "The message text to send" }),
    }),
    async execute(_id, params) {
      const p = params as { target: string; message: string };
      const target = p.target.trim().toLowerCase();

      // Determine delivery target
      let to: string;

      if (target === "channel" || target === "team") {
        // Post to team channel — always allowed
        to = `conversation:${cfg.teamChannelId}`;
      } else {
        // DM to a specific person — enforce allowlist, blocklist, rate limit
        const userId = p.target.trim();

        if (cfg.blockDm.includes(userId)) {
          return json({ error: "blocked", detail: "This person is on the block list." });
        }

        if (cfg.allowDm.length > 0 && !cfg.allowDm.includes(userId)) {
          return json({
            error: "not_allowed",
            detail: `DM not allowed. Allowed targets: ${cfg.allowDm.join(", ")}`,
          });
        }

        if (!checkRateLimit(userId, cfg.maxDmPerPersonPerDay)) {
          return json({
            error: "rate_limited",
            detail: `Already sent ${cfg.maxDmPerPersonPerDay} DM(s) to this person today.`,
          });
        }

        to = `user:${userId}`;
      }

      // Deliver via gateway internal endpoint
      try {
        const res = await fetch(`http://127.0.0.1:${cfg.gatewayPort}/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(cfg.hooksToken ? { Authorization: `Bearer ${cfg.hooksToken}` } : {}),
          },
          body: JSON.stringify({
            to,
            message: p.message,
            channel: cfg.channel,
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          return json({ error: "delivery_failed", status: res.status, detail: text });
        }

        // Record DM for rate limiting (only for DMs, not channel posts)
        if (!to.startsWith("conversation:")) {
          recordDm(p.target.trim());
        }

        const result = await res.json();
        return json({ sent: true, to, result });
      } catch (err) {
        return json({ error: "delivery_error", detail: err instanceof Error ? err.message : String(err) });
      }
    },
  });
}
