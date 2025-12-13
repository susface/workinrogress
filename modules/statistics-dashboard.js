// Statistics Dashboard Module
// Comprehensive gaming statistics and library insights

class StatisticsDashboard {
    constructor() {
        this.activeModal = null;
        this.stats = null;
        this.completionData = this.loadCompletionData();
        this.abortController = null;
    }

    // Load completion data from localStorage
    loadCompletionData() {
        try {
            const saved = localStorage.getItem('game-completion-data');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('[STATS_DASHBOARD] Failed to load completion data:', error);
            return {};
        }
    }

    // Save completion data
    saveCompletionData() {
        try {
            localStorage.setItem('game-completion-data', JSON.stringify(this.completionData));
        } catch (error) {
            console.error('[STATS_DASHBOARD] Failed to save completion data:', error);
        }
    }

    // Set game completion status
    setGameCompletion(gameId, status) {
        // Status can be: 'not_started', 'in_progress', 'completed', 'abandoned', '100%'
        this.completionData[gameId] = {
            status,
            updatedAt: Date.now()
        };
        this.saveCompletionData();
    }

    // Get all games
    getGames() {
        const coverflowObj = window.coverflow || window.coverflowManager;
        return coverflowObj?.allAlbums || coverflowObj?.games || [];
    }

    // Calculate library statistics
    async calculateStats() {
        const games = this.getGames();

        if (games.length === 0) {
            return null;
        }

        // Basic counts
        const totalGames = games.length;
        const favoriteGames = games.filter(g => g.is_favorite).length;
        const hiddenGames = games.filter(g => g.is_hidden).length;
        const vrGames = games.filter(g => g.has_vr_support).length;

        // Platform breakdown
        const platformCounts = {};
        games.forEach(game => {
            const platform = game.platform || 'Unknown';
            platformCounts[platform] = (platformCounts[platform] || 0) + 1;
        });

        // Genre breakdown
        const genreCounts = {};
        games.forEach(game => {
            const genres = Array.isArray(game.genres) ? game.genres : [];
            genres.forEach(genre => {
                genreCounts[genre] = (genreCounts[genre] || 0) + 1;
            });
        });

        // Playtime stats
        const totalPlaytime = games.reduce((sum, g) => sum + (g.total_play_time || 0), 0);
        const playedGames = games.filter(g => (g.total_play_time || 0) > 0);
        const unplayedGames = games.filter(g => (g.total_play_time || 0) === 0);
        const avgPlaytime = playedGames.length > 0
            ? totalPlaytime / playedGames.length
            : 0;

        // Most played games
        const mostPlayed = [...games]
            .filter(g => g.total_play_time > 0)
            .sort((a, b) => (b.total_play_time || 0) - (a.total_play_time || 0))
            .slice(0, 10);

        // Recently played
        const recentlyPlayed = [...games]
            .filter(g => g.last_played)
            .sort((a, b) => new Date(b.last_played) - new Date(a.last_played))
            .slice(0, 10);

        // Completion stats
        const completionStats = this.calculateCompletionStats(games);

        // Library value estimation (based on typical Steam game prices)
        const libraryValue = this.estimateLibraryValue(games);

        // Time analysis
        const timeAnalysis = this.analyzePlaytimePatterns(games);

        // Rating distribution
        const ratingDistribution = {};
        games.forEach(game => {
            if (game.user_rating) {
                ratingDistribution[game.user_rating] = (ratingDistribution[game.user_rating] || 0) + 1;
            }
        });

        return {
            totalGames,
            favoriteGames,
            hiddenGames,
            vrGames,
            platformCounts,
            genreCounts,
            totalPlaytime,
            playedGames: playedGames.length,
            unplayedGames: unplayedGames.length,
            avgPlaytime,
            mostPlayed,
            recentlyPlayed,
            completionStats,
            libraryValue,
            timeAnalysis,
            ratingDistribution
        };
    }

    calculateCompletionStats(games) {
        const stats = {
            not_started: 0,
            in_progress: 0,
            completed: 0,
            abandoned: 0,
            '100%': 0,
            unknown: 0
        };

        games.forEach(game => {
            const completion = this.completionData[game.id];
            if (completion) {
                stats[completion.status] = (stats[completion.status] || 0) + 1;
            } else if (game.total_play_time > 0) {
                stats.in_progress++;
            } else {
                stats.not_started++;
            }
        });

        return stats;
    }

