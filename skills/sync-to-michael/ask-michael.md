---
description: Ask Michael a question about the team, projects, or KB
argument-hint: <your question>
allowed-tools: Bash
---

# Ask Michael

Ask Michael (team coordinator) a question. He'll search his knowledge base and respond.

## Required Environment Variables

- `MICHAEL_URL` — OpenClaw gateway URL (e.g., `http://localhost:18789`)
- `MICHAEL_TOKEN` — Hooks auth token
- `MICHAEL_NAME` — Your display name (e.g., `Sarah`)

## Instructions

1. **Check config.** Verify all three env vars are set. If any is missing, tell the user which ones to set and stop.

2. **Check question.** The user's question is in `$ARGUMENTS`. If empty, ask: "What do you want to ask Michael?"

3. **Send question.** Build the JSON payload safely using python and POST it:

   ```bash
   python3 -c "
   import json, os
   name = os.environ['MICHAEL_NAME']
   payload = {
       'message': '''$ARGUMENTS''',
       'sessionKey': f'person:{name.lower()}',
       'name': name,
       'deliver': True
   }
   with open('/tmp/michael-ask.json', 'w') as f:
       json.dump(payload, f)
   "

   curl -s -X POST "$MICHAEL_URL/hooks/agent" \
     -H "Authorization: Bearer $MICHAEL_TOKEN" \
     -H "Content-Type: application/json" \
     -d @/tmp/michael-ask.json
   ```

4. **Wait for Michael to process.** The gateway returns immediately with a `runId`. Michael processes asynchronously. Wait 30-45 seconds, then poll for the response:

   ```bash
   python3 -c "
   import json, os, glob, time

   sessions_path = os.path.expanduser('~/.openclaw/agents/michael/sessions')
   name = os.environ['MICHAEL_NAME'].lower()
   session_key = f'agent:michael:person:{name}'

   with open(f'{sessions_path}/sessions.json') as f:
       sessions = json.load(f)

   sid = sessions.get(session_key, {}).get('sessionId', '')
   if not sid:
       print('No session found for', name)
       exit(1)

   with open(f'{sessions_path}/{sid}.jsonl') as f:
       lines = f.readlines()

   # Find the last assistant text response
   for line in reversed(lines):
       rec = json.loads(line)
       if rec.get('type') == 'message':
           msg = rec.get('message', {})
           if msg.get('role') == 'assistant':
               for item in msg.get('content', []):
                   if isinstance(item, dict) and item.get('type') == 'text':
                       text = item['text']
                       if text.startswith('[[reply_to_current]]'):
                           text = text[len('[[reply_to_current]]'):].strip()
                       print(text)
                       exit(0)
   print('No response yet — Michael may still be processing.')
   "
   ```

5. **Display.** Show Michael's response to the user. If he hasn't responded yet, tell the user to try again in a moment.

## Important

- The gateway is async — the HTTP response just confirms receipt, not Michael's answer
- Michael's response appears in his session transcript after processing (typically 15-45 seconds)
- The question goes into Michael's session for this person — he has full conversation history
- Keep questions specific for better answers
