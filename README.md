# DREAMOPS — headset inventory & production tracker

An update to the existing React / Tailwind / Vercel app, built around DreamPark’s real eBay-to-dispatch process. Example records are synthetic and clearly labeled. No real eBay, Meta, payment, or carrier service is called.

## Run and verify

```sh
npm install
npm run dev
npm test
npm run build
```

## Daily workflow

1. **Headsets → Register headsets:** register arrivals with an asset ID, eBay seller/reference, and assigned team member. Multiple units get unique asset IDs. Arrivals start untested. To register existing finished stock, select the verified-ready option and add a verification note; fitted materials are not deducted a second time.
2. **Production:** move an arrival into a single In production stage. Expand the headset checklist to record individual tasks if interrupted, or use Complete production to confirm the entire preparation session together. This verifies function testing, factory reset, a fresh Meta account, DreamPark installation, printed vinyl branding, glued button covers, and silicone facepad / final inspection. Completion preflights remaining materials, deducts them once, records the operator and time, and adds the headset to dispatch-ready stock. Failed units go on repair/return hold. Clearing a hold requires retesting. Do not store Meta credentials in tracker notes.
3. **Materials:** maintain physical counts, reorder thresholds, suppliers, and planned lead times. Completing branding / covers / facepad steps consumes loose material. Reopening a physical step does not restore used stock.
4. **Print / prepare:** turn blank vinyl into printed branding sets, print instruction manuals, or cut grommets into cover sets. Finished vinyl and manuals are made in-house and have no supplier lead time; their alerts request printing, not purchasing. Paper/ink are not tracked. Blank vinyl is still a purchased raw material. Demo assumption: one half-grommet per headset cover set. Confirm the actual bill of materials with the team before production use.
5. **Purchases:** log eBay headset purchases or consumables, expected lead time, and editable ETA. Receiving headsets creates untested assets; receiving consumables adds usable material stock. Receipt is idempotent.
6. **Orders & deliveries:** all active headsets are Meta Quest 3. Choose Individual (1 headset, $75/month), Family (4 headsets, $200/month), or Business ($75/headset/month). Monthly totals calculate automatically and the selected rate is saved on the order. Taxes/shipping are not calculated. Confirm the first month's payment in Payments. Reserve only fully completed, unreserved headsets. Allocation requires the entire order; no partial reservations. Release reservations when needed. Existing Quest 3S records are archived inside exported backups and excluded from active workflows; original historical amounts are not silently repriced.
7. **Pack & ship:** record carrier, tracking, ship date, and transit estimate. Confirm an instruction manual with its printed QR code and a thank-you letter are packed. One manual and one letter are deducted per shipment, not per headset. The QR code is part of the manual, not a separate stock item or print task. Old standalone QR quantities are preserved in exported history without increasing the manual count. Mark actual delivery separately; an ETA never counts as confirmed arrival.
8. **Overview:** see dispatch-ready units, work in production, stock alerts, overdue purchases, missing delivery confirmations, and recent activity. The operations assistant calculates supported answers locally; it is not an OpenAI API integration.

## Persistence and team sharing

Without Supabase configuration, data is saved in the current browser under `dreamops-production-v5`. **Sharing a URL does not share browser-local records.** The header and Team & data view explicitly show this mode. Older `dreamops-v2` and `dreamops-v3` records are preserved; export them from Team & data if needed. They are not converted into finished headsets because the prior app did not track production readiness.

To activate a single shared team workspace:

1. In Supabase SQL Editor, run `supabase/team-workspace.sql` (additive migration; old tables are untouched). The migration inserts synthetic examples only if no shared workspace exists. Replace these examples with actual records before operational use.
2. Invite your team in Supabase Authentication and have members establish their passwords. Add every permitted user to `dreamops_members` using the SQL example at the bottom of the migration. Merely creating an Auth account does not grant workspace access.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env.example` to Vercel. These are public client settings; never put a service-role or OpenAI secret into a `VITE_` variable.
4. Deploy the existing Vercel project with `npx vercel --prod --yes`. Team members sign in using their invited email and password. Shared data refreshes every 15 seconds; saves use a database revision check so concurrent edits cannot silently overwrite each other. The person whose save conflicts reloads the latest data and repeats their action.

The shared path is implemented but needs a Supabase project and credentials to activate. The operational rules run client-side in this small-team prototype; the database restricts access to members. This is not a tamper-proof or regulated audit system.

## Deployment

```sh
npm run build
npx vercel --prod --yes
```

Reuse the existing `.vercel` project association. `work/`, `outputs/`, local environment files, and `node_modules/` are excluded from Vercel source uploads. Do not deploy backups containing real customer data as static assets.

## Alerts and dates

Dates use America/Los_Angeles. Supply alerts trigger at or below the configured threshold; planned lead time and the next inbound ETA appear alongside them. eBay delivery estimates do not automatically reopen customer availability: new units must still pass production. Transit estimates are entered manually in calendar days. Alerts are in-app; no email or Slack notifications are sent.
