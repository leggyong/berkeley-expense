# Berkeley Expense System - Tech Setup Guide

## What You're Setting Up
A simple web app for expense claim management. Employees upload receipts and enter details, admins review and approve.

## Quick Start (5 minutes on Vercel - FREE)

### Step 1: Create a GitHub Account
- Go to github.com
- Sign up (free)
- Create a new repository called `berkeley-expenses`

### Step 2: Upload the Code
- Unzip the `berkeley-expense-system.zip` file
- Upload ALL files to the GitHub repository
- Keep the folder structure exactly as is

### Step 3: Deploy on Vercel
1. Go to vercel.com
2. Sign up with your GitHub account (free)
3. Click "Add New Project"
4. Select the `berkeley-expenses` repository
5. Click "Deploy"
6. Wait 2 minutes
7. Done! You'll get a URL like: `berkeley-expenses.vercel.app`

## File Structure
```
berkeley-expense-system/
├── index.html          (main HTML file)
├── package.json        (dependencies)
├── vite.config.js      (build config)
├── tailwind.config.js  (styling)
├── postcss.config.js   (CSS processing)
└── src/
    ├── main.jsx        (entry point)
    ├── index.css       (styles)
    └── App.jsx         (main application)
```

## To Add Real Users
Edit `src/App.jsx` and find the `DEMO_USERS` array. Add users like this:
```javascript
{ id: 11, name: 'New Person', email: 'new@berkeley.com', office: 'SIN', role: 'employee' }
```

Office codes: SHA, BEJ, CHE, SHE, HKG, SIN, BKK, DXB
Roles: employee, admin, finance

## Need Help?
Contact Ong Yongle or check the detailed README.md file.
