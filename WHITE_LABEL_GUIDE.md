# White-Label Guide: Multi-Club Badminton Manager

This guide explains how to transform your single-club badminton manager into a white-label solution that can support multiple clubs.

## 📋 Table of Contents

1. [Understanding the Architecture](#understanding-the-architecture)
2. [Database Migration](#database-migration)
3. [Application Configuration](#application-configuration)
4. [Deployment Scenarios](#deployment-scenarios)
5. [Adding New Clubs](#adding-new-clubs)

---

## Understanding the Architecture

### What Changed?

**Before (Single Club):**

- One database with players and matches
- All data belongs to "Smash House"
- Hard-coded club name in UI

**After (Multi-Club):**

- Added `clubs` table to store club information
- `players` and `matches` tables now have `club_id` foreign key
- Dynamic branding based on club configuration
- Data isolation between clubs

### Architecture Options

#### Option 1: Single Deployment, One Club at a Time (Simplest)

✅ **Recommended for sharing with friends/other clubs**

- One Netlify deployment
- Change configuration file to switch clubs
- Each club gets their own subdomain or URL

**Example:**

- `smashhouse.yourapp.com` → Your club
- `aceclub.yourapp.com` → Friend's club
- Each sees only their data

#### Option 2: Separate Deployment Per Club

- Each club gets their own Netlify site
- Complete isolation
- More maintenance work

---

## Database Migration

### Step 1: Backup Your Data

```sql
-- In Supabase SQL Editor, export current data
SELECT * FROM players;
SELECT * FROM matches;
```

### Step 2: Create Clubs Table

```sql
-- Create the clubs table
CREATE TABLE IF NOT EXISTS clubs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#667eea',
  secondary_color TEXT DEFAULT '#764ba2',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert your club
INSERT INTO clubs (name, slug, primary_color, secondary_color)
VALUES ('Smash House', 'smash-house', '#667eea', '#764ba2')
RETURNING id;
```

**Copy the returned `id` - you'll need it next!**

### Step 3: Add club_id to Existing Tables

```sql
-- Add club_id to players
ALTER TABLE players ADD COLUMN club_id UUID REFERENCES clubs(id);

-- Update all existing players with your club ID
UPDATE players SET club_id = 'YOUR_CLUB_ID_HERE';

-- Make it required
ALTER TABLE players ALTER COLUMN club_id SET NOT NULL;

-- Add unique constraint
ALTER TABLE players ADD CONSTRAINT unique_player_per_club UNIQUE (club_id, name);
```

```sql
-- Add club_id to matches
ALTER TABLE matches ADD COLUMN club_id UUID REFERENCES clubs(id);

-- Update all existing matches with your club ID
UPDATE matches SET club_id = 'YOUR_CLUB_ID_HERE';

-- Make it required
ALTER TABLE matches ALTER COLUMN club_id SET NOT NULL;
```

### Step 4: Add Indexes

```sql
CREATE INDEX idx_players_club ON players(club_id);
CREATE INDEX idx_matches_club ON matches(club_id);
CREATE INDEX idx_clubs_slug ON clubs(slug);
```

### Step 5: Enable Row Level Security (Optional but Recommended)

```sql
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Allow read access to all (modify if you need authentication)
CREATE POLICY "Public read clubs" ON clubs FOR SELECT USING (true);
CREATE POLICY "Public access players" ON players FOR ALL USING (true);
CREATE POLICY "Public access matches" ON matches FOR ALL USING (true);
```

---

## Application Configuration

### For Single Club (Current Setup)

In `club-config.js`:

```javascript
const CLUB_CONFIG = {
  DEFAULT_CLUB_SLUG: "smash-house", // Your club slug
  MULTI_CLUB_MODE: false, // Single club mode
  DEFAULT_BRANDING: {
    name: "Smash House",
    primaryColor: "#667eea",
    secondaryColor: "#764ba2",
    logoUrl: null,
  },
};
```

### For Multiple Clubs (Advanced)

In `club-config.js`:

```javascript
const CLUB_CONFIG = {
  DEFAULT_CLUB_SLUG: "smash-house",
  MULTI_CLUB_MODE: true, // Enable multi-club detection
  DEFAULT_BRANDING: {
    name: "Badminton Manager",
    primaryColor: "#667eea",
    secondaryColor: "#764ba2",
    logoUrl: null,
  },
};
```

With `MULTI_CLUB_MODE: true`, the app detects clubs from:

1. **URL parameter**: `yourapp.com?club=ace-club`
2. **Subdomain**: `aceclub.yourapp.com`
3. **Path**: `yourapp.com/ace-club`

---

## Deployment Scenarios

### Scenario 1: Share with Another Club (Separate Deployment)

**Steps:**

1. Create a new Netlify site
2. Copy your repository to a new GitHub repo (or branch)
3. Update `club-config.js`:
   ```javascript
   DEFAULT_CLUB_SLUG: 'ace-club',  // Their club slug
   ```
4. Add their club to database:
   ```sql
   INSERT INTO clubs (name, slug, primary_color, secondary_color)
   VALUES ('Ace Club', 'ace-club', '#3b82f6', '#8b5cf6');
   ```
5. Deploy to Netlify with their custom domain

**Pros:**

- ✅ Complete isolation
- ✅ Each club can customize independently
- ✅ Easy to understand

**Cons:**

- ❌ Need to update each deployment separately

### Scenario 2: One Platform, Multiple Clubs (Subdomain)

**Steps:**

1. Enable multi-club mode in `club-config.js`
2. Set up subdomains in Netlify:
   - `smashhouse.yourapp.com`
   - `aceclub.yourapp.com`
3. Each subdomain automatically loads the correct club data

**Pros:**

- ✅ Single codebase
- ✅ Easy to maintain
- ✅ One deployment for all clubs

**Cons:**

- ❌ All clubs share same Supabase database (but data is isolated)

---

## Adding New Clubs

### In Database:

```sql
INSERT INTO clubs (name, slug, primary_color, secondary_color)
VALUES ('Thunder Badminton', 'thunder-badminton', '#f59e0b', '#ef4444');
```

### Option A: Separate Deployment

1. Create new Netlify site
2. Update `club-config.js` with new slug
3. Deploy

### Option B: Same Deployment (Multi-Club Mode)

1. Add club to database (SQL above)
2. Set up subdomain: `thunder.yourapp.com`
3. Done! No code changes needed

---

## Best Practices

### Security

- ✅ Use Row Level Security (RLS) in Supabase
- ✅ Keep Supabase anon key public (it's designed for this)
- ✅ Don't expose service role key

### Performance

- ✅ All queries filter by `club_id`
- ✅ Indexes on `club_id` columns
- ✅ Supabase caching handles load

### Branding

- Store club colors in database
- Update dynamically on load
- Support custom logos

---

## Quick Start Checklist

- [ ] Run database migration SQL
- [ ] Get your club ID from database
- [ ] Update existing players with club_id
- [ ] Update existing matches with club_id
- [ ] Update code to use `club-config.js`
- [ ] Test that data loads correctly
- [ ] Deploy to Netlify

---

## Need Help?

Common issues:

1. **"No data showing"** → Check club_id is set correctly
2. **"Can't add players"** → Verify club exists in database
3. **"Multiple clubs showing"** → Add WHERE clause with club_id

For questions, check the code comments in:

- `club-config.js` - Configuration
- `app.js` - Updated query logic (coming next)