    estimateLibraryValue(games) {
        // Rough estimation based on platform and game count
        // These are average game prices
        const platformPrices = {
            'Steam': 25,
            'Epic': 30,
            'Xbox': 35,
            'GOG': 20,
            'Custom': 15,
            'Unknown': 20
        };

        let totalValue = 0;
        let gamesWithValue = 0;

        games.forEach(game => {
            const platform = game.platform || 'Unknown';
            const basePrice = platformPrices[platform] || 20;

            // Adjust based on game age if release date is available
            let adjustedPrice = basePrice;
            if (game.release_date) {
                const releaseYear = new Date(game.release_date).getFullYear();
                const yearsOld = new Date().getFullYear() - releaseYear;
                // Older games are typically cheaper
                adjustedPrice = Math.max(5, basePrice - (yearsOld * 2));
            }

            totalValue += adjustedPrice;
            gamesWithValue++;
        });

        return {
            estimated: Math.round(totalValue),
            currency: 'USD',
            gamesValued: gamesWithValue,
            averagePerGame: gamesWithValue > 0 ? Math.round(totalValue / gamesWithValue) : 0
        };
    }

    analyzePlaytimePatterns(games) {
        const playedGames = games.filter(g => g.total_play_time > 0);

        if (playedGames.length === 0) {
            return null;
        }

        // Categorize by playtime
        const categories = {
            brief: playedGames.filter(g => g.total_play_time < 3600).length, // < 1 hour
            short: playedGames.filter(g => g.total_play_time >= 3600 && g.total_play_time < 18000).length, // 1-5 hours
            medium: playedGames.filter(g => g.total_play_time >= 18000 && g.total_play_time < 72000).length, // 5-20 hours
            long: playedGames.filter(g => g.total_play_time >= 72000 && g.total_play_time < 360000).length, // 20-100 hours
            marathon: playedGames.filter(g => g.total_play_time >= 360000).length // 100+ hours
        };

        // Find the longest played game
        const longestPlayed = playedGames.reduce((max, g) =>
            (g.total_play_time || 0) > (max.total_play_time || 0) ? g : max
        , playedGames[0]);

        return {
            categories,
            longestPlayed: {
                title: longestPlayed.title || longestPlayed.name,
                playtime: longestPlayed.total_play_time
            }
        };
    }

