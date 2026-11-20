# KRP Dry Fruits

A responsive Next.js storefront and shop-owner dashboard. The customer journey is an order enquiry because real prices and delivery rules still need to be supplied. Customer enquiries, products, stock, order status, and verified ratings are stored in Supabase when configured.

## What's included

- Five supplied product photos and sample catalog entries, with placeholder 250 g packs and prices on request.
- Search, category filters, a persistent basket, and an order-enquiry form.
- An owner dashboard at `/admin` with pending orders, order status changes, stock counts, and product editing.
- Admin sign-in through Supabase Auth; access is restricted to `ADMIN_EMAILS`.
- Customer ratings tied to a delivered order number and the phone number on that order.
- A clearly marked preview mode when Supabase is not connected. Preview orders and edits remain in that browser only; they are not sent to the shop.

## Run locally

1. Install Node.js 20.9 or newer.
2. In this folder, run `npm install` and then `npm run dev`.
3. Open `http://localhost:3000`.

The preview mode is useful for reviewing the interface, but it is not a live store. Do not take real customer enquiries until Supabase is connected and configured.

## Connect Supabase

1. Create a Supabase project and copy `.env.example` to `.env.local`.
2. In `.env.local`, set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, a server-only `SUPABASE_SERVICE_ROLE_KEY`, and your mom's real email in `ADMIN_EMAILS`.
3. Open Supabase **SQL Editor** and run [`supabase/migrations/202611200001_initial_store.sql`](supabase/migrations/202611200001_initial_store.sql). It creates tables, Row Level Security policies, stock handling, an order RPC, and the sample products.
4. In Supabase **Authentication → Users**, create/invite the owner account. Self-service sign-up is not used.
5. Restart `npm run dev`, place a test order, then sign in at `/admin` and check that it appears as pending.

Keep the service role key private. Add it only to `.env.local` for local work and to the Vercel project's server environment variables when ready. Never prefix it with `NEXT_PUBLIC_` or put it in browser code. The publishable key is intended for browser-visible code; the SQL policies limit what it can read.

## Before accepting real orders

- Replace sample stock counts, pack sizes, descriptions, and photos with confirmed shop details. Add real prices when available; a blank price remains “Price on request.”
- Set the real owner email and create the Supabase Auth account.
- Test order placement, stock confirmation/cancellation, status updates, product changes, and ratings using test records.
- Add a production email/WhatsApp notification provider, rate limiting/bot protection, backups, and the shop's delivery, returns, privacy, and payment terms.
- This version collects enquiries; it does not take card/UPI payments. Add a payment provider only after the business account and settlement details are ready.

## Publish through GitHub and Vercel

You can publish this folder by connecting its GitHub repository to Vercel. You do not need to run the site on your own computer to deploy it.

1. Before uploading, create a Supabase project and run the migration above. Create the owner's Supabase Auth user and decide the final `ADMIN_EMAILS` value.
2. Push the **contents of this project folder** to your GitHub repository. Keep `package.json`, `package-lock.json`, `app/`, `components/`, `lib/`, `public/`, and `supabase/` at the repository root. `.gitignore` excludes `.env.local`, dependencies, and build output; do not force-add secret files.
3. In Vercel, choose **Add New → Project**, import that GitHub repository, and keep the detected **Next.js** framework, root directory `./`, build command `npm run build`, and output setting at its default. Vercel installs dependencies from `package-lock.json` and builds the live site.
4. In the Vercel project's **Settings → Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `ADMIN_EMAILS` using the values from Supabase. Add them to Production (and Preview if you intend to use preview deployments). Never expose the service role key with a `NEXT_PUBLIC_` prefix.
5. Deploy. After the first deployment, open `/admin/login`, sign in with the invited owner account, place a small test enquiry, and confirm it appears in the dashboard. Re-deploy after any environment variable changes.

The root directory is the folder containing this README and `package.json`. No GitHub push, Supabase project, or Vercel deployment has been performed from this workspace.
