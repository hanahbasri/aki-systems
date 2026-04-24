# AKI System (Frontend + Backend)

Repo ini berisi:
- Backend Flask: `aki_server.py` (default `http://localhost:5050`)
- Frontend React (Vite): `aki-frontend/` (default `http://localhost:5173`)

## Kenapa ada 2 file `.env`?
- `.env` (di root) = **backend** (Flask) dan berisi **secret** (Supabase service role key, API key AI, dll).
- `aki-frontend/.env` = **frontend** (Vite) dan hanya membaca variabel berprefix `VITE_`.

Template env:
- Backend: `.env.example` → copy jadi `.env`
- Frontend: `aki-frontend/.env.example` → copy jadi `aki-frontend/.env`

## Jalankan (Dev)

### 1) Backend (Flask)
1. Copy `.env.example` → `.env`, lalu isi minimal:
   - PowerShell: `Copy-Item .env.example .env`
   - Bash: `cp .env.example .env`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (recommended) atau `SUPABASE_ANON_KEY` (fallback)
2. Install dependency:
   - `python -m pip install flask flask-cors python-dotenv supabase openpyxl numpy`
3. Run:
   - `python aki_server.py`
4. Cek:
   - `curl http://localhost:5050/api/health`

### 2) Frontend (Vite)
1. (Opsional) Copy `aki-frontend/.env.example` → `aki-frontend/.env`
   - PowerShell: `Copy-Item aki-frontend/.env.example aki-frontend/.env`
   - Bash: `cp aki-frontend/.env.example aki-frontend/.env`
   - Default sudah bisa pakai `VITE_API_URL=/api` + proxy dev Vite.
2. Install + run:
   - `cd aki-frontend`
   - `npm install`
   - `npm run dev`

## Auth & API
Hampir semua endpoint bisnis butuh login (Bearer token).

Frontend login lewat:
- `POST /api/auth/login`
- `POST /api/auth/register`

Login dengan Google (OAuth) juga bisa, tapi perlu setup di Supabase dashboard:
- Enable provider Google di Authentication → Providers
- Set redirect URL untuk dev: `http://localhost:5173`
- Isi env frontend: `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` (lihat `aki-frontend/.env.example`)

Endpoint utama:
- `GET /api/health`
- `POST /api/calculate` (auth)
- `POST /api/recommend` (auth, butuh `GEMINI_API_KEY` atau `GROQ_API_KEY` untuk AI)
- `POST /api/export-excel` (auth, download `.xlsx`)
