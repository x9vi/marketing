# Supermarket Management System

Full-stack supermarket management app with:

- React + Tailwind frontend
- Node.js + Express API
- SQLite via Prisma
- JWT auth in httpOnly cookies
- POS, inventory, reports, customers, and access control

## Setup

1. Copy `.env.example` to `.env` and update the SQLite path or admin bootstrap credentials if needed.
2. Install dependencies: `npm install`
3. Generate Prisma client: `npm run prisma:generate`
4. Create the local SQLite schema and first admin: `npm run prisma:seed`
5. Start development: `npm run dev`
