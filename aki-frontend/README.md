# AKI Frontend (Vite + React)

## Setup
1. Copy env (opsional):
   - PowerShell: `Copy-Item .env.example .env`
   - Bash: `cp .env.example .env`
2. Install + run:
   - `npm install`
   - `npm run dev`

## Env
- `VITE_API_URL=/api` akan memakai proxy dev Vite ke backend `http://localhost:5050` (lihat `vite.config.js`).
- Kalau backend beda host/port, set misalnya: `VITE_API_URL=http://localhost:5050/api`
