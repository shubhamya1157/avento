# 🚗 Avento — Luxury Vehicle Booking & Rental

Avento is a website where people can browse a fleet of premium cars, bikes, and SUVs,
create an account, and book a vehicle for a range of dates. It has a cinematic, dark,
"premium" look and a complete login + booking system behind it.

This README is written for **someone seeing the project for the first time** — even with
very little coding experience. It explains what the app does, how to run it, what every
folder is for, and how to make common changes. (Almost every file in the project also has
detailed beginner comments inside it — open any file and read top to bottom.)

---

## ✨ What the app can do

- **Browse vehicles** — a home‑page showcase carousel + a full `/vehicles` grid with
  filters (All / Cars / Bikes / SUVs).
- **Sign up with email verification** — you register, we email you a 6‑digit code (OTP),
  you type it back, and your account is created.
- **Log in** — with email + password, or "Continue with Google".
- **Book a vehicle** — pick a pick‑up and return date, see the live price total, and
  confirm. The server prevents double‑booking the same vehicle for overlapping dates.
- **Manage bookings** — a `/bookings` page lists your reservations and lets you cancel them.
- **Static pages** — a cinematic `/about` page and a `/contact` page with a form and FAQs.

---

## 🧰 What it's built with (the "tech stack")

| Tool | What it does, in plain words |
|------|------------------------------|
| **Next.js 16** (React 19) | The framework the whole site is built on — pages, routing, the dev server, and the production build. |
| **TypeScript** | JavaScript with type‑checking, so the editor catches many mistakes before the code runs. |
| **Tailwind CSS 4** | Styling done with small utility classes written right in the markup (e.g. `className="bg-black text-white"`). |
| **MongoDB + Mongoose** | The database (where users and bookings are permanently stored) and the helper library used to talk to it. |
| **NextAuth (Auth.js) v5** | Handles logging users in and keeping them logged in. |
| **bcryptjs** | Safely scrambles ("hashes") passwords so we never store the real password. |
| **Nodemailer** | Sends the verification‑code email (via Gmail). |
| **Framer Motion** | The animation library used for smooth fades/slides. |
| **lucide-react** | The icon set (the little car, calendar, etc. icons). |

---

## ▶️ How to run it on your computer

### 1. Install the prerequisites
- **Node.js** (version 18 or newer — this project was built on Node 24).
  Check with: `node -v`
- A **MongoDB database**. The easiest free option is **MongoDB Atlas** (a cloud database) —
  create a free cluster and copy its connection string.

### 2. Install the project's packages
From the project folder, run this once. It downloads all the libraries listed in
`package.json` into the `node_modules` folder:
```bash
npm install
```

