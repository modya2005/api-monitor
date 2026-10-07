# API Monitor

A full-stack API uptime and response-time monitoring dashboard.

## What this version provides

- Secure account registration, login, logout and persistent sessions.
- Every user sees **only their own monitors and check history**.
- Scheduled HTTP/HTTPS checks with response-time tracking.
- Expected status-code and response-content validation.
- 24h / 7d / 30d availability statistics.
- Failure history and response-time chart.
- Email alerts on down/recovery state changes.
- SSRF protections for public deployment: private/local DNS targets are rejected and redirects are not followed.
- React/Vite frontend and Express/MongoDB backend served from one origin in production.

## Free deployment architecture

```text
Browser
   |
   v
Render Free Web Service
   |-- React production build
   |-- Express API
   |-- HTTP-only session cookie
   |
   +----> MongoDB Atlas Free cluster
   |
   +----> SMTP provider (optional, for alerts)

GitHub Actions (every 5 minutes)
   |
   +----> /api/internal/tick
```

Render currently offers free web services, although free instances spin down after inactivity. MongoDB Atlas offers a free cluster tier. The included GitHub Actions workflow wakes the service and asks it to run due checks; this means free hosting should be treated as best-effort monitoring rather than a strict 1-minute SLA.

## Local development

Requirements: Node 18+ and MongoDB.

```bash
cd server
cp .env.example .env
# Set MONGODB_URI and JWT_SECRET
npm install

cd ../client
npm install
npm run dev
```

For local development, Vite proxies `/api` to the server.

## Production deployment

### 1. MongoDB Atlas

Create a MongoDB Atlas Free cluster and database user, then copy the connection string into Render as `MONGODB_URI`.

Do not commit credentials or `.env` files.

### 2. Render

Connect the GitHub repository to Render and use the included `render.yaml`, or create a Web Service manually:

- Build: `cd client && npm install && npm run build && cd ../server && npm install`
- Start: `cd server && npm start`
- Health check: `/api/health`

Set:

- `MONGODB_URI`
- `JWT_SECRET` (32+ random characters)
- `CRON_SECRET` (32+ random characters)

Optional email settings are documented in `server/.env.example`.

### 3. GitHub scheduled wake-up

Create two repository secrets:

- `MONITOR_URL` = your Render URL, e.g. `https://your-app.onrender.com`
- `CRON_SECRET` = exactly the same value as Render's `CRON_SECRET`

The workflow runs every five minutes and can also be triggered manually.

## Attribution / acknowledgement

This project began as the uploaded **Mini API Monitor** implementation and was substantially extended for public deployment. The production-oriented authentication, per-user authorization, session handling, SSRF hardening, same-origin deployment configuration, scheduled wake-up workflow, and deployment documentation are part of this upgraded version.

Third-party software remains subject to its own licenses. The project uses React, Vite, Express, MongoDB/Mongoose, Axios, node-cron, Nodemailer, bcryptjs, jsonwebtoken and cookie-parser. The Google Fonts referenced by the UI are subject to their respective font licenses.

## Security notes

- Never set `ALLOW_PRIVATE_HOSTS=true` on a public deployment.
- Never commit `.env`, database credentials, SMTP passwords, JWT secrets or cron secrets.
- Use HTTPS in production.
- Keep dependencies updated.
- Free hosting is suitable for learning, demos and small personal projects; it is not a substitute for an uptime SLA.

## License

This repository can be released under the MIT License if you are the rights holder or otherwise have permission to apply that license. If the original source contains separate licensing terms, preserve those terms instead.
