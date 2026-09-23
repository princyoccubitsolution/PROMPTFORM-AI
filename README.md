# PromptForm AI Enterprise SaaS Platform

PromptForm AI is an advanced full-stack AI-powered Form Builder SaaS Platform. It provides dynamic prompt-based form generation, visual drag-and-drop building, custom styles/designer, logic path routing, workflow automations, teamwork permissions, and real-time proctored analytical dashboards.

---

## Technical Architecture Stack

*   **Frontend client**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Zustand, Framer Motion
*   **Backend server**: Node.js + Express.js, TypeScript, REST API, Prisma ORM, Redis (cache), JWT auth, Multer (local uploads)
*   **Database**: PostgreSQL with JSONB columns for dynamic layouts, logic, theme styling, and analytics datasets

---

## Repository Structure

```text
promptform-ai/                # Workspace Root
├── backend/              # Node.js + Express.js + Prisma API Server
│   ├── src/              # Controllers, routes, auth middlewares, AI engine
│   ├── prisma/           # Schema & seed migrations
│   └── package.json
├── frontend/             # Next.js 15 + React 19 + Tailwind Client
│   ├── src/              # App Router, self-contained custom components, Zustand store
│   └── package.json
├── docker-compose.yml    # Docker services config for PostgreSQL and Redis
├── package.json          # Root npm workspaces config
└── README.md             # Platform documentation
```

---

## Local Setup & Launch Instructions

### 1. Prerequisites
Make sure you have Node.js (v18+) and Docker Desktop installed.

### 2. Launch Services (PostgreSQL & Redis)
Spin up the local database and cache servers via Docker:
```bash
docker-compose up -d
```

### 3. Setup Backend Environment
Create a `.env` file in the `backend/` folder (default template exists):
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/promptform_ai?schema=public"
PORT=5000
JWT_SECRET="promptform_jwt_secret_token_key_123!#%"
JWT_REFRESH_SECRET="promptform_jwt_refresh_secret_token_key_456!#%"
REDIS_URL="redis://localhost:6379"
```

### 4. Install Dependencies
Run npm install at the monorepo root to trigger concurrent workspaces resolution:
```bash
npm install
```

### 5. Run Database Migrations & Seeding
Prepare your database tables and seed starter templates and default accounts:
```bash
# Generate Prisma Client
npm run prisma:generate

# Execute Migrations
npm run prisma:migrate

# Seed Default Accounts & Templates
npm run prisma:seed
```

### 6. Start Development Servers
Run the backend and frontend dev servers concurrently:
```bash
# Start Express Server (Runs on port 5000)
npm run dev:backend

# Start Next.js App Client (Runs on port 3000)
npm run dev:frontend
```

---

## Default Seed Accounts
You can log in out of the box using these demo accounts:

1.  **Standard Pro User**:
    *   **Email**: `user@promptform.ai`
    *   **Password**: `password123`
2.  **Enterprise System Admin**:
    *   **Email**: `admin@promptform.ai`
    *   **Password**: `password123`
