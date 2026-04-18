# Badminton Team Manager

A simple web application to manage badminton players, teams, matches, and leaderboards.

## Features

- **Player Management**: Add and manage players
- **Team Generation**: Create random teams (2 players per team) for the day
- **Match Scoring**: Record match scores
- **Leaderboard**: View rankings for both players and teams (landing page)

## Setup Instructions

### 1. Database Setup

Run the SQL migration file in your Supabase project:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `database_setup.sql`
4. Run the query

This will create:

- `players` table
- `matches` table
- Sample data (optional)

### 2. Configure Supabase Connection

1. Copy `config.js` and update with your Supabase credentials:

   ```javascript
   const CONFIG = {
     SUPABASE_URL: "https://your-project.supabase.co",
     SUPABASE_ANON_KEY: "your-anon-key-here",
   };
   ```

2. Find your credentials in Supabase Dashboard → Project Settings → API

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the App

#### Development Mode (with SCSS auto-compilation):

```bash
npm run dev
```

This will:

- Watch and compile SCSS to CSS automatically
- Start a local server on http://localhost:8080

#### Production Build:

```bash
npm run build
```

Then serve the files with any static file server.

## Usage

1. **Leaderboard** (Landing Page): View player and team rankings
2. **Players**: Add, edit, or remove players
3. **Create Teams**: Select players and generate random teams for the day
4. **Matches**: Record scores for matches played
5. **Side Menu**: Navigate between pages

## Tech Stack

- HTML5
- Plain JavaScript (ES6+)
- SCSS
- Supabase (Backend)
- Font: Poppins

## File Structure

```
Badminton/
├── index.html          # Main HTML file
├── styles.scss         # SCSS styles
├── styles.css          # Compiled CSS (auto-generated)
├── app.js             # Main JavaScript logic
├── config.js          # Supabase configuration
├── package.json       # Dependencies
├── database_setup.sql # Database schema
└── README.md          # This file
```
