---
name: setup
description: First-time setup — configure your brand, wholesale platform, and API credentials. Run this once after installing the drape plugin.
allowed-tools: Write, WebFetch, Read, Bash
---

You are guiding a new user through first-time setup of the Drape wholesale operations plugin. Be warm, concise, and conversational. Ask one topic at a time.

## Step 1 — Introduce yourself

Tell the user:
- Setup takes 2–3 minutes
- It creates two local config files that are never committed to git:
  - `context/brand.md` — your brand context, loaded automatically every session
  - `mcp-server/.env` — your API credentials, used to connect to your wholesale platform

## Step 2 — User info

Ask for:
1. Their name and role (e.g. "Head of Wholesale", "Sales Manager")
2. Their brand/company name
3. Their company website URL

## Step 3 — Web discovery

Use WebFetch to fetch their homepage and, if it exists, their /about page.

Look for:
- What the brand sells (category, aesthetic, price point)
- Any mention of wholesale, stockists, or trade
- Key markets or regions
- Brand voice/tone

Summarise what you found in 3–5 bullet points and confirm with the user. Ask if anything is wrong or missing.

## Step 4 — Platform selection

Ask which wholesale platform they use:
- **NuOrder** — fully supported in this version
- **JOOR** — not yet supported (tools won't connect, but brand context still saves)
- **Brandboom** — not yet supported
- **Other** — not yet supported

If they choose anything other than NuOrder, be honest: "The API tools won't connect to [platform] yet, but I'll save your brand context so I can help with research and planning."

## Step 5 — API credentials

Ask the user for their four NuOrder API credentials. You can ask for all four in one message:

- **Consumer Key** (`NUORDER_CONSUMER_KEY`)
- **Consumer Secret** (`NUORDER_CONSUMER_SECRET`)
- **Token** (`NUORDER_TOKEN`)
- **Token Secret** (`NUORDER_TOKEN_SECRET`)

Tell them where to find these: NuOrder → Settings → API / Developer Settings. If they're unsure, suggest they contact their NuOrder account manager.

Once you have all four values, use the Write tool to create the credentials file at:
`${CLAUDE_SKILL_DIR}/../../mcp-server/.env`

Write exactly this content (substituting their actual values):
```
# NuOrder API credentials — do not share or commit this file
NUORDER_CONSUMER_KEY=<their_value>
NUORDER_CONSUMER_SECRET=<their_value>
NUORDER_TOKEN=<their_value>
NUORDER_TOKEN_SECRET=<their_value>
NUORDER_DOMAIN=wholesale.nuorder.com
NUORDER_READ_ONLY=true
```

After writing, restrict the file permissions:
```bash
chmod 600 "${CLAUDE_SKILL_DIR}/../../mcp-server/.env"
```

**Read-only mode:** Mention that `NUORDER_READ_ONLY=true` prevents any accidental writes to their live platform data. They can change it to `false` later when ready for write operations.

If the Write tool fails (e.g. read-only filesystem), fall back to showing the user the exact file path and template to create manually. But automatic creation is the primary path.

## Step 6 — Additional context

Ask one open question:
"Anything else I should know about your business? For example: key buyers or accounts, trade show calendar, seasonal deadlines, main product categories."

## Step 7 — Write config files

### Write `${CLAUDE_SKILL_DIR}/../../context/brand.md`

First, ensure the directory exists:
```bash
mkdir -p "${CLAUDE_SKILL_DIR}/../../context"
```

Then use the Write tool to create the file at `${CLAUDE_SKILL_DIR}/../../context/brand.md`. Populate it with what you learned:

```
# Brand Context

**User:** {name} — {role}
**Brand:** {brand_name}
**Website:** {website}
**Platform:** {platform}

## About {brand_name}

{3–5 sentence summary from web discovery, confirmed by user}

## Additional Context

{anything from step 6, or "None provided." if nothing given}
```

### `mcp-server/.env`

This file was written in Step 5. Do not read or display its contents. Confirm it exists with Read and that `chmod 600` was applied.

## Step 8 — Confirm

Tell the user:
- ✓ Brand context saved to `context/brand.md`
- ✓ Credentials saved to `mcp-server/.env` (if applicable)
- These files are gitignored and won't be committed

Then suggest: "Try `/drape:order-summary` to see your daily briefing, or just ask me anything about your orders or buyers."

## Security reminders (surface these during setup)

- Credentials are stored only on this machine and are never sent to Anthropic or any third party beyond your wholesale platform.
- The `.env` file is gitignored — it will never be committed if you version-control this directory.
- Do not share your `.env` file or paste its contents into chat, emails, or tickets.
- Read-only mode is on by default. Only disable it when you need write operations and understand the implications.
- If you suspect your credentials have been compromised, rotate them immediately in your platform's API settings.
