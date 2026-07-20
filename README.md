# Namma Bazar — Database Schema Migrations

Implements the approved backend architecture (see `namma-bazar-backend-architecture.md` and
`namma-bazar-architecture-addendum-v1.1.md`) as a set of ordered Supabase/Postgres migrations.

**Scope of this migration set, per your instruction:** database schema only —
tables, types, relationships, indexes, triggers, functions, and Row Level
Security policies. **No frontend files were touched.** No PayU Edge
Function, no Auth Hook *activation*, no Storage bucket creation via the
dashboard — those steps are noted inline where relevant but are configuration
or application-code tasks for their respective roadmap phases (2, 3, 8), not
SQL schema.

## How to apply

Using the Supabase CLI, from your project root:

```
supabase migration new <name>   # not needed — files are already named/ordered
```

Copy the 14 files in `migrations/` into your project's `supabase/migrations/`
directory (they're already prefixed `0001`–`0014` for correct ordering) and run:

```
supabase db push
```

or apply them in order through the SQL Editor in the Supabase Dashboard if
you're not using the CLI — same 14 files, same order, 0001 through 0014.

## What's in each file

| File | Domain | Roadmap phase |
|---|---|---|
| `0001_extensions_and_shared.sql` | Extensions (PostGIS, pg_trgm, pgcrypto), the `set_updated_at()` trigger reused everywhere | Phase 1 |
| `0002_identity_and_geography.sql` | `profiles`, `user_roles`, `otp_verifications`, `cities`, `service_zones`, `platform_settings` | Phase 1 / 2 |
| `0003_storage_buckets.sql` | All 9 storage buckets + public-bucket read policies | Phase 3 |
| `0004_store_module.sql` | `stores`, `store_staff`, `store_documents`, `store_bank_details`, the `is_store_staff()`/`is_admin()` RLS helpers, the JWT custom-claims hook function, deferred storage write policies | Phase 4 |
| `0005_catalog_and_variants.sql` | `categories` (seeded with your 17 categories), `brands`, `products`, the full variant layer (`product_options`, `product_option_values`, `product_variants`, `product_variant_option_values`), `product_images`, `inventory`, `stock_movements` | Phase 5 |
| `0006_cart_and_orders.sql` | `carts`, `cart_items`, `orders`, `order_items`, `order_status_history` + auto-logging trigger | Phase 6 |
| `0007_customers.sql` | `customer_addresses`, `wishlists` | Phase 7 |
| `0008_payments.sql` | `payment_transactions`, `refunds`, gateway-independent `orders.payment_status` sync | Phase 8 |
| `0009_notifications_and_messaging.sql` | `notifications`, `push_tokens`, `conversations`, `messages` + event-driven notification triggers | Phase 9 |
| `0010_delivery.sql` | `delivery_partners`, `delivery_partner_documents`, `delivery_assignments`, `delivery_tracking` + assignment-sync trigger | Phase 10 |
| `0011_admin.sql` | `admin_actions`, `commission_rules` | Phase 11 |
| `0012_reviews.sql` | `reviews`, `review_replies`, `review_reports` + rating-aggregate triggers | Phase 12 |
| `0013_marketing.sql` | `coupons`, `coupon_redemptions`, `advertisements`, `ad_events` | Phase 13 |
| `0014_wallet_and_payouts.sql` | `wallets`, `wallet_transactions`, `payouts` + settlement/payout/refund triggers | Phase 14 |

**49 tables, 33 enum types, full RLS on every single table (verified —
zero exceptions), 5 intentionally-deferred foreign keys** (a table needed a
column before its target table existed a few files later — e.g.
`stores.category_id` is added in 0004 but its FK constraint attaches in
0005 once `categories` exists). All five are documented inline at both ends.

## Design decisions carried over from the addendum

- **Variants from day one**: every product has ≥1 `product_variants` row.
  The current `seller-add-product.html` page will create exactly one
  product + one default variant per submission, using the fields already
  on that page — nothing about how that page behaves changes.
- **Gateway-independent payments**: `orders.payment_status` is a derived
  summary, kept in sync by a trigger off `payment_transactions`. No PayU-
  specific column exists anywhere outside `payment_transactions.provider`
  and `.raw_response`.
- **Email-first, SMS-ready**: `otp_verifications.channel` is an enum with
  both values already defined; switching priority later is a config change
  in whatever calls this table, not a migration.
- **Delivery radius reconciliation**: `stores.delivery_radius_km` (seller-set)
  + `platform_settings['max_delivery_radius_km']` (operator ceiling, seeded
  to 10 km) — application code applying `LEAST()` of the two at checkout
  time is a Phase 6/10 concern, not schema.
- **Delivery assignment history**: `delivery_assignments` tracks the full
  offer → accept/reject/timeout lifecycle; `orders.delivery_partner_id`
  stays a fast, trigger-maintained pointer to whichever assignment is
  currently accepted.

## What is explicitly NOT included here (by design, not oversight)

- **No frontend changes.** Nothing in `index.html`, `stores.html`,
  `register.html`, `seller-login.html`, `seller-dashboard.html`, or
  `seller-add-product.html` was touched.
- **No PayU Edge Function.** The schema is ready for it (`payment_transactions`,
  the sync trigger); the actual gateway integration is server-side
  application code, not SQL — Phase 8 implementation work.
- **No Auth Hook activation.** `custom_access_token_hook()` is created as
  a function in `0004`, but *registering* it as your project's active
  Custom Access Token hook is a one-time step in Supabase Dashboard →
  Authentication → Hooks, outside what a SQL migration can do.
- **No commission-on-settlement calculation.** `0014` settles the *gross*
  order amount to the seller's wallet on payment capture; deducting the
  platform commission (via `commission_rules`) is flagged in a code
  comment as Edge Function business logic to build alongside the PayU
  webhook handler, since apportioning commission across a multi-category
  order needs a real decision, not a guessed formula baked into a trigger.
- **No scheduled jobs.** The "advertisement expiring" notification and
  `delivery_tracking` retention cleanup are both noted inline as future
  `pg_cron` / external-scheduler tasks — they depend on tables that exist
  only by migration 0013, and scheduling infrastructure is an operational
  setup step, not part of the table schema itself.
- **No seed/demo data** beyond the 17-category reference list and the one
  `platform_settings` row — no fake stores/products/orders were inserted.

## Verification performed before delivery

Since no live Postgres instance is connected in this environment, I
couldn't run these migrations directly. Instead, every file was checked
programmatically for:
- Balanced `$$` function-body delimiters and parentheses (all 14 files clean)
- No `CREATE TABLE` forward-referencing a table defined in a later file
  (all 5 intentionally-deferred FKs verified correctly placed)
- Every table has RLS enabled (49/49) and either an explicit policy set or
  a deliberate zero-policy deny-all (only `otp_verifications` and
  `platform_settings`, both intentional — service-role-only tables)
- No duplicate table, type, or function definitions
- Three real trigger bugs caught and fixed during this process, where a
  function referenced `OLD` in a code path that can run during an INSERT
  (when `OLD` doesn't exist in Postgres) — all three now branch cleanly
  on `TG_OP` instead

I'd still recommend running `supabase db push` against a scratch/staging
project before production, the same way you'd want any migration set
verified — static review catches structural bugs, not everything a real
Postgres planner might surface.
