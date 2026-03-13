---
name: order-summary
description: Daily briefing of NuOrder order activity — new orders, status breakdown, and items needing attention.
---

Produce a daily order summary for Steph. Follow these steps in order:

## Step 1 — Fetch order data

Call `nuorder_list_orders` for each of these statuses in parallel (or sequentially if parallel is not available):
- `pending` — orders awaiting approval
- `approved` — orders approved but not yet shipped
- `shipped` — orders that have been fulfilled and dispatched

Also call `nuorder_list_orders` with no status filter to get a recent sample of all orders (limit 50) for spotting new activity.

If any tool call fails or times out, note the failure but continue with the data you have. Degrade gracefully — a partial summary is better than no summary.

## Step 2 — Identify new orders

From the unfiltered list, flag orders created or updated since the last business day:
- Today is a weekday → "last business day" = yesterday
- Today is Monday → "last business day" = Friday
- Use the `created_at` or `updated_at` field to determine recency

## Step 3 — Format the briefing

Output a concise briefing using this structure:

```
## Daily Order Summary — {date}

### New Since Last Business Day
• {order_number} — {company_name} — {currency}{total} — Status: {status}
(or "No new orders since {last business day}" if none)

### Orders by Status
| Status     | Count |
|------------|-------|
| Pending    | N     |
| Approved   | N     |
| Shipped    | N     |

### Needs Attention
• {order_number} — {reason} (e.g. "pending >3 days", "missing ship date", "high value >£10,000")

### API Notes
(Only include if any tool calls failed or returned no data)
⚠ Could not fetch {status} orders: {error message}
```

**Formatting rules:**
- Keep each line brief — one order per bullet, no paragraph text
- Flag orders that are: pending for more than 3 days, missing ship/cancel dates, or have a total above £10,000
- If all statuses returned zero results, state clearly: "No orders found — NuOrder may be empty or the API may be unavailable"
- Do not repeat the same order in multiple sections

## Step 4 — Offer next steps

After the summary, offer one or two natural follow-up actions, e.g.:
- "Want me to get full details on any of these orders?"
- "I can list pending orders older than 3 days if you'd like to review them for approval."
