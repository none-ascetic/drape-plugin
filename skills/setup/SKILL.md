---
name: setup
description: First-time setup — configure your brand, wholesale platform, and API credentials. Run this once after installing the drape plugin.
allowed-tools: Write, WebFetch, Read
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

## Step 5 — API credentials (NuOrder only)

If they selected NuOrder, ask for:
- Consumer Key
- Consumer Secret
- OAuth Token
- OAuth Token Secret

Tell them where to find these: NuOrder account → Settings → API → OAuth Credentials.

Ask if they want read-only mode enabled (recommended to start — prevents accidental writes).

## Step 6 — Additional context

Ask one open question:
"Anything else I should know about your business? For example: key buyers or accounts, trade show calendar, seasonal deadlines, main product categories."

## Step 7 — Write config files

### Write `${CLAUDE_SKILL_DIR}/../../context/brand.md`

Use the Write tool to create this file. Populate it with what you learned:

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

### Write `${CLAUDE_SKILL_DIR}/../../mcp-server/.env`

Only write this if NuOrder credentials were provided:

```
NUORDER_CONSUMER_KEY={value}
NUORDER_CONSUMER_SECRET={value}
NUORDER_TOKEN={value}
NUORDER_TOKEN_SECRET={value}
NUORDER_DOMAIN=wholesale.nuorder.com
NUORDER_READ_ONLY={true or false}
```

## Step 8 — Confirm

Tell the user:
- ✓ Brand context saved to `context/brand.md`
- ✓ Credentials saved to `mcp-server/.env` (if applicable)
- These files are gitignored and won't be committed

Then suggest: "Try `/drape:order-summary` to see your daily briefing, or just ask me anything about your orders or buyers."
