<div align="center">

# SIEM Logs Analyzer
### Real-time School Security Logs & Alert Dashboard

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Axios](https://img.shields.io/badge/Axios-HTTP-5A29E4?style=for-the-badge&logo=axios&logoColor=white)](https://axios-http.com/)
[![License](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)](#)

</div>

---

## What This Project Does

`SIEM Logs Analyzer` is a frontend analytics dashboard connected to `school-backend` logs. It helps monitor login/security activity across schools in one place.

It shows:
- School name (not just school UID)
- Login time and source IP
- Failed login activity
- SQL injection-like input attempts
- Search activity entered by users
- Real-time/polled security alert popups
- Severity-based status badges (success, warning, failure, etc.)
- Filters + pagination for log browsing

---

## Why This Is Necessary

In school management systems, security incidents usually hide inside raw logs. This dashboard makes those logs actionable:

- Detects suspicious behavior quickly
- Helps admins trace who logged in, from where, and when
- Surfaces brute-force and injection attempts early
- Improves incident response and audit visibility
- Reduces manual effort of checking backend logs line by line

---

## UI Preview / Motion

> You can keep these GIFs or replace them with your own recorded product GIFs later.

![Cyber Dashboard](https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExazdnd3MzaHdzcWw1cmE3M3RhN2w4c2h3ZzJjM3N2ZnM2d3c5OHQwNyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l0HlNaQ6gWfllcjDO/giphy.gif)

![Security Monitoring](https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeHVoMGl2dnR6MGg4dHRsc2J4cTVzNXE2aHBmMTM4M2h3ZjN2eGx3YiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/26tn33aiTi1jkl6H6/giphy.gif)

---

## Key Features

### 1. Login Observability
- Captures school login events with timestamp + IP
- Displays resolved school name where available

### 2. Security Alerts Engine
- Triggers warnings for potential SQL injection patterns
- Detects repeated failed login attempts (threshold-based alerts)
- Popup alert panel for immediate visibility

### 3. Search Audit Logging
- Stores and displays what user entered in search fields
- Flags suspicious search payloads (e.g., SQL-like symbols/patterns)

### 4. Better Log Navigation
- Filter by event/school
- Paginated records for large datasets
- Status colors for faster scanning

---

## Tech Stack Used

- **React 19**: UI rendering and component-based architecture
- **Vite 8**: fast development/build tooling
- **React Router DOM 7**: page-level navigation (`/`, `/alerts`, etc.)
- **Axios**: API communication with backend logs service
- **Lucide React**: icon system
- **ESLint 9**: code quality and consistency

---

## Project Structure

```bash
Logs/
├── src/
│   ├── pages/
│   │   ├── DashboardOverview.jsx
│   │   └── SecurityAlerts.jsx
│   ├── components/
│   ├── services/
│   └── main.jsx
├── public/
├── package.json
└── README.md
```

---

## Run Locally

```bash
npm install
npm run dev
```

App runs on Vite dev server (usually):

```bash
http://localhost:5173
```

---

## Backend Integration

This UI is designed to work with your `school-backend` logs APIs.

Expected behavior from backend:
- Return real login/search/security events (not mock-only)
- Include school metadata to resolve UID -> school name
- Emit/serve alert-worthy events (failed-login threshold, SQL patterns)

---

## Recommended Next Enhancements

- Persist dismissed popup alerts per user/session
- Add alert acknowledgment workflow
- Add export (CSV/PDF) for filtered incidents
- Add role-based alert visibility (admin/super-admin/security)
- Add geo-IP enrichment for suspicious IPs

---

## Author Notes

Built for school security visibility and practical SOC-like monitoring in education environments.

If you want, I can also generate a second **premium-style README theme** (more animated, glassmorphism visuals, custom badges, architecture diagram) for A/B comparison.
