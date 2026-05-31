# Supermarket Management System

Full-stack supermarket management app with:

- React + Tailwind frontend
- Node.js + Express API
- PostgreSQL via Prisma
- JWT auth in httpOnly cookies
- POS, inventory, reports, customers, and access control

## Setup

1. Copy `.env.example` to `.env` and update secrets and database URL.
2. Install dependencies: `npm install`
3. Generate Prisma client: `npm run prisma:generate`
4. Create the database migration: `npm run prisma:migrate -- --name init`
5. Seed demo data: `npm run prisma:seed`
6. Start development: `npm run dev`

## Default demo accounts

- Admin: `admin@store.com` / `Password123!`
- Cashier: `cashier@store.com` / `Password123!`
- Stock manager: `stock@store.com` / `Password123!`
