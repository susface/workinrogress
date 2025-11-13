# Changelog

All notable changes to the CoverFlow Game Launcher project.

## [Unreleased] - 2025-11-13

### 🎉 Major Release - Complete UI Overhaul & Feature Set

### Added

#### New UI Components (1500+ lines of code)
- **View Mode Switcher** with 3 viewing options:
  - CoverFlow 3D (existing, enhanced)
  - Grid View (card-based layout)
  - List View (detailed table)
- **Filter Panel** with advanced filtering:
  - Platform filter (Steam, Epic, Xbox)
  - Full-text search
  - Genre filtering
  - Multiple sort options
  - Favorites-only mode
  - Show/hide hidden games toggle
- **Statistics Dashboard**:
  - Total games, play time, sessions, favorites
  - Most played games (top 5)
  - Recently played games
  - Platform breakdown chart
- **Duplicate Game Manager**:
  - Cross-platform duplicate detection
  - Per-platform hide functionality
  - Visual platform identification

#### Game Management Features
- **Play Time Tracking**:
  - Automatic session tracking
  - Total play time accumulation
  - Launch count tracking
  - Session history database
  - Average session time calculation
- **Favorites System**:
  - Mark games as favorites
  - Quick access to favorites list
  - Favorite-only filter mode
  - Visual favorite indicators
- **Hidden Games**:
  - Hide games from library
  - Show/hide toggle in filters
  - Manage hidden games list
- **User Ratings & Notes**:
  - 1-5 star rating system
  - Personal notes per game
  - Ratings display in list view
- **Smart Lists**:
  - Recently Played (configurable limit)
  - Most Played by time
  - Recently Added games
- **Advanced Filtering**:
  - Multi-criteria filtering
  - Dynamic sorting
  - Search across titles, descriptions, developers
  - SQL injection protected

#### Database Enhancements
- New columns: `is_favorite`, `is_hidden`, `launch_count`, `last_played`, `total_play_time`, `user_rating`, `user_notes`
- New `game_sessions` table for detailed tracking
- Automatic database migration for existing installations
- Indexed columns for performance
- Foreign key relationships

#### Documentation
- Reorganized all docs into `docs/` directory
- New comprehensive README.md with:
  - Quick start guide
  - Feature overview
  - Platform support table
  - Technology stack
  - Screenshots section
  - Contributing guidelines
- `docs/README.md` as documentation index
- `FEATURES.md` with complete API documentation
- `CHANGELOG.md` for version tracking

### Changed
- Updated index.html title to "CoverFlow Game Launcher"
- Reorganized documentation structure
- Enhanced README with modern layout
- Improved code organization

### Removed
- Deleted redundant `gameinfodownload-main.zip` file

### Fixed
- **Security Fixes** (from earlier commit):
  - CORS restricted to localhost only
  - Fixed command injection vulnerability
  - Added path traversal protection
  - Improved exception handling
  - Fixed memory leaks
- **Code Quality**:
  - Replaced bare except clauses
  - Added proper resource cleanup
  - Fixed promise resolution issues
  - Improved error logging

### Technical Details

#### API Additions (Electron IPC)
- `launchGame(launchCommand, gameId)` - Enhanced with tracking
- `endGameSession(gameId)` - End play session
- `getPlayTime(gameId)` - Get statistics
- `toggleFavorite(gameId)` - Toggle favorite
- `toggleHidden(gameId)` - Toggle hidden
- `getFavorites()` - Get favorites list
- `setRating(gameId, rating)` - Set 1-5 stars
- `setNotes(gameId, notes)` - Set personal notes
- `getRecentlyPlayed(limit)` - Recently played
- `getMostPlayed(limit)` - Most played
- `getRecentlyAdded(limit)` - Recently added
- `findDuplicates()` - Find cross-platform duplicates
- `filterGames(filters)` - Advanced filtering

#### API Additions (Flask REST)
- `GET /api/games/<id>/playtime` - Play time stats
- `POST /api/games/<id>/session/start` - Start session
- `POST /api/games/session/<id>/end` - End session
- `POST /api/games/<id>/favorite` - Toggle favorite
- `POST /api/games/<id>/hidden` - Toggle hidden
- `POST /api/games/<id>/rating` - Set rating
- `POST /api/games/<id>/notes` - Set notes
- `GET /api/games/favorites` - Get favorites
- `GET /api/games/recently-played` - Recently played
- `GET /api/games/most-played` - Most played
- `GET /api/games/recently-added` - Recently added
- `GET /api/games/duplicates` - Find duplicates
- `POST /api/games/filter` - Advanced filtering

#### File Structure
```
/
├── docs/                    # Documentation (NEW)
│   ├── README.md
│   ├── QUICKSTART.md
│   ├── ELECTRON.md
│   ├── GAMES_INTEGRATION.md
│   └── FEATURES.md
├── gameinfodownload-main/   # Python backend
│   ├── data/
│   │   └── storage.py       # Enhanced with 250+ lines
│   ├── server.py            # Enhanced with 13 endpoints
│   └── game_scanner.py      # Security fixes
├── ui-components.js         # NEW: 800+ lines
├── ui-components.css        # NEW: 700+ lines
├── main.js                  # Enhanced with 320+ lines
├── preload.js               # Enhanced with 12 methods
├── index.html               # Updated with new includes
├── .gitignore               # NEW: Proper ignore rules
├── CHANGELOG.md             # NEW: This file
└── README.md                # Complete rewrite

Total: ~2000+ new lines of production code
```

### UI/UX Improvements
- Modern glassmorphism design
- Smooth animations throughout
- Responsive mobile/tablet support
- Custom scrollbar styling
- Hover effects and micro-interactions
- Keyboard navigation
- Dark theme optimized
- Accessibility considerations

### Performance
- Indexed database queries
- Event delegation for efficiency
- CSS transforms for smooth animations
- Lazy loading where appropriate
- Optimized re-renders

### Browser/Platform Support
- Electron Desktop App (Windows, macOS, Linux)
- Modern browsers (Chrome, Firefox, Edge, Safari)
- Mobile responsive (iOS Safari, Android Chrome)

### Migration Notes
- Existing databases automatically migrate
- No data loss during upgrade
- New columns added with sensible defaults
- Backwards compatible with previous versions

### Known Issues
- None reported

### Coming Soon
- GOG Galaxy integration
- Origin/EA App support
- Cloud save backup
- Achievement tracking
- Themes system
- Export statistics to CSV

---

## [1.0.0] - Initial Release
- 3D CoverFlow interface
- Three.js rendering
- Keyboard and gamepad support
- Settings panel
- Search functionality
- Steam, Epic, Xbox integration
- SQLite database
- Electron desktop app
