# 🏛️ Chronicles of Collapse — Civilization Simulator

> A full-stack DBMS + Web Programming project that models the rise, stagnation, and fall of civilizations through time-series analytics, AI-powered narratives, and interactive dashboards.

---

## 🔗 Links

- **GitHub:** https://github.com/hiral723/civilization_simulation

---

## 📌 Project Overview

Chronicles of Collapse is a full-stack civilization simulation platform that helps students and researchers visualize how civilizations evolve over time through AI-driven analytics, interactive time-series charts, and MySQL-backed historical data.

The platform mirrors a real analytical experience — an AI narrator powered by Claude generates dramatic historical chronicles based on actual database records. Users can compare civilizations side-by-side, view a leaderboard ranked by legacy score, filter events by type, and add entirely new civilizations through a dynamic form — all backed by a MySQL database with transactional inserts.

Two built-in civilizations are seeded as case studies:
- **Roman Empire** (509 BCE – 476 CE) — Pass case: gradual, managed decline
- **Maya Civilization** (250 CE – 900 CE) — Fail case: rapid collapse

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Charts | Chart.js 4.4.1 (CDN) |
| Fonts | Google Fonts — Cinzel, Crimson Pro |
| Backend | Node.js, Express.js 4.18 |
| Database | MySQL 8.0 with mysql2 driver |
| AI | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| Dev Tool | Nodemon |

---

## ✅ Features Built

### Dashboard Module
- Live stat tiles: peak population, peak tech level, collapse risk %, resilience score
- Animated collapse probability arc meter
- Stability index, growth phase, resource pressure, longevity tier cards
- Civilization selector cards with Pass / Fail case type badges
- Delete button for user-added civilizations (built-ins protected)

### Charts Module
- **Line chart** — population, tech, energy, resources, stability over time
- **Radar chart** — 6-dimension power profile (Population, Technology, Energy, Resources, Stability, Innovation)
- **Decline velocity bar chart** — year-over-year rate of change for stability and resources

### Timeline Tab
- Chronological merged view of both snapshot phases and historical events
- Color-coded by event type: innovation (green), conflict (red), resource (amber), collapse (dark red)

### Leaderboard Tab
- Ranks all civilizations by computed **Legacy Score**
- Formula: `(peak_pop × 2) + (peak_tech × 5) + (peak_stability × 0.5) + (lifespan ÷ 100)`
- Gold / silver / bronze medal badges for top 3
- Click any row to load that civilization in the dashboard

### Compare Feature
- Side-by-side comparison panel for all civilizations
- Shows peak population, tech, resources, stability, energy per civ

### Add Civilization
- Dynamic form with scrollable snapshot rows and event rows
- Add / remove rows with + buttons
- Transactional POST: wraps inserts into `civilizations`, `civ_snapshots`, and `civ_events` in a single DB transaction
- Auto-redirects to dashboard after successful creation

---

## ⚙️ Local Setup Instructions

### Prerequisites

- Node.js v18+
- MySQL 8.0+
- Git

---

### Backend Setup

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/civilization-simulator.git
cd civilization-simulator

# 2. Install dependencies
npm install

# 3. Seed the database
mysql -u root -p
```

```sql
SOURCE backend/seed.sql;
```

```bash
# 4. Start the backend server
npm start
# or for auto-reload during development:
npm run dev
```

---

### Frontend Setup

No build step required. The Express server serves the frontend statically.

```
http://localhost:3000
```

That's it — open your browser and the app loads.

---

## 📁 Project Structure

```
civilization-simulator/
│
├── backend/
│   ├── server.js                  # Express app, static serving, route mount
│   ├── db.js                      # MySQL2 connection pool
│   ├── seed.sql                   # CREATE TABLE + seed data (Roman, Maya)
│   └── routes/
│       └── civilization.js        # All REST API handlers
│
├── frontend/
│   ├── index.html                 # Tabbed UI — Dashboard, Timeline, Narrative, Leaderboard, Add
│   └── app.js                     # All JS: chart rendering, API calls, form logic
│
├── data/                          # (optional) raw CSV reference data
├── package.json
└── README.md
```

---

## ⚠️ Known Limitations

- No authentication — anyone can add or delete civilizations
- Claude API narrative requires a valid Anthropic API key to be accessible from the backend host
- No persistent `.env` file included — DB password must be set manually in `db.js` or via environment
- `node_modules/` should not be committed — add to `.gitignore` before pushing

---

## 🔮 Future Scope

- User login and per-user civilization collections
- Export civilizations as PDF reports
- Animated civilization comparison timeline
- Map view showing civilization regions geographically
- More AI features: event prediction, what-if scenario simulation
- Mobile responsive layout improvements

---

## 👥 Team

Built as a DBMS + Web Programming course project.

| Role | Responsibility |
|---|---|
| Database Design | ER diagram, relational schema, seed data, SQL queries |
| Backend | Express.js REST API, MySQL queries, Claude AI integration |
| Frontend | Chart.js visualizations, tabbed UI, dynamic forms, CSS |
---

## 📄 License

This project is for academic purposes only.
