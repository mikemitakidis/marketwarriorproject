# Market Warrior Challenge

This repository contains a simplified implementation of the Market
Warrior 5‑day trading challenge.  It is designed to be deployed on
Vercel with a Supabase backend and Stripe for payments.  The focus is
on security: users cannot read course content or quiz answers
directly, all progress is managed on the server, and row level
security (RLS) policies protect sensitive tables.

## Features

* **Next.js Frontend** – Static pages for the landing page, welcome,
  terms, dashboard and admin panel; dynamic route for each day;
  integrated trading journal accessible via email link.
* **Supabase Backend** – SQL schema defines tables for user
  profiles, progress tracking, course content, quizzes, quiz
  results, tasks, payments and trading journal with appropriate RLS
  policies.  An SQL script (`sql/SUPABASE_SECURITY_SCHEMA.sql`) is
  provided to initialise a fresh Supabase project.
* **Secure API Routes** – All course content and progress logic is
  implemented in serverless functions under `pages/api`.  Clients
  cannot access the raw tables directly; instead they call these
  endpoints which use the Supabase service role key to enforce
  entitlements.
* **Stripe Payments** – `/api/checkout/stripe` creates a checkout
  session for the course price, and `/api/webhooks/stripe` listens
  for completed sessions to grant access.  Price IDs are validated
  against environment variables.
* **Trading Journal** – A standalone journal accessible via
  `/free-journal` that requires email registration.  Entries are
  stored in `public.trading_journal` with RLS ensuring only the
  author can view them.

## Setup

1. **Create a new Supabase project.**  In the Supabase UI, generate a
   project and note the `Project URL`, `anon` key and `service role`
   key.
2. **Run the SQL schema.**  Use the SQL editor to run
   `sql/SUPABASE_SECURITY_SCHEMA.sql`.  This will create the tables
   and policies.  You may also insert sample course content and quiz
   questions manually or via additional scripts.
3. **Configure environment variables.**  Copy `.env.example` to
   `.env.local` and replace the placeholders with your Supabase
   project URL, API keys, Stripe keys and Resend key (if used).
4. **Deploy to Vercel.**  Push this repository to a GitHub repo and
   connect it to Vercel.  Set the environment variables in the
   project settings.  Vercel will automatically build the Next.js app
   and expose the API routes.
5. **Set up Stripe product and webhook.**  Create a product and price
   in Stripe for the course and add the price ID to your env vars.
   Configure a webhook endpoint in Stripe pointing to
   `/api/webhooks/stripe` and copy the webhook secret into your env.

## Notes

* **Authentication** – This implementation assumes that Next.js pages
  are protected by Supabase Auth.  In your production app you should
  integrate the Supabase auth client to manage login, sign up and
  email magic links.  The API routes expect a `user_id` header for
  demonstration; replace this with JWT verification.
* **Admin Panel** – The admin page and API route are placeholders
  illustrating how to query user profiles.  Extend them with full
  CRUD operations for course content, announcements and user
  management.
* **Course Content** – The `course_content` table is empty by
  default.  Insert your HTML templates, video URLs and task prompts
  via the Supabase editor or a migration script.  The `/api/day/[day]`
  endpoint will expose them to the frontend.

For more detailed requirements and design guidelines, refer to the
handoff documents supplied with this project.