### 3. Add your secret settings (`.env.local`)
Secrets (passwords, API keys) must **never** be written directly in the code. Instead they
live in a file named **`.env.local`** in the project root. This file is private and is NOT
shared on GitHub (it's listed in `.gitignore`).

Create `.env.local` with these keys (fill in your own values after each `=`):

```bash
# The address of your MongoDB database (from MongoDB Atlas)
MONGODB_URL=your-mongodb-connection-string

# A long random secret string used to sign login tokens.
# Generate one with:  npx auth secret   (or any long random text)
AUTH_SECRET=your-random-secret

# Google login credentials (optional — only needed for "Continue with Google").
# Get these from the Google Cloud Console.
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret

# Email settings used to send the sign-up verification code (OTP).
EMAIL_SERVICE=gmail
EMAIL_USER=your-gmail-address@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
```

> **Gmail tip:** `EMAIL_PASSWORD` is **not** your normal Gmail password — it's a 16‑character
> "App Password". Turn on 2‑Step Verification on your Google account, then create an App
> Password and paste it here.

### 4. Start the development server
```bash
npm run dev
```
Then open **http://localhost:3000** in your browser. The dev server reloads automatically
whenever you save a file.

> **Opening it on your phone (same Wi‑Fi):** the terminal also prints a "Network" URL like
> `http://10.171.138.xxx:3000`. To allow that, the IP must be listed in
> `allowedDevOrigins` inside `next.config.ts`. If your phone shows a blank/broken page,
> check that the IP in `next.config.ts` matches the "Network" URL the terminal prints
> (your computer's IP can change when you reconnect to Wi‑Fi).

### 5. Build for production (optional)
To create the optimized version that you'd actually deploy:
```bash
npm run build   # build it
npm run start   # run the built version
```

---

## 📁 Folder map — where everything lives

Everything is inside the **`app/`** folder (Next.js's "App Router"). The rule: **a file
named `page.tsx` becomes a web page, and its folder path is its web address.**

```
avento/
├─ app/
│  ├─ page.tsx              → the HOME page ("/")
│  ├─ layout.tsx            → the shell that wraps EVERY page (sets <html>/<body>, the tab title)
│  ├─ globals.css           → the one stylesheet for the whole app (Tailwind + cinematic effects)
│  ├─ auth.ts               → login configuration (NextAuth: email/password + Google)
│  │
│  ├─ about/page.tsx        → the "/about" page
│  ├─ contact/page.tsx      → the "/contact" page (form + FAQs)
│  ├─ vehicles/page.tsx     → the "/vehicles" page (full grid + filters)
│  ├─ bookings/page.tsx     → the "/bookings" page (your reservations; login required)
│  │
│  ├─ component/            → reusable pieces of screen used across pages
│  │  ├─ Nav.tsx            → the floating top navigation bar
│  │  ├─ HeroSection.tsx    → the big full-screen banner on the home page
│  │  ├─ VehicleSlider.tsx  → the "THE COLLECTION" carousel on the home page
│  │  ├─ PublicHome.tsx     → stacks the hero + slider together
│  │  ├─ Footer.tsx         → the bottom footer (links, newsletter, socials)
│  │  ├─ AuthModal.tsx      → the login / sign-up popup
│  │  ├─ BookingModal.tsx   → the "book this vehicle" popup
│  │  └─ Providers.tsx      → makes the login session available to every page
│  │
│  ├─ api/                  → the BACKEND. Each route.ts is a server endpoint the browser calls.
│  │  ├─ vehicles/route.ts          → GET list of vehicles
│  │  ├─ bookings/route.ts          → GET my bookings, POST a new booking
│  │  ├─ bookings/[id]/route.ts     → PATCH (cancel) one booking
│  │  └─ auth/
│  │     ├─ send-otp/route.ts       → email a 6-digit sign-up code
│  │     ├─ verify-otp/route.ts     → check the code & create the account
│  │     ├─ register/route.ts       → (direct account creation)
│  │     └─ [...nextauth]/route.ts  → the login endpoints NextAuth handles
│  │
│  ├─ lib/                  → shared helpers (not pages)
│  │  ├─ db.ts              → connects to MongoDB (and reuses the connection)
│  │  ├─ email.ts           → sends the verification email
│  │  ├─ otp-store.ts       → temporarily remembers the codes we email out
│  │  ├─ api-response.ts    → tiny helpers for sending error replies
│  │  ├─ types.ts           → shared "shapes" of data (Vehicle, Booking, …)
│  │  └─ seed-vehicles.ts   → the built-in starter list of vehicles
│  │
│  └─ models/               → database "blueprints" (what a record looks like)
│     ├─ user.ts            → a user account
│     ├─ booking.ts         → one booking/reservation
│     └─ vehicle.ts         → one rentable vehicle
│
├─ public/                  → images served as-is (vehicle photos, hero image, etc.)
├─ next.config.ts           → Next.js settings (e.g. which network IPs may open the dev server)
├─ tsconfig.json            → TypeScript settings
└─ package.json             → the project's name, scripts, and list of libraries
```

---

## 🔄 How a booking actually works (the big picture)

1. You click **Book Now** on a vehicle → the **BookingModal** popup opens.
2. You pick dates. The popup calculates `days × pricePerDay` and shows the total live.
3. You press **Confirm**. If you're not logged in, the **login popup** opens instead.
4. The browser sends the booking to the backend at **`POST /api/bookings`**.
5. The server (in `app/api/bookings/route.ts`) checks: are you logged in? are the dates
   valid? is the vehicle available? is it already booked for those dates? If all good, it
   saves the booking in MongoDB and replies "Created".
6. The popup shows **"RIDE CONFIRMED"**, and the booking now appears on your **/bookings** page.

The sign‑up flow is similar: `send-otp` emails you a code → `verify-otp` checks the code and
creates your verified account → you're logged in automatically.

---

## 🛠️ Common things you might want to change

- **Add or edit a vehicle** → open `app/lib/seed-vehicles.ts`. The first car is fully
  labelled as a template; copy its shape, change the values, and make sure the `image`
  points to a file that exists in the `public/` folder. (There are 14 vehicles to start.)
- **Change the home‑page headline** → `app/component/HeroSection.tsx`.
- **Change the browser‑tab title** → `app/layout.tsx` (`metadata.title`).
- **Change colors / spacing** → edit the Tailwind `className="…"` values right on the
  element you want to change. The cinematic effects (slow zoom, film grain, fade‑in) live
  in `app/globals.css`.
- **Change a page's text** → open that page in `app/<name>/page.tsx` and edit the words.

---

## 📜 Available commands

| Command | What it does |
|---------|--------------|
| `npm run dev`   | Start the development server (auto‑reloads on save). |
| `npm run build` | Create the optimized production build. |
| `npm run start` | Run the production build (after `npm run build`). |
| `npm run lint`  | Check the code for common mistakes/style issues. |

---

## 📝 Notes

- The **contact form** and the footer **newsletter** are visual only right now — they don't
  send anywhere yet. Wiring them to a real backend would be a nice next step.
- The OTP codes are kept in the server's memory, so they reset if the server restarts. For a
  real production app you'd store them in the database or a service like Redis.

---

Built by **Shubham Yadav**.
