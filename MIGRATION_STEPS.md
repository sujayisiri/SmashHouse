# Quick Migration Guide - Adding Multi-Club Support

Follow these steps IN ORDER to migrate your existing Smash House data to the multi-club system.

## ⚠️ Important: Backup First!

Before making any changes, backup your data in Supabase:

1. Go to Supabase Dashboard → Table Editor
2. Export `players` table
3. Export `matches` table

---

## Step 1: Create Clubs Table

Go to Supabase → SQL Editor and run:

```sql
-- Create clubs table
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_clubs_slug ON clubs(slug);
```

---

## Step 2: Insert Your Club

```sql
-- Insert Smash House
INSERT INTO clubs (name, slug, primary_color, secondary_color)
VALUES ('Smash House', 'smash-house', '#667eea', '#764ba2')
RETURNING id;
```

**⚠️ IMPORTANT: Copy the returned `id`** - you'll need it in the next steps!

For example, if it returns: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

---

## Step 3: Add club_id to Players Table

Replace `YOUR_CLUB_ID_HERE` with the ID from Step 2:

```sql
-- Add club_id column
ALTER TABLE players ADD COLUMN club_id UUID REFERENCES clubs(id);

-- Update all existing players with your club ID
UPDATE players SET club_id = 'YOUR_CLUB_ID_HERE';

-- Make it required
ALTER TABLE players ALTER COLUMN club_id SET NOT NULL;

-- Add unique constraint (player names must be unique within a club)
ALTER TABLE players DROP CONSTRAINT IF EXISTS unique_player_per_club;
ALTER TABLE players ADD CONSTRAINT unique_player_per_club UNIQUE (club_id, name);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_players_club ON players(club_id);
```

---

## Step 4: Add club_id to Matches Table

Replace `YOUR_CLUB_ID_HERE` with the same ID from Step 2:

```sql
-- Add club_id column
ALTER TABLE matches ADD COLUMN club_id UUID REFERENCES clubs(id);

-- Update all existing matches with your club ID
UPDATE matches SET club_id = 'YOUR_CLUB_ID_HERE';

-- Make it required
ALTER TABLE matches ALTER COLUMN club_id SET NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_matches_club ON matches(club_id);
```

---

## Step 5: Enable Row Level Security (Optional but Recommended)

```sql
-- Enable RLS
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Allow public read access (modify if you need authentication)
CREATE POLICY "Public read clubs" ON clubs
  FOR SELECT USING (true);

CREATE POLICY "Public access players" ON players
  FOR ALL USING (true);

CREATE POLICY "Public access matches" ON matches
  FOR ALL USING (true);
```

---

## Step 6: Test Your Application

1. Open your app: `yourapp.com?club=smash-house`
2. Verify you can see all your existing players
3. Verify you can see all your existing matches
4. Try adding a new player - should work!
5. Try adding a new match - should work!

---

## Step 7: Add Another Club (When Ready)

When you want to add another club:

```sql
INSERT INTO clubs (name, slug, primary_color, secondary_color)
VALUES ('Ace Badminton Club', 'ace-club', '#3b82f6', '#8b5cf6')
RETURNING id;
```

Then share this URL: `yourapp.com?club=ace-club`

---

## Troubleshooting

### "Club not loaded" error

- Check that the club exists in the `clubs` table
- Check that the slug in the URL matches the slug in database
- Try: `yourapp.com?club=smash-house`

### "No players showing"

- Verify players have `club_id` set: `SELECT * FROM players WHERE club_id IS NULL;`
- If any rows returned, run the UPDATE command from Step 3 again

### "Can't add players"

- Check that `club_id` column exists in players table
- Verify the club exists in clubs table
- Check browser console for specific error messages

### "Foreign key violation" error

- Make sure you've inserted your club first (Step 2)
- Use the correct club ID (the UUID returned from INSERT)

---

## Verification Queries

Run these to verify everything worked:

```sql
-- Check clubs
SELECT * FROM clubs;

-- Check players have club_id
SELECT COUNT(*) as total, COUNT(club_id) as with_club_id FROM players;

-- Check matches have club_id
SELECT COUNT(*) as total, COUNT(club_id) as with_club_id FROM matches;

-- Should all return same count
```

---

## Need Help?

If you get stuck:

1. Check the SQL error message in Supabase
2. Verify you replaced `YOUR_CLUB_ID_HERE` with actual UUID
3. Make sure you ran steps IN ORDER
4. Check browser console for JavaScript errors

---

## Success! 🎉

Once complete, your app now supports multiple clubs! Each club's data is completely isolated and you can easily add more clubs by inserting into the `clubs` table and sharing different URLs.
