/**
 * Analytics Dashboard Module
 * Advanced playtime analytics with charts and insights
 * Requires Chart.js (loaded from CDN)
 */

class AnalyticsDashboard {
    constructor() {
        this.charts = {};
        this.chartColors = {
            primary: '#667eea',
            secondary: '#764ba2',
            success: '#48bb78',
            danger: '#f56565',
            warning: '#ed8936',
            info: '#4299e1',
            platforms: {
                steam: '#1b2838',
                epic: '#0078f2',
                xbox: '#107c10'
            }
        };

        window.logger?.debug('ANALYTICS', 'Analytics Dashboard initialized');
    }

    /**
     * Create and show the analytics dashboard
     */
    async showAnalyticsDashboard() {
        window.logger?.debug('ANALYTICS', 'Opening analytics dashboard');

        // Check if Chart.js is loaded
        if (typeof Chart === 'undefined') {
            await this.loadChartJS();
        }

        const modal = document.getElementById('info-modal');
        if (!modal) return;

        // Fetch analytics data
        const data = await this.fetchAnalyticsData();

        modal.innerHTML = `
            <div class="analytics-dashboard">
                <div class="modal-header">
                    <h2>📊 Gaming Analytics Dashboard</h2>
                    <button class="close-btn" onclick="document.getElementById('info-modal').style.display = 'none'">✕</button>
                </div>

                <div class="analytics-tabs">
                    <button class="tab-btn active" data-tab="overview">Overview</button>
                    <button class="tab-btn" data-tab="trends">Trends</button>
                    <button class="tab-btn" data-tab="genres">Genres</button>
                    <button class="tab-btn" data-tab="platforms">Platforms</button>
                    <button class="tab-btn" data-tab="insights">Insights</button>
                </div>

                <div class="analytics-content">
                    <!-- Overview Tab -->
                    <div class="tab-content active" data-tab="overview">
                        <div class="stats-grid">
                            <div class="stat-card">
                                <div class="stat-icon">🎮</div>
                                <div class="stat-value">${data.totalGames}</div>
                                <div class="stat-label">Total Games</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon">⏱️</div>
                                <div class="stat-value">${this.formatHours(data.totalPlaytime)}</div>
                                <div class="stat-label">Total Playtime</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon">🔥</div>
                                <div class="stat-value">${data.currentStreak} days</div>
                                <div class="stat-label">Current Streak</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon">⭐</div>
                                <div class="stat-value">${data.favoriteGames}</div>
                                <div class="stat-label">Favorites</div>
                            </div>
                        </div>

                        <div class="chart-row">
                            <div class="chart-container">
                                <h3>Playtime This Week</h3>
                                <canvas id="weeklyPlaytimeChart"></canvas>
                            </div>
                            <div class="chart-container">
                                <h3>Most Played Games</h3>
                                <canvas id="topGamesChart"></canvas>
                            </div>
                        </div>
                    </div>

                    <!-- Trends Tab -->
                    <div class="tab-content" data-tab="trends">
                        <div class="chart-container-large">
                            <h3>Playtime Trends (Last 30 Days)</h3>
                            <canvas id="playtimeTrendsChart"></canvas>
                        </div>

                        <div class="chart-row">
                            <div class="chart-container">
                                <h3>Gaming Hours by Day of Week</h3>
                                <canvas id="dayOfWeekChart"></canvas>
                            </div>
                            <div class="chart-container">
                                <h3>Gaming Hours by Time of Day</h3>
                                <canvas id="timeOfDayChart"></canvas>
                            </div>
                        </div>
                    </div>

                    <!-- Genres Tab -->
                    <div class="tab-content" data-tab="genres">
                        <div class="chart-row">
                            <div class="chart-container">
                                <h3>Genre Distribution</h3>
                                <canvas id="genreDistributionChart"></canvas>
                            </div>
                            <div class="chart-container">
                                <h3>Playtime by Genre</h3>
                                <canvas id="genrePlaytimeChart"></canvas>
                            </div>
                        </div>
                    </div>

                    <!-- Platforms Tab -->
                    <div class="tab-content" data-tab="platforms">
                        <div class="chart-row">
                            <div class="chart-container">
                                <h3>Platform Distribution</h3>
                                <canvas id="platformDistributionChart"></canvas>
                            </div>
                            <div class="chart-container">
                                <h3>Playtime by Platform</h3>
                                <canvas id="platformPlaytimeChart"></canvas>
                            </div>
                        </div>
                    </div>

                    <!-- Insights Tab -->
                    <div class="tab-content" data-tab="insights">
                        <div class="insights-grid">
                            <div class="insight-card">
                                <h3>🏆 Gaming Habits</h3>
                                <ul>
                                    <li><strong>Most Active Day:</strong> ${data.insights.mostActiveDay}</li>
                                    <li><strong>Favorite Time:</strong> ${data.insights.favoriteTime}</li>
                                    <li><strong>Average Session:</strong> ${this.formatMinutes(data.insights.avgSessionLength)}</li>
                                    <li><strong>Longest Session:</strong> ${this.formatMinutes(data.insights.longestSession)}</li>
                                </ul>
                            </div>
                            <div class="insight-card">
                                <h3>📈 Statistics</h3>
                                <ul>
                                    <li><strong>Games Played This Month:</strong> ${data.insights.gamesPlayedThisMonth}</li>
                                    <li><strong>New Games This Month:</strong> ${data.insights.newGamesThisMonth}</li>
                                    <li><strong>Completion Rate:</strong> ${data.insights.completionRate}%</li>
                                    <li><strong>Backlog Size:</strong> ${data.insights.backlogSize}</li>
                                </ul>
                            </div>
                            <div class="insight-card">
                                <h3>🎯 Achievements</h3>
                                <ul>
                                    <li><strong>Total Launches:</strong> ${data.insights.totalLaunches}</li>
                                    <li><strong>Best Streak:</strong> ${data.insights.bestStreak} days</li>
                                    <li><strong>Games 100% Completed:</strong> ${data.insights.completed100}</li>
                                    <li><strong>Avg Rating Given:</strong> ${data.insights.avgRating}/5 ⭐</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        modal.style.display = 'flex';

        // Setup tab switching
        this.setupTabs();

        // Create charts
        await this.createCharts(data);
    }

    /**
     * Load Chart.js library from CDN
     */
    async loadChartJS() {
        return new Promise((resolve, reject) => {
            if (typeof Chart !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
            script.onload = () => {
                window.logger?.debug('ANALYTICS', 'Chart.js loaded');
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Fetch analytics data from Electron backend
     */
    async fetchAnalyticsData() {
        window.logger?.debug('ANALYTICS', 'Fetching analytics data');

        try {
            // Check if Electron API is available
            if (!window.electronAPI) {
                console.warn('Electron API not available, using default data');
                return this.getDefaultData();
            }

            // Get all games and playtime data
            const games = await window.electronAPI.getGames();
            const recentlyPlayed = await window.electronAPI.getRecentlyPlayed(100);
            const mostPlayed = await window.electronAPI.getMostPlayed(100);

            // Calculate analytics
            const data = {
                totalGames: games.length,
                totalPlaytime: this.calculateTotalPlaytime(games),
                currentStreak: this.calculateCurrentStreak(recentlyPlayed),
                favoriteGames: games.filter(g => g.is_favorite).length,
                weeklyPlaytime: this.calculateWeeklyPlaytime(recentlyPlayed),
                topGames: mostPlayed.slice(0, 10),
                playtimeTrends: this.calculatePlaytimeTrends(recentlyPlayed),
                dayOfWeekData: this.calculateDayOfWeekData(recentlyPlayed),
                timeOfDayData: this.calculateTimeOfDayData(recentlyPlayed),
                genreDistribution: this.calculateGenreDistribution(games),
                genrePlaytime: this.calculateGenrePlaytime(games),
                platformDistribution: this.calculatePlatformDistribution(games),
                platformPlaytime: this.calculatePlatformPlaytime(games),
                insights: this.calculateInsights(games, recentlyPlayed)
            };

            return data;
        } catch (error) {
            console.error('Error fetching analytics data:', error);
            // Return default data
            return this.getDefaultData();
        }
    }

    /**
     * Calculate total playtime in seconds
     */
    calculateTotalPlaytime(games) {
        return games.reduce((total, game) => total + (game.total_play_time || 0), 0);
    }

    /**
     * Calculate current gaming streak
     */
    calculateCurrentStreak(recentlyPlayed) {
        if (!recentlyPlayed || recentlyPlayed.length === 0) return 0;

        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get unique days played
        const daysPlayed = new Set();
        recentlyPlayed.forEach(game => {
            if (game.last_played) {
                const playDate = new Date(game.last_played);
                playDate.setHours(0, 0, 0, 0);
                daysPlayed.add(playDate.getTime());
            }
        });

        const sortedDays = Array.from(daysPlayed).sort((a, b) => b - a);

        // Check for consecutive days
        for (let i = 0; i < sortedDays.length; i++) {
            const expectedDate = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000));
            if (sortedDays[i] === expectedDate.getTime()) {
                streak++;
            } else {
                break;
            }
        }

        return streak;
    }

    /**
     * Calculate weekly playtime (last 7 days)
     */
    calculateWeeklyPlaytime(recentlyPlayed) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const data = new Array(7).fill(0);
        const today = new Date();

        recentlyPlayed.forEach(game => {
            if (game.last_played) {
                const playDate = new Date(game.last_played);
                const daysDiff = Math.floor((today - playDate) / (1000 * 60 * 60 * 24));
                if (daysDiff < 7) {
                    const dayIndex = playDate.getDay();
                    data[dayIndex] += (game.total_play_time || 0) / 3600; // Convert to hours
                }
            }
        });

        return {
            labels: days,
            values: data
        };
    }

    /**
     * Calculate playtime trends for last 30 days
     */
    calculatePlaytimeTrends(recentlyPlayed) {
        const labels = [];
        const data = [];
        const today = new Date();

        for (let i = 29; i >= 0; i--) {
            const date = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000));
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            data.push(0);
        }

        recentlyPlayed.forEach(game => {
            if (game.last_played) {
                const playDate = new Date(game.last_played);
                const daysDiff = Math.floor((today - playDate) / (1000 * 60 * 60 * 24));
                if (daysDiff < 30) {
                    const index = 29 - daysDiff;
                    data[index] += (game.total_play_time || 0) / 3600;
                }
            }
        });

        return { labels, values: data };
    }

    /**
     * Calculate playtime by day of week
     */
    calculateDayOfWeekData(recentlyPlayed) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const data = new Array(7).fill(0);

        recentlyPlayed.forEach(game => {
            if (game.last_played) {
                const playDate = new Date(game.last_played);
                const dayIndex = playDate.getDay();
                data[dayIndex] += (game.total_play_time || 0) / 3600;
            }
        });

        return { labels: days, values: data };
    }

    /**
     * Calculate playtime by time of day
     */
    calculateTimeOfDayData(recentlyPlayed) {
        const labels = ['Morning (6-12)', 'Afternoon (12-18)', 'Evening (18-24)', 'Night (0-6)'];
        const data = [0, 0, 0, 0];

        recentlyPlayed.forEach(game => {
            if (game.last_played) {
                const hour = new Date(game.last_played).getHours();
                if (hour >= 6 && hour < 12) data[0] += (game.total_play_time || 0) / 3600;
                else if (hour >= 12 && hour < 18) data[1] += (game.total_play_time || 0) / 3600;
                else if (hour >= 18 && hour < 24) data[2] += (game.total_play_time || 0) / 3600;
                else data[3] += (game.total_play_time || 0) / 3600;
            }
        });

        return { labels, values: data };
    }

    /**
     * Calculate genre distribution
     */
    calculateGenreDistribution(games) {
        const genreCounts = {};

        games.forEach(game => {
            if (game.genres && Array.isArray(game.genres)) {
                game.genres.forEach(genre => {
                    genreCounts[genre] = (genreCounts[genre] || 0) + 1;
                });
            }
        });

        const sorted = Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        return {
            labels: sorted.map(([genre]) => genre),
            values: sorted.map(([, count]) => count)
        };
    }

    /**
     * Calculate playtime by genre
     */
    calculateGenrePlaytime(games) {
        const genrePlaytime = {};

        games.forEach(game => {
            if (game.genres && Array.isArray(game.genres) && game.total_play_time) {
                game.genres.forEach(genre => {
                    genrePlaytime[genre] = (genrePlaytime[genre] || 0) + game.total_play_time;
                });
            }
        });

        const sorted = Object.entries(genrePlaytime)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        return {
            labels: sorted.map(([genre]) => genre),
            values: sorted.map(([, time]) => time / 3600) // Convert to hours
        };
    }

    /**
     * Calculate platform distribution
     */
    calculatePlatformDistribution(games) {
        const platformCounts = {};

        games.forEach(game => {
            const platform = game.platform || 'Unknown';
            platformCounts[platform] = (platformCounts[platform] || 0) + 1;
        });

        return {
            labels: Object.keys(platformCounts),
            values: Object.values(platformCounts)
        };
    }

    /**
     * Calculate playtime by platform
     */
    calculatePlatformPlaytime(games) {
        const platformPlaytime = {};

        games.forEach(game => {
            const platform = game.platform || 'Unknown';
            platformPlaytime[platform] = (platformPlaytime[platform] || 0) + (game.total_play_time || 0);
        });

        return {
            labels: Object.keys(platformPlaytime),
            values: Object.values(platformPlaytime).map(time => time / 3600)
        };
    }

    /**
     * Calculate insights
     */
    calculateInsights(games, recentlyPlayed) {
        const dayOfWeekData = this.calculateDayOfWeekData(recentlyPlayed);
        const timeOfDayData = this.calculateTimeOfDayData(recentlyPlayed);

        const mostActiveDay = dayOfWeekData.labels[dayOfWeekData.values.indexOf(Math.max(...dayOfWeekData.values))];
        const favoriteTime = timeOfDayData.labels[timeOfDayData.values.indexOf(Math.max(...timeOfDayData.values))];

        const totalSessions = recentlyPlayed.reduce((sum, g) => sum + (g.launch_count || 0), 0);
        const totalPlaytime = this.calculateTotalPlaytime(games);
        const avgSessionLength = totalSessions > 0 ? (totalPlaytime / totalSessions) : 0;

        const longestSession = Math.max(...games.map(g => {
            return (g.total_play_time || 0) / Math.max(g.launch_count || 1, 1);
        }), 0);

        const today = new Date();
        const thisMonth = today.getMonth();
        const gamesPlayedThisMonth = recentlyPlayed.filter(g => {
            if (!g.last_played) return false;
            return new Date(g.last_played).getMonth() === thisMonth;
        }).length;

        const newGamesThisMonth = games.filter(g => {
            if (!g.created_at) return false;
            return new Date(g.created_at).getMonth() === thisMonth;
        }).length;

        const avgRating = games.filter(g => g.user_rating).length > 0
            ? games.reduce((sum, g) => sum + (g.user_rating || 0), 0) / games.filter(g => g.user_rating).length
            : 0;

        return {
            mostActiveDay,
            favoriteTime,
            avgSessionLength,
            longestSession,
            gamesPlayedThisMonth,
            newGamesThisMonth,
            completionRate: Math.round((games.filter(g => g.total_play_time > 0).length / games.length) * 100),
            backlogSize: games.filter(g => !g.total_play_time || g.total_play_time === 0).length,
            totalLaunches: games.reduce((sum, g) => sum + (g.launch_count || 0), 0),
            bestStreak: this.calculateCurrentStreak(recentlyPlayed), // Simplified
            completed100: games.filter(g => g.user_rating === 5).length,
            avgRating: avgRating.toFixed(1)
        };
    }

    /**
     * Get default data structure
     */
    getDefaultData() {
        return {
            totalGames: 0,
            totalPlaytime: 0,
            currentStreak: 0,
            favoriteGames: 0,
            weeklyPlaytime: { labels: [], values: [] },
            topGames: [],
            playtimeTrends: { labels: [], values: [] },
            dayOfWeekData: { labels: [], values: [] },
            timeOfDayData: { labels: [], values: [] },
            genreDistribution: { labels: [], values: [] },
            genrePlaytime: { labels: [], values: [] },
            platformDistribution: { labels: [], values: [] },
            platformPlaytime: { labels: [], values: [] },
            insights: {
                mostActiveDay: 'N/A',
                favoriteTime: 'N/A',
                avgSessionLength: 0,
                longestSession: 0,
                gamesPlayedThisMonth: 0,
                newGamesThisMonth: 0,
                completionRate: 0,
                backlogSize: 0,
                totalLaunches: 0,
                bestStreak: 0,
                completed100: 0,
                avgRating: '0.0'
            }
        };
    }

    /**
     * Create all charts
     */
    async createCharts(data) {
        // Destroy existing charts
        Object.values(this.charts).forEach(chart => chart.destroy());
        this.charts = {};

        // Weekly Playtime Bar Chart
        const weeklyCtx = document.getElementById('weeklyPlaytimeChart');
        if (weeklyCtx) {
            this.charts.weekly = new Chart(weeklyCtx, {
                type: 'bar',
                data: {
                    labels: data.weeklyPlaytime.labels,
                    datasets: [{
                        label: 'Hours Played',
                        data: data.weeklyPlaytime.values,
                        backgroundColor: this.chartColors.primary,
                        borderColor: this.chartColors.secondary,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }

        // Top Games Horizontal Bar Chart
        const topGamesCtx = document.getElementById('topGamesChart');
        if (topGamesCtx) {
            this.charts.topGames = new Chart(topGamesCtx, {
                type: 'bar',
                data: {
                    labels: data.topGames.map(g => g.title?.substring(0, 20) || 'Unknown'),
                    datasets: [{
                        label: 'Hours Played',
                        data: data.topGames.map(g => (g.total_play_time || 0) / 3600),
                        backgroundColor: this.generateColors(data.topGames.length),
                        borderWidth: 1
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: { beginAtZero: true }
                    }
                }
            });
        }

        // Playtime Trends Line Chart
        const trendsCtx = document.getElementById('playtimeTrendsChart');
        if (trendsCtx) {
            this.charts.trends = new Chart(trendsCtx, {
                type: 'line',
                data: {
                    labels: data.playtimeTrends.labels,
                    datasets: [{
                        label: 'Hours Played',
                        data: data.playtimeTrends.values,
                        borderColor: this.chartColors.primary,
                        backgroundColor: this.chartColors.primary + '20',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }

        // Day of Week Chart
        const dayOfWeekCtx = document.getElementById('dayOfWeekChart');
        if (dayOfWeekCtx) {
            this.charts.dayOfWeek = new Chart(dayOfWeekCtx, {
                type: 'radar',
                data: {
                    labels: data.dayOfWeekData.labels,
                    datasets: [{
                        label: 'Hours Played',
                        data: data.dayOfWeekData.values,
                        backgroundColor: this.chartColors.primary + '40',
                        borderColor: this.chartColors.primary,
                        pointBackgroundColor: this.chartColors.secondary
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }

        // Time of Day Chart
        const timeOfDayCtx = document.getElementById('timeOfDayChart');
        if (timeOfDayCtx) {
            this.charts.timeOfDay = new Chart(timeOfDayCtx, {
                type: 'doughnut',
                data: {
                    labels: data.timeOfDayData.labels,
                    datasets: [{
                        data: data.timeOfDayData.values,
                        backgroundColor: [
                            this.chartColors.warning,
                            this.chartColors.info,
                            this.chartColors.primary,
                            this.chartColors.secondary
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }

        // Genre Distribution Chart
        const genreDistCtx = document.getElementById('genreDistributionChart');
        if (genreDistCtx) {
            this.charts.genreDist = new Chart(genreDistCtx, {
                type: 'pie',
                data: {
                    labels: data.genreDistribution.labels,
                    datasets: [{
                        data: data.genreDistribution.values,
                        backgroundColor: this.generateColors(data.genreDistribution.labels.length)
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }

        // Genre Playtime Chart
        const genrePlaytimeCtx = document.getElementById('genrePlaytimeChart');
        if (genrePlaytimeCtx) {
            this.charts.genrePlaytime = new Chart(genrePlaytimeCtx, {
                type: 'bar',
                data: {
                    labels: data.genrePlaytime.labels,
                    datasets: [{
                        label: 'Hours Played',
                        data: data.genrePlaytime.values,
                        backgroundColor: this.chartColors.success,
                        borderWidth: 1
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: { beginAtZero: true }
                    }
                }
            });
        }

        // Platform Distribution Chart
        const platformDistCtx = document.getElementById('platformDistributionChart');
        if (platformDistCtx) {
            this.charts.platformDist = new Chart(platformDistCtx, {
                type: 'doughnut',
                data: {
                    labels: data.platformDistribution.labels,
                    datasets: [{
                        data: data.platformDistribution.values,
                        backgroundColor: data.platformDistribution.labels.map(
                            label => this.chartColors.platforms[label.toLowerCase()] || this.chartColors.primary
                        )
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }

        // Platform Playtime Chart
        const platformPlaytimeCtx = document.getElementById('platformPlaytimeChart');
        if (platformPlaytimeCtx) {
            this.charts.platformPlaytime = new Chart(platformPlaytimeCtx, {
                type: 'bar',
                data: {
                    labels: data.platformPlaytime.labels,
                    datasets: [{
                        label: 'Hours Played',
                        data: data.platformPlaytime.values,
                        backgroundColor: data.platformPlaytime.labels.map(
                            label => this.chartColors.platforms[label.toLowerCase()] || this.chartColors.info
                        ),
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }
    }

    /**
     * Setup tab switching
     */
    setupTabs() {
        const tabBtns = document.querySelectorAll('.analytics-tabs .tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;

                // Update active states
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                btn.classList.add('active');
                document.querySelector(`.tab-content[data-tab="${tabName}"]`)?.classList.add('active');
            });
        });
    }

    /**
     * Generate color array
     */
    generateColors(count) {
        const colors = [];
        const baseColors = [
            this.chartColors.primary,
            this.chartColors.secondary,
            this.chartColors.success,
            this.chartColors.info,
            this.chartColors.warning,
            this.chartColors.danger
        ];

        for (let i = 0; i < count; i++) {
            colors.push(baseColors[i % baseColors.length]);
        }

        return colors;
    }

    /**
     * Format seconds to hours
     */
    formatHours(seconds) {
        const hours = Math.floor(seconds / 3600);
        if (hours < 1) return `${Math.floor(seconds / 60)}m`;
        return `${hours}h`;
    }

    /**
     * Format seconds to readable time
     */
    formatMinutes(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours < 1) return `${minutes}m`;
        return `${hours}h ${minutes}m`;
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnalyticsDashboard;
}
