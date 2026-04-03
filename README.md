# 🐘 Ganeshotsav 2026 – Donation Collection App

A mobile-first, production-ready donation collection web app for Ganeshotsav 2026.  
Built for 7–8 volunteers doing door-to-door collection across 14 buildings.

---

## ✨ Features

| Feature | Details |
|---|---|
| Building → Wing → Flat hierarchy | 14 buildings × 3 wings × 24 flats = 1,008 flats |
| Flat grid status | ✅ Green (paid) / ❌ Red (pending) |
| Donation form | Name, mobile, amount, Cash/UPI mode |
| Auto receipt generation | GS2026-00001 format |
| Printable receipt | Looks like a real mandal receipt |
| WhatsApp sharing | One-tap share with prefilled message |
| UPI QR code | Dynamic QR for any amount |
| Reports (हिशोब) | Total, Cash/UPI split, collector leaderboard |
| Mock data mode | Works without Supabase for demos |

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <your-repo>
cd ganeshotsav-donation-app
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the entire contents of `supabase_schema.sql`
3. This creates all tables, indexes, RLS policies, and seeds 14 buildings

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_UPI_ID=yourupi@bank
VITE_UPI_NAME=GaneshMandal2026
VITE_MANDAL_NAME=Shri Ganesh Utsav Mandal
VITE_MANDAL_ADDRESS=123, Main Road, Your City - 400001
VITE_MANDAL_CONTACT=+91 98765 43210
```

### 4. Run locally

```bash
npm run dev
# Opens at http://localhost:3000
```

> **Without Supabase**: The app runs in **mock data mode** with 14 buildings,
> 42 wings, and 1,008 flats pre-loaded. Data resets on page refresh.

---

## 📦 Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Set environment variables in Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL` (for serverless functions)
- `SUPABASE_SERVICE_ROLE_KEY` (for serverless functions)
- All `VITE_` vars above

---

## 📁 Project Structure

```
ganeshotsav-donation-app/
├── api/
│   └── receipt-number.js        # Vercel serverless function
├── src/
│   ├── context/
│   │   └── CollectorContext.jsx # Volunteer "auth" context
│   ├── components/
│   │   ├── Header.jsx           # Shared top nav
│   │   ├── Spinner.jsx          # Loading state
│   │   └── UpiQR.jsx            # Dynamic UPI QR code
│   ├── pages/
│   │   ├── LoginPage.jsx        # Volunteer name entry
│   │   ├── BuildingsPage.jsx    # Building list
│   │   ├── WingsPage.jsx        # Wing selection
│   │   ├── FlatsPage.jsx        # Flat grid (❌/✅)
│   │   ├── DonationForm.jsx     # Donation entry form
│   │   ├── ReceiptPage.jsx      # Printable receipt + share
│   │   └── ReportsPage.jsx      # हिशोब / Reports
│   ├── api.js                   # Data access layer (Supabase + mock)
│   ├── mockData.js              # Development mock data
│   ├── supabase.js              # Supabase client
│   ├── App.jsx                  # Router
│   ├── main.jsx                 # Entry point
│   └── index.css                # Tailwind + custom styles
├── supabase_schema.sql          # Complete DB schema + seed data
├── vercel.json                  # SPA routing config
├── vite.config.js
├── tailwind.config.js
└── .env.example
```

---

## 🗄️ Database Schema

```
buildings        wings           flats            donations
─────────        ─────           ─────            ─────────
id (PK)          id (PK)         id (PK)          id (uuid PK)
name             building_id FK  wing_id FK        flat_id FK
                 name            floor             donor_name
                                 flat_number       mobile
                                 status            amount
                                 (pending/paid)    payment_mode
                                                   transaction_id
                                                   receipt_no (unique)
                                                   collected_by
                                                   created_at

receipt_counter
───────────────
id = 1 (singleton)
current (auto-increment via RPC)
```

---

## 📱 App Flow

```
Login (enter name)
    ↓
Building List (14 buildings)
    ↓
Wing Selection (A / B / C)
    ↓
Flat Grid (❌ red = pending, ✅ green = paid)
    ↓
Tap flat → Donation Form
    ↓
Save → Receipt Page (GS2026-00001)
    ↓
WhatsApp share / Print / PDF
```

---

## 🎨 Design Decisions

- **Saffron/orange** theme matching Ganeshotsav colours
- **4-column flat grid** matches paper tracking sheet layout
- **Preset amount chips** (₹101, ₹201, ₹501…) reduce typing
- **Mock data mode** lets you demo/test without a database
- **No Redux** — React hooks + Context only
- **No Puppeteer** — browser print dialog for PDF

---

## 🔐 Security Notes

- No user accounts — volunteer name stored in `localStorage`
- Supabase RLS policies allow public read/write (suitable for internal mandal use)
- To harden: add Supabase Auth and restrict policies to authenticated users
- Duplicate prevention: `receipt_no` has a `UNIQUE` constraint; flat `status` is checked before form renders

---

## 🛠️ Customisation

| What | Where |
|---|---|
| Mandal name / address | `.env.local` → `VITE_MANDAL_NAME`, `VITE_MANDAL_ADDRESS` |
| UPI ID | `.env.local` → `VITE_UPI_ID`, `VITE_UPI_NAME` |
| Preset amounts | `src/pages/DonationForm.jsx` → `PRESET_AMOUNTS` array |
| Number of buildings | Re-run seed section in `supabase_schema.sql` |
| Receipt header style | `src/pages/ReceiptPage.jsx` |

---

## 🙏 Ganpati Bappa Morya!
