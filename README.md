# Berkeley International Expense Management System

A web-based expense claim system for Berkeley International's 8 offices across Asia and the Middle East.

## Overview

This system allows employees to:
- Upload receipt photos and enter expense details
- Automatically assign reference codes (C1, E1, etc.) matching the expense claim form
- Track pending expenses before monthly submission
- Submit claims for admin/finance review

Admins and Finance can:
- Review submitted claims
- See flagged items that need attention
- Approve or reject claims

## Features

- ✅ Mobile-friendly (works on phone browsers)
- ✅ Desktop-friendly (works via Citrix for China offices)
- ✅ Manual entry (no OCR costs)
- ✅ Automatic reference numbering
- ✅ Foreign currency detection with credit card statement prompts
- ✅ Overdue expense warnings (>2 months)
- ✅ Attendee tracking for entertaining expenses
- ✅ Multi-office support with local currencies

## Offices Supported

| Office | Currency |
|--------|----------|
| Shanghai | CNY |
| Beijing | CNY |
| Chengdu | CNY |
| Shenzhen | CNY |
| Hong Kong | HKD |
| Singapore | SGD |
| Bangkok | THB |
| Dubai | AED |

## Expense Categories

| Code | Category | Notes |
|------|----------|-------|
| A | Petrol Expenditure | Mileage claims |
| B | Parking | Off-street parking |
| C | Travel Expenses | Taxis, public transport, subsistence |
| D | Vehicle Repairs | Repairs and parts |
| E | Entertaining | **Requires attendees** |
| F | Welfare | Hotels, gifts - **Requires attendees** |
| G | Subscriptions | Professional memberships |
| H | Computer Costs | Equipment |
| I | WIP / Other | Miscellaneous |

---

# DEPLOYMENT INSTRUCTIONS

## Option 1: Deploy to Vercel (Recommended - Free)

### Prerequisites
- A GitHub account
- A Vercel account (free at vercel.com)

### Steps

1. **Create a GitHub repository**
   - Go to github.com and create a new repository
   - Name it `berkeley-expenses` or similar

2. **Upload the code**
   - Upload all files from this folder to the repository
   - Make sure the folder structure is:
     ```
     /
     ├── index.html
     ├── package.json
     ├── vite.config.js
     ├── tailwind.config.js
     ├── postcss.config.js
     └── src/
         ├── main.jsx
         ├── index.css
         └── App.jsx
     ```

3. **Connect to Vercel**
   - Go to vercel.com and sign in with GitHub
   - Click "Add New Project"
   - Select your `berkeley-expenses` repository
   - Click "Deploy"
   - Wait 1-2 minutes for deployment

4. **Get your URL**
   - Vercel will give you a URL like: `berkeley-expenses.vercel.app`
   - Share this URL with employees

### Custom Domain (Optional)
If you want a custom URL like `expenses.berkeley.com`:
- Go to your Vercel project settings
- Click "Domains"
- Add your domain and follow DNS instructions

---

## Option 2: Deploy to Render (Free tier available)

1. Create account at render.com
2. Click "New" → "Static Site"
3. Connect your GitHub repository
4. Set build command: `npm run build`
5. Set publish directory: `dist`
6. Click "Create Static Site"

---

## Option 3: Deploy to Railway

1. Create account at railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect and deploy

---

## Option 4: Self-hosted (Company Server)

If deploying on Berkeley's own infrastructure:

1. **Install Node.js** (version 18 or higher)
   ```bash
   # Check if installed
   node --version
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the application**
   ```bash
   npm run build
   ```

4. **Serve the build**
   The `dist` folder contains the built files. Serve these with any web server:
   
   Using nginx:
   ```nginx
   server {
       listen 80;
       server_name expenses.berkeley.com;
       root /path/to/dist;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

---

# ADDING USERS

Currently, users are defined in `src/App.jsx` in the `DEMO_USERS` array.

To add real users, edit this section:

```javascript
const DEMO_USERS = [
  { id: 1, name: 'Chris Frame', email: 'chris.frame@berkeley.com', office: 'DXB', role: 'employee' },
  { id: 2, name: 'Kate Tai', email: 'kate.tai@berkeley.com', office: 'HKG', role: 'employee' },
  // Add more users here...
];
```

### User Roles
- `employee` - Can submit expenses
- `admin` - Can review and approve claims
- `finance` - Can review and approve claims (same as admin for now)

### Office Codes
- `SHA` - Shanghai
- `BEJ` - Beijing
- `CHE` - Chengdu
- `SHE` - Shenzhen
- `HKG` - Hong Kong
- `SIN` - Singapore
- `BKK` - Bangkok
- `DXB` - Dubai

---

# FUTURE ENHANCEMENTS

To add persistent data storage (so data isn't lost on refresh):

1. **Simple option**: Use Supabase (free tier)
   - Create account at supabase.com
   - Create tables for users, expenses, claims
   - Update App.jsx to use Supabase client

2. **More control**: Add a backend
   - Node.js + Express + PostgreSQL
   - Or use Railway/Render with their managed databases

---

# SUPPORT

For questions about this system, contact:
- Ong Yongle (System Owner)
- Or raise in the Berkeley Expenses Claude Project

---

# VERSION HISTORY

- v1.0.0 - Initial release (Manual entry, no OCR)
