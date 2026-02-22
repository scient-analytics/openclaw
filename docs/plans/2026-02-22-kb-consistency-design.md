# KB Consistency & Enhancement — Design Document

**Date:** 2026-02-22
**Status:** Approved

## Problem

Michael's concurrent sessions create duplicate docs in Outline. When multiple people message Michael simultaneously, each session writes to the KB independently, resulting in duplicates (e.g., 3x `Person: Sarah`, 2x `Project: Binance Futures`). Additionally, docs created from third-party mentions lack cross-referencing.

## Approach: Heartbeat-Only (Approach A)

Prevention at write-time + periodic cleanup via heartbeat. No sub-agents, no webhook-triggered cleanup, no cascade risk.

### Prevention (SOUL.md changes)

1. **Search before EVERY write** — even in batch. Each `outline_write` must be preceded by its own `outline_search`.
2. **Canonical casing enforced** — `Person: Sarah`, not `Person: sarah`.
3. **Third-party stubs** — When someone mentions a person Michael hasn't spoken to, create a stub marked `[unverified — reported by {source}]`. Concurrent sessions find the stub and update it instead of creating a new doc.

### Cleanup (HEARTBEAT.md changes)

Every 30-minute heartbeat includes a KB maintenance pass:

1. **Dedup scan** — List docs in high-risk collections (organization, projects). Find title matches modulo casing. Merge duplicates (keep older, append unique info, delete newer).
2. **Cross-reference pass** — Verify person↔project↔source links. Update Knowledge Gaps with missing connections.
3. **Naming audit** — Verify all titles follow canonical patterns. Fix violations.

### Webhook (unchanged)

Outline webhooks with `ignoreActorId` filter — only fires for human edits. System events queued for next heartbeat. No self-triggered loops.

## Why Not Sub-Agents or Webhook-Triggered Cleanup

- **Sub-agent (Approach B):** Overkill at current scale (5-person team). Adds complexity without proportional benefit.
- **Webhook + debounce (Approach C):** Cascade risk, hard to test locally, fragile timing logic. Solving a problem that doesn't exist yet.
- **Upgrade path:** The heartbeat maintenance logic transfers directly to a sub-agent prompt if scale demands it later.

## Files Changed

- `~/.openclaw/workspace/SOUL.md` — Added rules 5 (third-party stubs) and strengthened rule 2 (search before every write)
- `~/.openclaw/workspace/HEARTBEAT.md` — Replaced KB Hygiene with detailed KB Maintenance pass (dedup, cross-reference, naming audit)
- `extensions/michael/index.ts` — Webhook `onEvent` enqueues system events (already done)
- `extensions/michael/src/webhook.ts` — `ignoreActorId` filter (already done)
- `extensions/michael/src/outline-client.ts` — `getAuthInfo()` method (already done)
