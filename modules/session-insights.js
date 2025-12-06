/**
 * Session Insights Module
 * Displays gaming session statistics and insights
 */

class SessionInsights {
    constructor() {
        this.stats = null;
        this.currentPeriod = 'week'; // 'week', 'month', 'year'
        this.insightsVisible = false;
    }

    /**
     * Initialize session insights panel
     */
    initializeSessionInsights() {
        // Create insights panel
        this.createInsightsPanel();

        // Load initial stats
        this.loadStats();

        console.log('[SESSION_INSIGHTS] Session insights initialized');
    }

    /**
     * Create insights panel UI
     */
    createInsightsPanel() {
        const existingPanel = document.getElementById('session-insights-panel');
        if (existingPanel) return;

        const panel = document.createElement('div');
        panel.id = 'session-insights-panel';
        panel.className = 'insights-panel';
        panel.innerHTML = `
            <div class="insights-header">
                <h3>📊 Gaming Insights</h3>
                <div class="insights-controls">
                    <select id="insights-period">
                        <option value="week">Last 7 Days</option>
                        <option value="month">Last 30 Days</option>
                        <option value="year">Last Year</option>
                    </select>
                    <button class="insights-close-btn">×</button>
                </div>
            </div>
            <div class="insights-body">
                <div class="insights-stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">⏱️</div>
                        <div class="stat-value" id="total-playtime">--</div>
                        <div class="stat-label">Total Playtime</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">🎮</div>
                        <div class="stat-value" id="games-played">--</div>
                        <div class="stat-label">Games Played</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📈</div>
                        <div class="stat-value" id="avg-session">--</div>
                        <div class="stat-label">Avg Session</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">🔥</div>
                        <div class="stat-value" id="session-streak">--</div>
                        <div class="stat-label">Day Streak</div>
                    </div>
                </div>

                <div class="insights-section">
                    <h4>Most Played Games</h4>
                    <div id="most-played-list" class="most-played-list">
                        <div class="loading">Loading...</div>
                    </div>
                </div>

                <div class="insights-section">
                    <h4>Daily Activity</h4>
                    <div id="daily-activity-chart" class="activity-chart">
                        <div class="loading">Loading...</div>
                    </div>
                </div>

                <div class="insights-section">
                    <h4>Recent Sessions</h4>
                    <div id="recent-sessions-list" class="sessions-list">
                        <div class="loading">Loading...</div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        // Event listeners
        document.getElementById('insights-period').addEventListener('change', (e) => {
            this.currentPeriod = e.target.value;
            this.loadStats();
        });

        panel.querySelector('.insights-close-btn').addEventListener('click', () => {
            this.hideInsights();
        });
    }

    /**
     * Load statistics from backend
     */
    async loadStats() {
        if (!window.electronAPI) {
            console.warn('[SESSION_INSIGHTS] Electron API not available - showing heatmap instead');
            this.renderHeatmapFallback();
            return;
        }

        try {
            const result = await window.electronAPI.getPlaytimeStats(this.currentPeriod);
            if (result.success) {
                this.stats = result.stats;
                this.renderStats();
            } else {
                // Fallback to heatmap if stats not available
                this.renderHeatmapFallback();
            }
        } catch (error) {
            console.error('[SESSION_INSIGHTS] Failed to load stats:', error);
            this.renderHeatmapFallback();
        }
    }

    /**
     * Render heatmap fallback when Electron API is not available
     */
    renderHeatmapFallback() {
        // Show message in stats grid
        const statsGrid = document.querySelector('.insights-stats-grid');
        if (statsGrid) {
            statsGrid.innerHTML = `
                <div class="stat-card" style="grid-column: 1 / -1;">
                    <div class="stat-icon">📊</div>
                    <div class="stat-value">Gaming Heatmap Available</div>
                    <div class="stat-label">Session stats require Electron mode</div>
                </div>
            `;
        }

        // Show heatmap in activity section if available
        if (window.gamingHeatmapManager) {
            const activitySection = document.querySelector('#daily-activity-chart');
            if (activitySection) {
                activitySection.innerHTML = '<div class="loading">Loading heatmap...</div>';

                try {
                    const heatmapUI = window.gamingHeatmapManager.createHeatmapUI();
                    activitySection.innerHTML = '';
                    activitySection.appendChild(heatmapUI);
                } catch (error) {
                    console.error('[SESSION_INSIGHTS] Error rendering heatmap:', error);
                    activitySection.innerHTML = '<div class="empty-state">Error loading heatmap</div>';
                }
            }

            // Show button to open full heatmap modal
            const mostPlayedList = document.getElementById('most-played-list');
            if (mostPlayedList) {
                mostPlayedList.innerHTML = `
                    <button class="btn" onclick="window.newFeaturesSettings?.showHeatmapModal()" style="width: 100%; padding: 15px;">
                        📊 Open Full Gaming Heatmap
                    </button>
                `;
            }

            const sessionsList = document.getElementById('recent-sessions-list');
            if (sessionsList) {
                sessionsList.innerHTML = `
                    <div class="empty-state">
                        Session tracking is available in Electron mode.<br>
                        Use the heatmap above to view your gaming activity.
                    </div>
                `;
            }
        } else {
            // No heatmap available either
            const body = document.querySelector('.insights-body');
            if (body) {
                body.innerHTML = `
                    <div class="empty-state" style="padding: 40px; text-align: center;">
                        <h3>📊 Gaming Insights</h3>
                        <p>Session insights require Electron mode to track playtime and statistics.</p>
                        <p>Run this application in Electron to access:</p>
                        <ul style="text-align: left; display: inline-block; margin-top: 15px;">
                            <li>Playtime tracking</li>
                            <li>Gaming statistics</li>
                            <li>Session history</li>
                            <li>Most played games</li>
                        </ul>
                    </div>
                `;
            }
        }
    }

    /**
     * Render statistics to UI
     */
    renderStats() {
        if (!this.stats) return;

        // Total playtime
        const totalPlaytimeEl = document.getElementById('total-playtime');
        if (totalPlaytimeEl) {
            totalPlaytimeEl.textContent = this.formatPlaytime(this.stats.totalPlaytime);
        }

        // Games played
        const gamesPlayedEl = document.getElementById('games-played');
        if (gamesPlayedEl) {
            gamesPlayedEl.textContent = this.stats.totalGames;
        }

        // Average session length
        const avgSessionEl = document.getElementById('avg-session');
        if (avgSessionEl) {
            const avgLength = this.calculateAverageSession();
            avgSessionEl.textContent = this.formatPlaytime(avgLength);
        }

        // Session streak
        const streakEl = document.getElementById('session-streak');
        if (streakEl) {
            const streak = this.calculateStreak();
            streakEl.textContent = `${streak} days`;
        }

        // Render most played list
        this.renderMostPlayed();

        // Render daily activity chart
        this.renderDailyActivity();

        // Render recent sessions
        this.renderRecentSessions();
    }

    /**
     * Render most played games list
     */
    renderMostPlayed() {
        const container = document.getElementById('most-played-list');
        if (!container || !this.stats.mostPlayed) return;

        if (this.stats.mostPlayed.length === 0) {
            container.innerHTML = '<div class="empty-state">No games played yet</div>';
            return;
        }

        container.innerHTML = this.stats.mostPlayed.map((game, index) => `
            <div class="most-played-item">
                <div class="rank">#${index + 1}</div>
                <div class="game-info">
                    <div class="game-title">${this.escapeHtml(game.title)}</div>
                    <div class="game-platform">${this.escapeHtml(game.platform || 'Unknown')}</div>
                </div>
                <div class="game-stats">
                    <div class="playtime">${this.formatPlaytime(game.total_play_time)}</div>
                    <div class="launches">${game.launch_count} launches</div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render daily activity chart (simple bar chart)
     */
    renderDailyActivity() {
        const container = document.getElementById('daily-activity-chart');
        if (!container || !this.stats.dailyPlaytime) return;

        if (this.stats.dailyPlaytime.length === 0) {
            container.innerHTML = '<div class="empty-state">No activity data</div>';
            return;
        }

        // Find max value for scaling
        const maxSeconds = Math.max(...this.stats.dailyPlaytime.map(d => d.total_seconds));

        container.innerHTML = this.stats.dailyPlaytime.slice(0, 14).reverse().map(day => {
            const percentage = (day.total_seconds / maxSeconds) * 100;
            const hours = (day.total_seconds / 3600).toFixed(1);
            const date = new Date(day.date);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

            return `
                <div class="activity-bar-container">
                    <div class="activity-date">${dayName}</div>
                    <div class="activity-bar-wrapper">
                        <div class="activity-bar" style="width: ${percentage}%" title="${hours} hours">
                            <span class="activity-value">${hours}h</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Render recent sessions list
     */
    renderRecentSessions() {
        const container = document.getElementById('recent-sessions-list');
        if (!container || !this.stats.recentSessions) return;

        if (this.stats.recentSessions.length === 0) {
            container.innerHTML = '<div class="empty-state">No recent sessions</div>';
            return;
        }

        container.innerHTML = this.stats.recentSessions.slice(0, 10).map(session => {
            const startTime = new Date(session.start_time);
            const duration = session.duration || 0;

            return `
                <div class="session-item">
                    <div class="session-game">${this.escapeHtml(session.title)}</div>
                    <div class="session-time">${startTime.toLocaleString()}</div>
                    <div class="session-duration">${this.formatPlaytime(duration)}</div>
                </div>
            `;
        }).join('');
    }

    /**
     * Calculate average session length
     */
    calculateAverageSession() {
        if (!this.stats.recentSessions || this.stats.recentSessions.length === 0) return 0;

        const totalDuration = this.stats.recentSessions.reduce((sum, session) => {
            return sum + (session.duration || 0);
        }, 0);

        return Math.floor(totalDuration / this.stats.recentSessions.length);
    }

    /**
     * Calculate consecutive day streak
     */
    calculateStreak() {
        if (!this.stats.dailyPlaytime || this.stats.dailyPlaytime.length === 0) return 0;

        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Sort by date descending
        const sortedDays = [...this.stats.dailyPlaytime].sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });

        let currentDate = new Date(today);

        for (const day of sortedDays) {
            const dayDate = new Date(day.date);
            dayDate.setHours(0, 0, 0, 0);

            // Check if this day matches our expected date
            if (dayDate.getTime() === currentDate.getTime()) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1); // Move to previous day
            } else if (dayDate < currentDate) {
                // Gap in streak, stop counting
                break;
            }
        }

        return streak;
    }

    /**
     * Format playtime in seconds to human-readable string
     */
    formatPlaytime(seconds) {
        if (!seconds || seconds < 60) return '< 1m';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours === 0) return `${minutes}m`;
        if (minutes === 0) return `${hours}h`;
        return `${hours}h ${minutes}m`;
    }

    /**
     * Show insights panel
     */
    showInsights() {
        const panel = document.getElementById('session-insights-panel');
        if (panel) {
            panel.classList.add('visible');
            this.insightsVisible = true;
            this.loadStats();
        }
    }

    /**
     * Hide insights panel
     */
    hideInsights() {
        const panel = document.getElementById('session-insights-panel');
        if (panel) {
            panel.classList.remove('visible');
            this.insightsVisible = false;
        }
    }

    /**
     * Toggle insights panel
     */
    toggleInsights() {
        if (this.insightsVisible) {
            this.hideInsights();
        } else {
            this.showInsights();
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
