# CoverFlow Game Launcher

A beautiful 3D game launcher with CoverFlow-style interface, featuring comprehensive game library management, play time tracking, and cross-platform support.

![CoverFlow Interface](https://via.placeholder.com/800x400?text=CoverFlow+Game+Launcher)

## ✨ Key Features

- **🎮 Multi-Platform Support**: Steam, Epic Games, Xbox/Game Pass integration
- **⏱️ Play Time Tracking**: Automatic session tracking and statistics
- **⭐ Favorites & Collections**: Organize your library your way
- **🔍 Advanced Search & Filter**: Find games instantly
- **📊 Statistics Dashboard**: Visualize your gaming habits
- **🎨 Multiple View Modes**: CoverFlow 3D, Grid, and List views
- **🎯 Duplicate Detection**: Manage games across multiple platforms
- **⚙️ Highly Customizable**: Themes, layouts, and preferences

## 🚀 Quick Start

### Desktop App (Recommended)

```bash
# Install dependencies
npm install

# Run the app
npm start

# Build for your platform
npm run build:win   # Windows
npm run build:mac   # macOS
npm run build:linux # Linux
```

### Web Version

```bash
# Install Python dependencies
cd gameinfodownload-main
pip install -r requirements.txt

# Start the Flask server
python server.py

# Open index.html in your browser
```

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](docs/) directory:

- **[Quick Start Guide](docs/QUICKSTART.md)** - Get running in 5 minutes
- **[Features Overview](docs/FEATURES.md)** - All new features explained
- **[Electron Desktop App](docs/ELECTRON.md)** - Desktop application guide
- **[Game Integration](docs/GAMES_INTEGRATION.md)** - Steam/Epic/Xbox setup
- **[Full Documentation Index](docs/README.md)** - Complete docs

## 🎮 Supported Platforms

| Platform | Status | Features |
|----------|--------|----------|
| Steam | ✅ Full | Auto-detection, metadata, box art |
| Epic Games | ✅ Full | Auto-detection, metadata, box art |
| Xbox/Game Pass | ✅ Full | Windows UWP detection, metadata |
| GOG Galaxy | 🔜 Planned | Coming soon |
| Origin/EA | 🔜 Planned | Coming soon |

## 📸 Screenshots

<table>
  <tr>
    <td><img src="https://via.placeholder.com/400x250?text=CoverFlow+View" alt="CoverFlow View"/></td>
    <td><img src="https://via.placeholder.com/400x250?text=Grid+View" alt="Grid View"/></td>
  </tr>
  <tr>
    <td><img src="https://via.placeholder.com/400x250?text=Statistics" alt="Statistics"/></td>
    <td><img src="https://via.placeholder.com/400x250?text=Filters" alt="Filters"/></td>
  </tr>
</table>

## 🛠️ Technology Stack

- **Frontend**: Three.js, Vanilla JavaScript
- **Desktop**: Electron 28
- **Backend**: Python 3.7+, Flask
- **Database**: SQLite (better-sqlite3)
- **Game Scanners**: Steam VDF, Epic GraphQL, Windows UWP

## 🎯 Key Features Explained

### Play Time Tracking
- Automatic session start when launching games
- Total play time and session history
- Average session time calculations
- Launch count tracking

### Smart Organization
- Favorites system for quick access
- Hide games you don't want to see
- Recently played / Most played lists
- Recently added games

### Advanced Filtering
- Filter by platform, genre, or custom query
- Sort by play time, last played, title, etc.
- Favorites-only mode
- Show/hide hidden games

### Duplicate Detection
- Find same games across platforms
- Manage cross-platform libraries
- One-click access to all versions

## 🤝 Contributing

Contributions are welcome! Please read the [Contributing Guide](docs/CONTRIBUTING.md) first.

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- Inspired by Apple's classic CoverFlow interface
- Built with [Three.js](https://threejs.org/)
- Game metadata from Steam, Epic, and Microsoft APIs

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/coverflow-launcher/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/coverflow-launcher/discussions)
- **Documentation**: [docs/](docs/)

---

**Made with ❤️ for gamers who love beautiful interfaces**
