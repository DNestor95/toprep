# toprep
# Sales Dashboard App (eLeads)

A multi-user sales dashboard for a dealership. Tracks:
- Leaderboards (Units + Gross)
- MTD KPI dashboard
- Deal pipeline (stages)
- Activity tracking
- CSV import / audit trail (optional phase)

Built with **Next.js (App Router)** + **Supabase (Postgres/Auth/RLS)**.

---

## Features (MVP)
- ✅ Multi-user authentication (Supabase Auth)
- ✅ Role-based access:
  - `sales_rep`: can only see their own deals/activities/financials
  - `manager` / `admin`: can see all data
- ✅ Leaderboard (MTD by default)
- ✅ Database schema designed for eLeads exports + future API integration

---

## Tech Stack
- Next.js (TypeScript, App Router)
- Tailwind CSS
- Supabase (Postgres + Auth + RLS)
- Recharts (charts)

---

## Project Structure (recommended)
/app
/login
/dashboard
/leaderboard
/pipeline
/imports
/api
/components
/lib
/supabase
client.ts
server.ts
/supabase
schema.sql
seed.sql
middleware.ts


---

## Prerequisites
- Node.js 18+ (or 20+)
- A Supabase project

---

## Setup

### 1) Create the Next.js app
```bash
npx create-next-app@latest sales-dashboard --ts --app
cd sales-dashboard

npm i @supabase/supabase-js @supabase/ssr recharts

NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY