# SLV Events - Vendor & Staff Assignment System

A premium, modern, and production-ready Event Management, Scheduling, and Crew Assignment platform for **SLV Events**. 

The system helps coordinate event bookings, assign resources (Decorators, Caterers, Photographers, Anchors, Sound Teams, and Helpers), detect and resolve scheduling conflicts, monitor warehouse inventory, and review payments ledger.

---

## 🚀 Key Features

1. **Premium Responsive Dashboard**: SaaS style metrics, Recharts trends, circular workload indicators, and real-time activity log records.
2. **Interactive Roster Planner**: Drag-and-drop / single-click assignments matching AI-backed ratings, price tier compatibilities, and date schedules.
3. **Automatic Conflict Scan**: Scanner identifies double-bookings or overlapping assignments on overlapping dates.
4. **Exportable Briefings Panel**: Instantly generate and copy formatted SMS/Email briefs for vendors and internal staff crews.
5. **Ledger Accounts Track**: Manage customer contract installments (Budget, Advance, Balance) and outsource vendor disbursement lists.
6. **Double-Mode Database Layer**: Dynamic connection pool links with a MySQL database. If MySQL is not configured or fails to connect, the server gracefully switches to **Demo Mode** using a local stateful JSON file database (`backend/data/demo_db.json`), loaded with rich seeded data.

---

## 🛠️ Tech Stack

- **Frontend**: React.js, Tailwind CSS, Vite, Framer Motion, React Router DOM, Axios, Recharts, Lucide React
- **Backend**: Node.js, Express.js, JWT Authentication, Bcrypt Password Encryption
- **Database**: MySQL (Production) / Local Stateful JSON database (Local Fallback/Demo)

---

## 📦 Project Directory Structure

```
SLV E/
├── backend/                  # Node.js/Express API server
│   ├── data/
│   │   ├── schema.sql        # MySQL database schema setup script
│   │   └── demo_db.json      # Auto-seeded local JSON database cache (Demo Mode)
│   ├── src/
│   │   ├── config/db.js      # DB client routing MySQL or Fallback JSON DB
│   │   ├── controllers/      # Route handler controllers (Auth, Events, crew, etc.)
│   │   ├── middleware/       # JWT RBAC authorization middleware
│   │   ├── routes/           # API routes definitions
│   │   └── app.js & index.js # Express application configurations
│   └── package.json
└── frontend/                 # React.js/Vite Client UI
    ├── src/
    │   ├── components/       # Global shell frames (Layout, Navbar, Sidebar)
    │   ├── context/          # Auth state Context (Localstorage tokens, headers)
    │   ├── pages/            # View pages (Login, Dashboard, Planner, Calendar)
    │   ├── App.jsx & main.js # React routers and strict entry mounts
    │   └── index.css         # Styling, premium gradients, fonts
    ├── tailwind.config.js
    └── package.json
```

---

## ⚙️ Local Setup Instructions

### 1. Backend API Server Setup

1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment settings:
   - Copy `.env.example` to `.env`
   - If using MySQL, fill out database credentials:
     ```env
     PORT=5000
     NODE_ENV=development
     JWT_SECRET=slv_events_secret_key_123456
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=your_mysql_password
     DB_NAME=slv_events_db
     DB_PORT=3306
     ```
   - **No MySQL database?** No problem. Leave the `DB_HOST` and `DB_USER` fields commented out in `.env` and the server will automatically run in **Demo Mode (using `backend/data/demo_db.json`)**.
4. Set up MySQL database schemas (Only if connecting to MySQL):
   - Import the schema using CLI:
     ```bash
     mysql -u root -p < data/schema.sql
     ```
5. Boot up the Express API server:
   - For developer execution (with auto reload):
     ```bash
     npm run dev
     ```
   - The server boots on: `http://localhost:5000`
   - Verify health index: `http://localhost:5000/health`

### 2. Frontend client Setup

1. Open a new terminal in the project directory and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install frontend packages:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
4. Access the web app in your browser: `http://localhost:5173`

---

## 🔑 Sandbox Credentials (Quick Login)

When the login page opens, you can enter credentials manually or click the **Sandbox Access Shortcuts** buttons at the bottom of the card to log in instantly as any role:

| Account Type | Email | Password | Allowed Access Modules |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@slvevents.com` | `admin123` | All panels & configurations |
| **Vendor Coordinator** | `coordinator@slvevents.com` | `admin123` | Event bookings, assignment center, calendars |
| **Operations Lead** | `operations@slvevents.com` | `admin123` | Staff lists, inventory checklists, calendars |
| **Finance Team** | `finance@slvevents.com` | `admin123` | Budget ledgers, payouts tracks, csv exports |

---

## ☁️ Deployment Instructions (Render + Managed MySQL)

### 1. Database Provisioning
- Spin up a managed MySQL database on a provider like **Aiven**, **Tidal**, or **Render PostgreSQL/MySQL add-ons**.
- Execute the SQL declarations in [schema.sql](file:///backend/data/schema.sql) inside the database console to build all tables and reference constraints.

### 2. Backend deployment on Render
1. Create a new **Web Service** on Render.
2. Select your repository and specify directory as `backend`.
3. Build Settings:
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Add Environmental Variables in the Render Dashboard:
   - `NODE_ENV=production`
   - `PORT=10000`
   - `JWT_SECRET=your_long_random_production_secret`
   - `DB_HOST=your_managed_db_host`
   - `DB_USER=your_managed_db_user`
   - `DB_PASSWORD=your_managed_db_password`
   - `DB_NAME=your_managed_db_name`
   - `DB_PORT=your_managed_db_port`

### 3. Frontend deployment on Render
1. Create a new **Static Site** on Render.
2. Select repository and specify directory as `frontend`.
3. Configure settings:
   - Build Command: `npm run build`
   - Publish Directory: `dist`
4. Define Route Redirect Rules:
   - Render static sites routing React SPAs need redirect rewrites. Add this rule in Render:
     - Source: `/*`
     - Destination: `/index.html`
     - Action: `Rewrite`
5. In `frontend/src/context/AuthContext.jsx`, update the `axios.defaults.baseURL` to match your deployed backend endpoint:
   ```javascript
   axios.defaults.baseURL = 'https://your-backend-service.onrender.com/api';
   ```
