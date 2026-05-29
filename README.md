# Cricket Pitch Booking System

Full-stack assignment implementation for real-time cricket pitch booking with:
- JWT auth (`register`, `login`, `logout`)
- Dynamic hourly slots (06:00-23:00)
- 2-minute temporary reservation hold (Redis TTL)
- Concurrency-safe confirm booking (PostgreSQL transaction + advisory lock + partial unique index)
- Socket.io live updates for slot reserve/book/release

## Tech Stack
- Backend: Node.js + Express + TypeScript + Prisma
- Database: PostgreSQL
- Cache/TTL/pubsub: Redis
- Real-time: Socket.io + Redis adapter
- Frontend: React (Vite) + TailwindCSS

## Project Structure
- `backend/` API + Prisma + Socket server
- `frontend/` React client
- `docker-compose.yml` PostgreSQL + Redis
- `ARCHITECTURE.md` mandatory architecture answers

## 1) Setup

### Prerequisites
- Node.js 20+
- Docker + Docker Compose

### Environment files

Backend:
```bash
cd backend
cp .env.example .env
```

Frontend:
```bash
cd ../frontend
cp .env.example .env
```

## 2) Start Services

```bash
cd /home/creole/Desktop/assignement-01
docker compose up -d
```

## 3) Backend Run

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed
npm run dev
```

Backend default URL: `http://localhost:4000`

## 4) Frontend Run

In another terminal:
```bash
cd /home/creole/Desktop/assignement-01/frontend
npm install
npm run dev
```

Frontend default URL: `http://localhost:5173`

## API Endpoints
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /pitches`
- `GET /slots?pitchId=&date=`
- `POST /reserve-slot`
- `POST /confirm-booking`
- `GET /my-bookings`

## Testing Guide

### A. Basic flow
1. Register and login from UI.
2. Select pitch + date.
3. Reserve a slot.
4. Confirm within 120 seconds.
5. Check `My Bookings` panel.

### B. 2-minute expiry
1. Reserve a slot.
2. Do not confirm.
3. Wait 120s.
4. Slot should automatically become `available` (and emit `slot:released`).

### C. Concurrency race test (critical)
1. Login with two different users.
2. Pick same pitch/date/slot.
3. Try confirming for both as close as possible.
4. Expected: exactly one confirm succeeds, other fails (`409` or `410` based on hold ownership).

### D. Real-time propagation
1. Open two browsers on same pitch+date.
2. Reserve/confirm in one tab.
3. Other tab should reflect slot state instantly.

## Notes
- Slot uniqueness is enforced in DB by partial unique index:
  - unique on (`pitchId`, `bookingDate`, `startTime`) where status is `confirmed`.
- Reservation keys are Redis TTL keys and are automatically released.
- Retry-safe confirm: same user confirming an already confirmed slot returns idempotent success.

## Build Checks
```bash
cd backend && npm run build
cd ../frontend && npm run build
```
