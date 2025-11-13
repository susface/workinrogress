# CoverFlow Game Launcher - New Features

## Overview
This document describes the new features added to the CoverFlow Game Launcher, including play time tracking, favorites management, advanced filtering, and more.

## Features Implemented

### 1. Play Time Tracking
Track how long you play each game with detailed session management.

**Features:**
- Automatic session start when launching a game
- Session end tracking (manual or automatic)
- Total play time accumulation
- Average session time calculation
- Session count tracking

**API Methods:**
- `launchGame(launchCommand, gameId)` - Start a game and begin tracking
- `endGameSession(gameId)` - End the current game session
- `getPlayTime(gameId)` - Get play time statistics

**Database Fields:**
- `total_play_time` - Total seconds played
- `launch_count` - Number of times launched
- `last_played` - Timestamp of last launch
- `game_sessions` table - Detailed session history

---

### 2. Favorites & Hidden Games
Mark games as favorites or hide them from the main library.

**Features:**
- Toggle favorite status with a single click
- Hide games you don't want to see
- Quick access to favorites list
- Favorites persist across sessions

**API Methods:**
- `toggleFavorite(gameId)` - Toggle favorite status
- `toggleHidden(gameId)` - Toggle hidden status
- `getFavorites()` - Get all favorite games

**Database Fields:**
- `is_favorite` - Boolean flag for favorites
- `is_hidden` - Boolean flag for hidden games

---

### 3. User Ratings & Notes
Add personal ratings and notes to your games.

**Features:**
- 1-5 star rating system
- Personal notes for each game
- Notes support for strategies, tips, passwords, etc.

**API Methods:**
- `setRating(gameId, rating)` - Set 1-5 star rating
- `setNotes(gameId, notes)` - Set personal notes

**Database Fields:**
- `user_rating` - Integer 1-5
- `user_notes` - Text field for notes

---

### 4. Smart Lists & Sorting
Multiple ways to view and organize your game library.

**Recently Played:**
- Shows games you've played recently
- Sorted by last played timestamp
- Excludes hidden games

**Most Played:**
- Games sorted by total play time
- See which games you've spent the most time on
- Great for finding your favorites

**Recently Added:**
- Newest games in your library
- Sorted by date added
- Perfect for finding new installations

**API Methods:**
- `getRecentlyPlayed(limit)` - Default limit: 10
- `getMostPlayed(limit)` - Default limit: 10
- `getRecentlyAdded(limit)` - Default limit: 10

---

### 5. Duplicate Detection
Find games you own on multiple platforms.

**Features:**
- Automatically detects same game across platforms
- Case-insensitive title matching
- Shows all platforms where game is installed
- Helps manage library across Steam, Epic, Xbox, etc.

**API Methods:**
- `findDuplicates()` - Returns list of duplicate games

**Returns:**
```javascript
{
  title: "Game Name",
  count: 2,
  platforms: ["steam", "epic"],
  game_ids: [1, 5]
}
```

---

### 6. Advanced Filtering
Powerful filtering and search capabilities.

**Filter Options:**
- **Platform:** Filter by Steam, Epic, Xbox, etc.
- **Genre:** Search by game genre
- **Search Query:** Search titles, descriptions, developers
- **Show Hidden:** Include/exclude hidden games
- **Favorites Only:** Show only favorite games
- **Sort By:** title, last_played, total_play_time, launch_count, created_at, release_date
- **Sort Order:** ASC or DESC

**API Methods:**
- `filterGames(filters)` - Advanced filtering

**Example:**
```javascript
const filters = {
  platform: 'steam',
  genre: 'Action',
  search_query: 'dark',
  show_hidden: false,
  favorites_only: false,
  sort_by: 'total_play_time',
  sort_order: 'DESC'
};

const result = await window.electronAPI.filterGames(filters);
```

---

## Database Schema

### Games Table (New Fields)
```sql
is_favorite INTEGER DEFAULT 0          -- 0 or 1
is_hidden INTEGER DEFAULT 0            -- 0 or 1
launch_count INTEGER DEFAULT 0         -- Number of launches
last_played TIMESTAMP                  -- Last launch time
total_play_time INTEGER DEFAULT 0      -- Total seconds played
user_rating INTEGER                    -- 1-5 stars
user_notes TEXT                        -- Personal notes
```

### Game Sessions Table (New)
```sql
CREATE TABLE game_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration INTEGER,
  FOREIGN KEY (game_id) REFERENCES games(id)
)
```

---

## REST API Endpoints (Flask Server)

### Play Time
- `GET /api/games/<id>/playtime` - Get play time stats
- `POST /api/games/<id>/session/start` - Start session
- `POST /api/games/session/<session_id>/end` - End session

### Favorites & Hidden
- `POST /api/games/<id>/favorite` - Toggle favorite
- `POST /api/games/<id>/hidden` - Toggle hidden
- `GET /api/games/favorites` - Get all favorites

### Ratings & Notes
- `POST /api/games/<id>/rating` - Set rating (1-5)
- `POST /api/games/<id>/notes` - Set notes

### Special Lists
- `GET /api/games/recently-played?limit=10` - Recently played
- `GET /api/games/most-played?limit=10` - Most played
- `GET /api/games/recently-added?limit=10` - Recently added
- `GET /api/games/duplicates` - Find duplicates

### Filtering
- `POST /api/games/filter` - Advanced filtering

---

## Migration Notes

Existing databases will be automatically migrated when the application starts. New columns will be added with default values:
- All games default to `is_favorite = 0`
- All games default to `is_hidden = 0`
- All games default to `launch_count = 0`
- All games default to `total_play_time = 0`

No data loss occurs during migration.

---

## Usage Examples

### Track Play Time
```javascript
// Launch a game
const gameId = 123;
const launchCommand = 'steam://rungameid/12345';
await window.electronAPI.launchGame(launchCommand, gameId);

// Later, when done playing
await window.electronAPI.endGameSession(gameId);

// Get statistics
const stats = await window.electronAPI.getPlayTime(gameId);
console.log(`Total playtime: ${stats.total_play_time} seconds`);
console.log(`Launched: ${stats.launch_count} times`);
```

### Manage Favorites
```javascript
// Toggle favorite
const result = await window.electronAPI.toggleFavorite(gameId);
console.log(`Favorite: ${result.is_favorite}`);

// Get all favorites
const favorites = await window.electronAPI.getFavorites();
console.log(`You have ${favorites.games.length} favorite games`);
```

### Find Duplicates
```javascript
const duplicates = await window.electronAPI.findDuplicates();
duplicates.forEach(dup => {
  console.log(`${dup.title} is on: ${dup.platforms.join(', ')}`);
});
```

### Advanced Search
```javascript
// Find favorite Steam games with "dark" in title
const result = await window.electronAPI.filterGames({
  platform: 'steam',
  search_query: 'dark',
  favorites_only: true,
  sort_by: 'total_play_time',
  sort_order: 'DESC'
});
```

---

## Performance Considerations

- **Indexes**: Created on `last_played`, `is_favorite`, and `is_hidden` for fast queries
- **Session Tracking**: Minimal overhead, only updates on launch/end
- **Database**: SQLite handles all features efficiently
- **Memory**: Active sessions stored in Map for O(1) lookup

---

## Future Enhancements

Potential features for future versions:
- Automatic session end detection (process monitoring)
- Play time goals and achievements
- Statistics dashboard with charts
- Export play time data to CSV
- Steam playtime import
- Weekly/monthly playtime reports
- Game recommendation engine based on play patterns
