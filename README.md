# FinReminder

Personal finance reminder for bills and budgets across the USA (USD) and India (INR).

- **Web app**: Angular 22 (also the Android app via Capacitor WebView)
- **API**: Python FastAPI + SQLAlchemy
- **DB**: PostgreSQL 16
- **Deploy**: Docker Compose on the Hostinger KVM VPS, Caddy for HTTPS

## Features

- Recurring bills: credit cards, loans/EMIs, utilities, rent to pay, rent to receive, subscriptions, insurance
- Missed-payment and due-soon tracking with a notifications feed
- Income tracking: salary and other deposits (USD & INR)
- Monthly budget per currency with a "low budget" warning threshold and over-budget alerts
- Credit health: utilization %, 12-month on-time payment ratio, credit-score tips

## Run with Docker (production)

```bash
cp .env.example .env      # fill in real values
docker compose up -d --build
```

- On the VPS the existing **Traefik** routes `app.narukullapati.com` → `web` (labels in docker-compose.yml) and issues the Let's Encrypt cert itself.
- Locally the web app is on http://localhost:8080 (bound to localhost only).
- The admin login is created from `ADMIN_EMAIL` / `ADMIN_PASSWORD` on first start.

## Local development

Backend (uses SQLite if `DATABASE_URL` points to sqlite):

```bash
cd backend
python -m venv .venv && .venv/Scripts/activate   # or source .venv/bin/activate
pip install -r requirements.txt
DATABASE_URL=sqlite:///./dev.db uvicorn app.main:app --reload --port 8000
```

Frontend (needs the API on :8000 — run through the Caddy container or set a proxy):

```bash
cd frontend
npm install
npx ng serve        # http://localhost:4200
```

For dev, point `api.service.ts`'s `base` at `http://localhost:8000/api` or add an
`ng serve` proxy config.

## Android app

The Android app loads the deployed site (`capacitor.config.ts → server.url`).

```bash
cd frontend
npm run build
npx cap sync
npx cap open android   # opens Android Studio → build/run the APK
```

## Deploy to the VPS

```bash
./deploy.sh            # ssh root@srv1076274.hstgr.cloud, syncs to /opt/finreminder
```

Requires SSH access to the VPS and a `.env` file present on the server
(deploy.sh syncs it — keep it out of git).
