# $1 Only

Exactly one dollar. Nothing more.

A single-page site for a locked **$1.50** payment that resolves to a clean **~$1** after Stripe fees. The glowing `$1` is the logo, the button, and the pin on a living Earth. No tips. No higher amounts. No editable fields.

You pay $1.50 → I receive a clean ~$1. The extra only covers processing fees so the $1 experiment stays pure.

## Stack

- React + Vite + TypeScript + Tailwind CSS
- Framer Motion
- Three.js holographic Earth (`src/globe`) — dark metallic sphere, fresnel atmosphere, surface ripples, `$1` pins. Unused countries stay dark.
- Express locally, Vercel serverless in production
- Supabase for persistence + Realtime (optional in-memory store for local demo)
- Stripe Checkout with **server-side locked amount** and **webhook signature verification**

Secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) are never prefixed with `VITE_` and never shipped to the browser.

## 1. Local development

```bash
cp .env.example .env
npm install
npm run dev
```

- Site: `http://localhost:5173`
- API: `http://127.0.0.1:8787`

With `ENABLE_DEMO=true` and `VITE_ENABLE_DEMO=true` (the defaults in `.env.example`), click the glowing `$1` and use **Witness the globe (demo)** to light a country without Stripe.

## 2. Stripe product set to exactly $1.50

This project does **not** use a Dashboard price id, so nobody can swap the amount from the client.

The server creates a Checkout Session with a single locked line item:

- `STRIPE_CHARGE_AMOUNT_CENTS=150`
- `STRIPE_CURRENCY=usd`
- `adjustable_quantity` is off
- promotion codes are off
- billing address is required (country only is stored)

Dashboard checklist:

1. Create a Stripe account and switch to test mode.
2. [Developers → API keys](https://dashboard.stripe.com/apikeys) → copy the **Secret key** into `STRIPE_SECRET_KEY`.
3. Do **not** put the secret key in any `VITE_` variable.
4. Optional: create a Product named `$1 Only` for your own bookkeeping. The live charge still comes from `STRIPE_CHARGE_AMOUNT_CENTS`, not from that product, unless you later change the code to use a Price id.

Test card: `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP.

## 3. Webhook setup with signature verification

Local:

```bash
stripe listen --forward-to localhost:8787/api/webhook
```

Paste the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET`.

Production (Vercel):

1. Deploy the site (see §6).
2. Stripe Dashboard → Developers → Webhooks → Add endpoint.
3. URL: `https://YOUR_DOMAIN/api/webhook`
4. Event: `checkout.session.completed`
5. Copy the signing secret into Vercel env `STRIPE_WEBHOOK_SECRET`.

The handler:

- reads the **raw** body
- calls `stripe.webhooks.constructEvent`
- rejects a missing/invalid `Stripe-Signature`
- rejects any session whose `amount_total` is not `STRIPE_CHARGE_AMOUNT_CENTS`
- stores only country, timestamp, `stripe` method, and a soul hash
- never writes name, email, or card data

## 4. Adding UPI QR and UPI ID

Set these (browser-visible on purpose — they are your payee identity, not secrets):

```
VITE_UPI_ID=yourname@upi
VITE_UPI_NAME=$1 Only
VITE_UPI_AMOUNT_INR=     # optional; leave empty to encode ID only
```

The India button appears when `VITE_UPI_ID` is set. The QR is generated from a `upi://pay?...` payload. There is no amount text field.

After the donor pays, they confirm and choose a country so the globe can update. This path is honor-system (UPI does not give this stack a signed webhook). Rate limit: 3 confirms / hour / IP.

Optional: set `UPI_CONFIRM_TOKEN` on the server if you later add a private confirm flow.

## 5. Supabase live data setup

1. Create a Supabase project.
2. SQL Editor → run `supabase/schema.sql`.
3. Settings → API:
   - Project URL → `VITE_SUPABASE_URL` and `SUPABASE_URL`
   - `anon` `public` key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server only)
4. Confirm **Replication / Realtime** includes `live_signals` (the SQL file adds it to `supabase_realtime`).

What is stored:

| Column | Purpose |
| --- | --- |
| `country_code` | Pin location |
| `created_at` | Time of the $1 |
| `payment_method` | `stripe` / `upi` / `demo` |
| `receipt_hash` | Public soul receipt id |

`receipt_index.stripe_session_id` is **not** readable by the anon key. It exists only so the success page can recover a receipt.

Without Supabase, the local API keeps signals in memory so the globe still works until the process restarts.

Firebase is not required. If you prefer Firebase later, mirror the same four public fields on a `live_signals` collection and swap `server/lib/store.ts` plus `src/hooks/useLiveSignals.ts`.

## 6. Deployment (Vercel recommended)

```bash
npm i -g vercel
vercel
```

Environment variables on Vercel (Production + Preview):

```
FRONTEND_URL=https://your-domain.vercel.app
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CHARGE_AMOUNT_CENTS=150
STRIPE_CURRENCY=usd
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_PAY_AMOUNT=1.50
VITE_NET_AMOUNT=1
VITE_UPI_ID=...
VITE_UPI_NAME=$1 Only
ENABLE_DEMO=false
VITE_ENABLE_DEMO=false
NODE_ENV=production
```

Vercel provides HTTPS. Set `FRONTEND_URL` to the exact `https://` origin so CORS stays locked.

After deploy:

1. Attach the Stripe webhook to `https://YOUR_DOMAIN/api/webhook`
2. Run a test $1.50 Checkout
3. Confirm a pin appears for the billing country
4. Confirm `/api/health` returns `{ ok: true, brand: "$1 Only" }`

## 7. How to change the charged amount later

The amount is **not** editable in the UI. To change it in the future:

1. Update `STRIPE_CHARGE_AMOUNT_CENTS` (example: `200` for $2.00).
2. Update `VITE_PAY_AMOUNT` to the same decimal (`2.00`) so the buttons stay honest.
3. If the net you receive changes, set `NET_AMOUNT` (server) and `VITE_NET_AMOUNT`.
4. Redeploy. Old Checkout links die with the old deployment; new sessions use the new cents value.
5. The webhook **rejects** any session whose `amount_total` does not match the current env, so leftover test sessions cannot write a pin.

The brand name stays **$1 Only** unless you deliberately change copy. The fee sentence on the site is generated from those env values.

## Privacy and security

- Public write path: none. Only the server inserts.
- Rate limits on every public route.
- CORS allowlist via `FRONTEND_URL`.
- Stripe signature verification is mandatory.
- Charge amount is enforced again in the webhook.
- No personal data in Supabase public rows.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite + API together |
| `npm run build` | Typecheck + production bundle |
| `npm run preview` | Serve the built site |
| `npm start` | API only |

## License

Private experiment. $1 Only.