    // Format seconds to readable time
    formatPlaytime(seconds) {
        if (!seconds || seconds < 60) return '< 1 min';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours === 0) return `${minutes}m`;
        if (hours >= 24) {
            const days = Math.floor(hours / 24);
            const remainingHours = hours % 24;
            return `${days}d ${remainingHours}h`;
        }
        return `${hours}h ${minutes}m`;
    }

    // Show the statistics dashboard
    async showDashboard() {
        if (this.activeModal) {
            this.closeModal();
        }

        // Create abort controller for event cleanup
        this.abortController = new AbortController();

        // Show loading state
        const modal = document.createElement('div');
        modal.id = 'statistics-dashboard-modal';
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: auto;
        `;

        modal.innerHTML = `
            <div class="dashboard-container" style="
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 15px;
                padding: 25px;
                max-width: 1200px;
                width: 95%;
                max-height: 90vh;
                overflow: auto;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            ">
                <div class="dashboard-loading" style="text-align: center; padding: 60px;">
                    <div class="spinner" style="width: 50px; height: 50px; border: 3px solid rgba(255,255,255,0.1); border-top: 3px solid #4fc3f7; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                    <p style="color: rgba(255,255,255,0.7);">Calculating statistics...</p>
                </div>
            </div>
            <style>
                @keyframes spin { to { transform: rotate(360deg); } }
            </style>
        `;

        document.body.appendChild(modal);
        this.activeModal = modal;

        // Calculate stats
        const stats = await this.calculateStats();

        if (!stats) {
            modal.querySelector('.dashboard-container').innerHTML = `
                <div style="text-align: center; padding: 60px;">
                    <p style="color: rgba(255,255,255,0.7); font-size: 18px;">No games found in library</p>
                    <p style="color: rgba(255,255,255,0.5);">Scan for games in Settings to see statistics</p>
                    <button id="close-stats-btn" class="btn" style="margin-top: 20px; padding: 10px 25px;">Close</button>
                </div>
            `;
            modal.querySelector('#close-stats-btn').addEventListener('click', () => this.closeModal(), { signal: this.abortController?.signal });
            return;
        }

        this.stats = stats;
        this.renderDashboard(modal, stats);
    }

    renderDashboard(modal, stats) {
        const container = modal.querySelector('.dashboard-container');

        container.innerHTML = `
            <div class="dashboard-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <h2 style="margin: 0; color: #4fc3f7;">
                    <span style="margin-right: 10px;">📊</span>
                    Library Statistics
                </h2>
                <button id="close-dashboard" class="btn" style="font-size: 20px; padding: 5px 12px; background: rgba(255,255,255,0.1);">×</button>
            </div>

            <!-- Quick Stats Cards -->
            <div class="stats-cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 25px;">
                <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 36px; font-weight: bold; color: white;">${stats.totalGames}</div>
                    <div style="color: rgba(255,255,255,0.8); font-size: 14px;">Total Games</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 20px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 36px; font-weight: bold; color: white;">${stats.playedGames}</div>
                    <div style="color: rgba(255,255,255,0.8); font-size: 14px;">Played</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%); padding: 20px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 36px; font-weight: bold; color: white;">${stats.unplayedGames}</div>
                    <div style="color: rgba(255,255,255,0.8); font-size: 14px;">Unplayed</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 36px; font-weight: bold; color: white;">${this.formatPlaytime(stats.totalPlaytime)}</div>
                    <div style="color: rgba(255,255,255,0.8); font-size: 14px;">Total Playtime</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 36px; font-weight: bold; color: white;">$${stats.libraryValue.estimated}</div>
                    <div style="color: rgba(255,255,255,0.8); font-size: 14px;">Est. Library Value</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); padding: 20px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 36px; font-weight: bold; color: white;">${stats.favoriteGames}</div>
                    <div style="color: rgba(255,255,255,0.8); font-size: 14px;">Favorites</div>
                </div>
            </div>

            <!-- Main Content Grid -->
            <div class="dashboard-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px;">

                <!-- Platform Distribution -->
                <div class="dashboard-section" style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px;">
                    <h3 style="margin: 0 0 15px 0; color: #81c784; display: flex; align-items: center; gap: 10px;">
                        <span>🎮</span> Platform Distribution
                    </h3>
                    <div class="platform-bars" style="display: flex; flex-direction: column; gap: 10px;">
                        ${Object.entries(stats.platformCounts)
                            .sort((a, b) => b[1] - a[1])
                            .map(([platform, count]) => {
                                const percentage = (count / stats.totalGames * 100).toFixed(1);
                                const colors = {
                                    'Steam': '#66c0f4',
                                    'Epic': '#2f2f2f',
                                    'Xbox': '#107c10',
                                    'GOG': '#8a2be2',
                                    'Custom': '#ff9800'
                                };
                                return `
                                    <div>
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                            <span style="color: rgba(255,255,255,0.9);">${this.escapeHtml(platform)}</span>
                                            <span style="color: rgba(255,255,255,0.6);">${count} (${percentage}%)</span>
                                        </div>
                                        <div style="background: rgba(255,255,255,0.1); border-radius: 5px; height: 8px; overflow: hidden;">
                                            <div style="background: ${colors[platform] || '#4fc3f7'}; height: 100%; width: ${percentage}%; transition: width 0.3s;"></div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                    </div>
                </div>

                <!-- Completion Status -->
                <div class="dashboard-section" style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px;">
                    <h3 style="margin: 0 0 15px 0; color: #81c784; display: flex; align-items: center; gap: 10px;">
                        <span>✅</span> Completion Status
                    </h3>
                    <div class="completion-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                        ${this.renderCompletionCard('Not Started', stats.completionStats.not_started, '#9e9e9e')}
                        ${this.renderCompletionCard('In Progress', stats.completionStats.in_progress, '#ff9800')}
                        ${this.renderCompletionCard('Completed', stats.completionStats.completed, '#4CAF50')}
                        ${this.renderCompletionCard('Abandoned', stats.completionStats.abandoned, '#f44336')}
                    </div>
                    <div style="margin-top: 15px; text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: #4fc3f7;">
                            ${stats.playedGames > 0 ? Math.round((stats.completionStats.completed / stats.totalGames) * 100) : 0}%
                        </div>
                        <div style="color: rgba(255,255,255,0.6); font-size: 13px;">Completion Rate</div>
                    </div>
                </div>

                <!-- Playtime Categories -->
                ${stats.timeAnalysis ? `
                <div class="dashboard-section" style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px;">
                    <h3 style="margin: 0 0 15px 0; color: #81c784; display: flex; align-items: center; gap: 10px;">
                        <span>⏱️</span> Playtime Distribution
                    </h3>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${this.renderTimeCategory('< 1 hour', stats.timeAnalysis.categories.brief, stats.playedGames, '#ef5350')}
                        ${this.renderTimeCategory('1-5 hours', stats.timeAnalysis.categories.short, stats.playedGames, '#ff9800')}
                        ${this.renderTimeCategory('5-20 hours', stats.timeAnalysis.categories.medium, stats.playedGames, '#ffeb3b')}
                        ${this.renderTimeCategory('20-100 hours', stats.timeAnalysis.categories.long, stats.playedGames, '#4CAF50')}
                        ${this.renderTimeCategory('100+ hours', stats.timeAnalysis.categories.marathon, stats.playedGames, '#2196F3')}
                    </div>
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);">
                        <div style="color: rgba(255,255,255,0.6); font-size: 12px;">Most Played Game:</div>
                        <div style="color: white; font-weight: bold;">${this.escapeHtml(stats.timeAnalysis.longestPlayed.title)}</div>
                        <div style="color: #4fc3f7;">${this.formatPlaytime(stats.timeAnalysis.longestPlayed.playtime)}</div>
                    </div>
                </div>
                ` : ''}

                <!-- Top Genres -->
                <div class="dashboard-section" style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px;">
                    <h3 style="margin: 0 0 15px 0; color: #81c784; display: flex; align-items: center; gap: 10px;">
                        <span>🏷️</span> Top Genres
                    </h3>
                    ${Object.keys(stats.genreCounts).length > 0 ? `
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${Object.entries(stats.genreCounts)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 12)
                                .map(([genre, count]) => `
                                    <span style="padding: 6px 12px; background: rgba(79, 195, 247, 0.2); border: 1px solid rgba(79, 195, 247, 0.4); border-radius: 15px; font-size: 13px; color: rgba(255,255,255,0.9);">
                                        ${this.escapeHtml(genre)} <span style="color: rgba(255,255,255,0.5);">(${count})</span>
                                    </span>
                                `).join('')}
                        </div>
                    ` : `
                        <p style="color: rgba(255,255,255,0.5); font-style: italic;">No genre data available</p>
                    `}
                </div>

                <!-- Most Played Games -->
                <div class="dashboard-section" style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px;">
                    <h3 style="margin: 0 0 15px 0; color: #81c784; display: flex; align-items: center; gap: 10px;">
                        <span>🏆</span> Most Played
                    </h3>
                    <div style="display: flex; flex-direction: column; gap: 10px; max-height: 300px; overflow-y: auto;">
                        ${stats.mostPlayed.slice(0, 5).map((game, i) => `
                            <div style="display: flex; align-items: center; gap: 12px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                                <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 14px;">
                                    ${i + 1}
                                </div>
                                <div style="flex: 1; min-width: 0;">
                                    <div style="color: white; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                        ${this.escapeHtml(game.title || game.name)}
                                    </div>
                                    <div style="color: rgba(255,255,255,0.5); font-size: 12px;">
                                        ${game.platform || 'Unknown'}
                                    </div>
                                </div>
                                <div style="color: #4fc3f7; font-weight: bold; font-size: 14px;">
                                    ${this.formatPlaytime(game.total_play_time)}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Recently Played -->
                <div class="dashboard-section" style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px;">
                    <h3 style="margin: 0 0 15px 0; color: #81c784; display: flex; align-items: center; gap: 10px;">
                        <span>🕐</span> Recently Played
                    </h3>
                    <div style="display: flex; flex-direction: column; gap: 10px; max-height: 300px; overflow-y: auto;">
                        ${stats.recentlyPlayed.length > 0 ? stats.recentlyPlayed.slice(0, 5).map(game => `
                            <div style="display: flex; align-items: center; gap: 12px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                                <div style="flex: 1; min-width: 0;">
                                    <div style="color: white; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                        ${this.escapeHtml(game.title || game.name)}
                                    </div>
                                    <div style="color: rgba(255,255,255,0.5); font-size: 12px;">
                                        ${new Date(game.last_played).toLocaleDateString()}
                                    </div>
                                </div>
                                <div style="color: #81c784; font-size: 13px;">
                                    ${this.formatPlaytime(game.total_play_time)}
                                </div>
                            </div>
                        `).join('') : `
                            <p style="color: rgba(255,255,255,0.5); font-style: italic; text-align: center; padding: 20px;">No recent activity</p>
                        `}
                    </div>
                </div>
            </div>

            <!-- Fun Facts Section -->
            <div class="fun-facts" style="margin-top: 25px; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 12px;">
                <h3 style="margin: 0 0 15px 0; color: #81c784; display: flex; align-items: center; gap: 10px;">
                    <span>💡</span> Insights
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                    ${this.generateInsights(stats)}
                </div>
            </div>
        `;

        // Setup event listeners with abort signal for cleanup
        const signal = this.abortController?.signal;

        modal.querySelector('#close-dashboard').addEventListener('click', () => {
            this.closeModal();
        }, { signal });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        }, { signal });
    }

    renderCompletionCard(label, count, color) {
        return `
            <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; text-align: center; border-left: 3px solid ${color};">
                <div style="font-size: 24px; font-weight: bold; color: ${color};">${count}</div>
                <div style="color: rgba(255,255,255,0.6); font-size: 12px;">${label}</div>
            </div>
        `;
    }

    renderTimeCategory(label, count, total, color) {
        const percentage = total > 0 ? (count / total * 100).toFixed(1) : 0;
        return `
            <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 13px;">
                    <span style="color: rgba(255,255,255,0.8);">${label}</span>
                    <span style="color: rgba(255,255,255,0.5);">${count}</span>
                </div>
                <div style="background: rgba(255,255,255,0.1); border-radius: 4px; height: 6px; overflow: hidden;">
                    <div style="background: ${color}; height: 100%; width: ${percentage}%;"></div>
                </div>
            </div>
        `;
    }

    generateInsights(stats) {
        const insights = [];

        // Backlog insight
        const backlogPercentage = ((stats.unplayedGames / stats.totalGames) * 100).toFixed(0);
        if (backlogPercentage > 50) {
            insights.push({
                icon: '📚',
                text: `Your backlog is ${backlogPercentage}% of your library. Time to start some new games!`
            });
        } else if (backlogPercentage < 20) {
            insights.push({
                icon: '🎯',
                text: `Only ${backlogPercentage}% unplayed games - you're doing great at playing your library!`
            });
        }

        // Average playtime insight
        const avgHours = Math.floor(stats.avgPlaytime / 3600);
        if (avgHours >= 20) {
            insights.push({
                icon: '🎮',
                text: `You average ${avgHours} hours per game - you really commit to your games!`
            });
        } else if (avgHours < 5) {
            insights.push({
                icon: '🦋',
                text: `You average ${avgHours} hours per game - you like variety!`
            });
        }

        // Platform preference
        const topPlatform = Object.entries(stats.platformCounts)
            .sort((a, b) => b[1] - a[1])[0];
        if (topPlatform) {
            const platformEmoji = {
                'Steam': '💨',
                'Epic': '🎭',
                'Xbox': '🎯',
                'GOG': '🌌'
            };
            insights.push({
                icon: platformEmoji[topPlatform[0]] || '🎮',
                text: `${topPlatform[0]} is your primary platform with ${topPlatform[1]} games (${((topPlatform[1] / stats.totalGames) * 100).toFixed(0)}%)`
            });
        }

        // Value insight
        const valuePerHour = stats.totalPlaytime > 0
            ? (stats.libraryValue.estimated / (stats.totalPlaytime / 3600)).toFixed(2)
            : 0;
        insights.push({
            icon: '💰',
            text: `Your gaming costs approximately $${valuePerHour} per hour of entertainment`
        });

        // Favorite games insight
        if (stats.favoriteGames > 0) {
            insights.push({
                icon: '⭐',
                text: `You've marked ${stats.favoriteGames} games as favorites (${((stats.favoriteGames / stats.totalGames) * 100).toFixed(0)}% of library)`
            });
        }

        return insights.map(insight => `
            <div style="display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                <span style="font-size: 24px;">${insight.icon}</span>
                <span style="color: rgba(255,255,255,0.8); font-size: 14px; line-height: 1.4;">${insight.text}</span>
            </div>
        `).join('');
    }

    closeModal() {
        // Abort all event listeners
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }

        if (this.activeModal) {
            this.activeModal.remove();
            this.activeModal = null;
        }

        // Clear stats to free memory
        this.stats = null;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    destroy() {
        this.closeModal();
        this.completionData = null;
    }
}

// Initialize globally
if (typeof window !== 'undefined') {
    window.statisticsDashboard = new StatisticsDashboard();
}
