# 🚌 Riderr — Bus Terminal Booking System

A full-stack web application for booking bus tickets online.
Built with HTML/CSS/JavaScript (frontend) and Node.js + Express + Supabase (backend).

---

## 📋 Prerequisites (What the other PC must have installed)

Before starting, make sure the following are installed:

1. **Node.js** (version 18 or higher)
   - Download from: https://nodejs.org/en/download
   - Choose the **LTS** version
   - After installing, open Command Prompt and type `node -v` to confirm it works

2. **A modern web browser** (Chrome, Edge, or Firefox)

That's it! No other software needed.

---

## 🚀 How to Run the Project (Step-by-Step)

### Step 1 — Get the project files
Copy the entire **BUS-TERMINAL** folder to the Desktop (or anywhere convenient).

### Step 2 — Open Terminal / Command Prompt
- Press `Windows Key + R`, type `cmd`, press Enter
- Or right-click on the Desktop → "Open in Terminal"

### Step 3 — Navigate to the Server folder
```
cd C:\Users\YourName\Desktop\BUS-TERMINAL\Server
```
*(Replace `YourName` with the actual Windows username)*

### Step 4 — Install dependencies
```
npm install
```
Wait for it to finish (downloads required packages). Only needed once.

### Step 5 — Start the backend server
```
npm start
```
You should see:
```
Server is running on port 3000
```
**Keep this terminal window open** while using the app.

### Step 6 — Open the website
Open the **Client** folder → double-click **index.html**
*(Or open your browser and go to: `file:///C:/Users/YourName/Desktop/BUS-TERMINAL/Client/index.html`)*

---

## 🌐 Pages / Features

| Page | File | Description |
|------|------|-------------|
| Home | `index.html` | Search trips by route and date |
| Login/Register | `login.html` | User authentication |
| Destinations | `destinations.html` | Browse available routes |
| Book a Ride | `booking.html` | Select seat + fill passenger details |
| My Tickets | `tickets.html` | View your booked tickets |
| Dashboard | `dashboard.html` | Account overview |
| Support | `complaint.html` | Submit a complaint |

---

## 🔐 Demo Login (For Testing)

You can register a new account using the Register tab on the login page,
or use the built-in demo credentials:

- **Email:** user@example.com
- **Password:** ticket123

---

## ⚙️ Project Structure

```
BUS-TERMINAL/
├── Client/                  ← Frontend (HTML/CSS/JS)
│   ├── index.html           ← Home page / Trip search
│   ├── login.html           ← Login & Registration
│   ├── booking.html         ← Seat selection & passenger form
│   ├── tickets.html         ← My Tickets page
│   ├── dashboard.html       ← User dashboard
│   ├── destinations.html    ← All available routes
│   ├── complaint.html       ← Submit support complaint
│   ├── styles.css           ← All styling (dark theme)
│   ├── nav.js               ← Dynamic navigation bar
│   └── config.js            ← API URL config
│
└── Server/                  ← Backend (Node.js + Express)
    ├── server.js            ← Main server entry point
    ├── .env                 ← Environment variables (API keys)
    ├── controllers/         ← Business logic handlers
    │   ├── authController.js
    │   ├── bookingController.js
    │   ├── tripController.js
    │   └── complaintController.js
    ├── routes/              ← API route definitions
    ├── services/            ← Seat management, SMS, reminders
    ├── config/              ← Supabase connection
    └── database/            ← SQL schema & seed data
```

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | Supabase (PostgreSQL) |
| Authentication | bcryptjs (password hashing) |
| SMS Notifications | Termii API |
| Scheduling | node-cron |

---

## ⚠️ Important Notes

- The backend **must be running** (`npm start` in the Server folder) for the website to work
- The database is hosted online (Supabase) — internet connection is required
- Do **NOT** delete the `.env` file in the Server folder — it contains the database credentials
- Do **NOT** upload the project to GitHub without removing/hiding the `.env` file

---

## 📞 Support

If you have issues running the project, contact the developer.
