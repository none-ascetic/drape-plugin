---
name: order-summary
description: Daily briefing of wholesale order activity — new orders, status breakdown, and items needing attention.
---

Produce a daily order summary. Follow these steps in order:

## Step 1 — Fetch order data

Call `drape_list_orders` for each of these statuses in parallel (or sequentially if parallel is not available):
- `pending` — orders awaiting approval
- `approved` — orders approved but not yet shipped
- `shipped` — orders that have been fulfilled and dispatched

If any tool call fails or times out, note the failure but continue with the data you have. Degrade gracefully — a partial summary is better than no summary.

## Step 2 — Identify new orders

From all fetched orders, flag orders created or modified since the last business day:
- Today is a weekday → "last business day" = yesterday
- Today is Monday → "last business day" = Friday
- Use the `created=` or `modified=` field from each order line to determine recency (format: YYYY-MM-DD)

## Step 3 — Format the briefing

Output a concise briefing using this structure:

```
## Daily Order Summary — {date}

### New / Modified Since Last Business Day
• {order_number} — {company} — {total} — Status: {status} — Modified: {modified}
(or "No new orders since {last business day}" if none)

### Orders by Status
| Status     | Count |
|------------|-------|
| Pending    | N     |
| Approved   | N     |
| Shipped    | N     |

### Needs Attention
• {order_number} — {reason} (e.g. "pending, created >3 days ago", "missing ship window", "high value >£10,000")

### API Notes
(Only include if any tool calls failed or returned no data)
⚠ Could not fetch {status} orders: {error message}
```

**Formatting rules:**
- Keep each line brief — one order per bullet, no paragraph text
- The `company=` field contains the retailer name from NuOrder
- Flag orders that are: pending with `created=` date more than 3 days ago, missing ship window (`ship=—`), or have a total above 10,000
- If all statuses returned zero results, state clearly: "No orders found — the API may be unavailable or your platform may have no orders yet"
- Do not repeat the same order in multiple sections

## Step 4 — Offer next steps

After the summary, offer one or two natural follow-up actions, e.g.:
- "Want me to get full details on any of these orders?"
- "I can list pending orders older than 3 days if you'd like to review them for approval."
