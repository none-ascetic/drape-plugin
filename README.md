# Drape

A Claude Co-Work plugin for wholesale operations. Connects your B2B platform to Claude — natural-language access to orders, buyers, products, and catalogs.

## Prerequisites

- [Claude Co-Work](https://claude.ai) with a Max plan
- [Bun](https://bun.sh) — the MCP server runs on Bun (`curl -fsSL https://bun.sh/install | bash`)

## Install

In Claude Co-Work:

```
/plugin marketplace add none-ascetic/drape-plugin
/plugin install drape@drape
```

## First-time setup

After installing, run:

```
/drape:setup
```

Setup will:
1. Ask for your name, role, and brand
2. Fetch your website to understand your business
3. Ask which wholesale platform you use
4. Collect your API credentials
5. Write two local config files (never committed to git):
   - `context/brand.md` — your brand context, loaded every session
   - `mcp-server/.env` — your API credentials

## Skills

| Skill | Description |
|---|---|
| `/drape:setup` | First-time onboarding — run once after install |
| `/drape:order-summary` | Daily briefing — new orders, status counts, items needing attention |

## How it works

Drape runs a local MCP server that connects to your wholesale platform via OAuth. Your credentials stay on your machine in a gitignored `.env` file. Brand context is stored in a local `context/brand.md` file and injected into every session automatically — no need to re-explain your business each time.

## Customising brand context

After setup, edit `context/brand.md` directly to update or extend your brand context. Changes take effect in the next Co-Work session.

## Credentials

Credentials are stored in `mcp-server/.env` (gitignored). To update them, edit the file directly or re-run `/drape:setup`.

Find your OAuth credentials in your wholesale platform's API or developer settings.

## Security

- **Credentials stay local.** Your `.env` file is never committed to git, never read aloud in chat, and never sent to Anthropic. It is only used by the local MCP server process on your machine.
- **Read-only by default.** Setup enables read-only mode automatically. This prevents any accidental writes to your live platform data. Disable it only when you need write operations.
- **Restrict file permissions.** Setup runs `chmod 600 mcp-server/.env` automatically. If you create the file manually, do the same.
- **Don't paste credentials into chat.** Anything typed in a conversation appears in your session history. Setup guides you to write credentials directly to the file instead.
- **Rotate if compromised.** If you suspect your credentials have been exposed, rotate them immediately in your platform's API settings, then update your `.env`.
