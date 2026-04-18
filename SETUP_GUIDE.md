# 🏸 Badminton Manager - Quick Setup Guide

## ✅ What's Been Created

Your badminton management app is ready! Here's what you have:

```
Badminton/
├── index.html              # Main HTML page
├── styles.scss            # SCSS source (for development)
├── styles.css             # Compiled CSS (ready to use)
├── app.js                 # Main JavaScript application
├── config.js              # Supabase configuration (NEEDS YOUR CREDENTIALS)
├── database_setup.sql     # Database schema to run in Supabase
├── package.json           # NPM configuration
├── README.md              # Full documentation
└── .gitignore             # Git ignore file
```

## 🚀 Next Steps

### Step 1: Set Up Database

1. Open your Supabase dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `database_setup.sql`
4. Click "Run" to create tables

### Step 2: Configure Supabase Credentials

1. Open `config.js` in a text editor
2. Replace the placeholder values with your actual Supabase credentials:
   ```javascript
   const CONFIG = {
     SUPABASE_URL: "https://your-project.supabase.co",
     SUPABASE_ANON_KEY: "your-anon-key-here",
   };
   ```
3. Find your credentials in Supabase: **Project Settings → API**

### Step 3: Run the App

**Option A: Using npm (includes live reload)**

```bash
cd /Users/sujays/Desktop/Personal/Badminton
npm run dev
```

Then open http://localhost:8080

**Option B: Using any web server**

```bash
cd /Users/sujays/Desktop/Personal/Badminton
python3 -m http.server 8000
```

Then open http://localhost:8000

**Option C: Just open the file**
Double-click `index.html` to open in your browser

## 📱 Features Overview

### 🏆 Leaderboard (Landing Page)

- View player rankings (wins, losses, win rate, points)
- View team performance statistics
- Automatic ranking calculations

### 👥 Players

- Add new players
- Delete players
- View all registered players

### 🎲 Create Teams

- Select players (must be even number, minimum 4)
- Generate random teams (2 players per team)
- Perfect for organizing matches on the fly

### 📊 Matches

- Record match scores with team compositions
- Select players from dropdowns
- View recent match history
- Delete matches if needed

## 🎨 Theme

- **Font**: Poppins (loaded from Google Fonts)
- **Color Scheme**: Modern Blue/Teal with dark background
- **Responsive**: Works on mobile and desktop

## 🛠️ Development Commands

```bash
# Install dependencies
npm install

# Watch SCSS changes (auto-compile)
npm run watch

# Build CSS for production
npm run build

# Run dev server with auto-compile
npm run dev
```

## ⚠️ Important Notes

- The `config.js` file is in `.gitignore` to protect your credentials
- Don't commit `config.js` to version control
- The app uses Supabase from CDN (no build step needed)
- SCSS is pre-compiled to CSS for you

## 🐛 Troubleshooting

**Issue: "Failed to load players/matches"**

- Check that you've run the database_setup.sql in Supabase
- Verify your credentials in config.js are correct

**Issue: Styles not loading**

- Make sure styles.css exists (run `npm run build` if needed)

**Issue: CORS errors**

- Use a local web server (npm run dev or python -m http.server)
- Don't open index.html directly if using remote database

## 📝 Example Workflow

1. Add players: Sujay, Rahul, Priya, Amit
2. Go to "Create Teams"
3. Select all 4 players
4. Click "Generate Random Teams"
5. Play matches!
6. Go to "Matches" to record scores
7. Check "Leaderboard" to see rankings

Enjoy your badminton management app! 🏸
