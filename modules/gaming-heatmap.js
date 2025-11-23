// Gaming Heatmap Calendar Module
// GitHub-style contribution graph for gaming activity

class GamingHeatmapManager {
    constructor() {
        this.activityData = this.loadActivityData();
        this.colorSchemes = {
            github: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
            fire: ['#ffe0b2', '#ffb74d', '#ff9800', '#f57c00', '#e65100'],
            ocean: ['#e0f7fa', '#80deea', '#26c6da', '#00acc1', '#00838f'],
            purple: ['#f3e5f5', '#ce93d8', '#ab47bc', '#8e24aa', '#6a1b9a'],
            red: ['#ffebee', '#ef9a9a', '#e57373', '#ef5350', '#f44336']
        };
        this.currentColorScheme = 'github';
    }

    loadActivityData() {
        try {
            const saved = localStorage.getItem('gaming-activity-data');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Failed to load activity data:', error);
            return {};
        }
    }

    saveActivityData() {
        try {
            localStorage.setItem('gaming-activity-data', JSON.stringify(this.activityData));
        } catch (error) {
            console.error('Failed to save activity data:', error);
        }
    }

    // Record gaming activity for today
    recordActivity(gameId, minutes) {
        const today = this.getDateString(new Date());

        if (!this.activityData[today]) {
            this.activityData[today] = {
                totalMinutes: 0,
                games: {}
            };
        }

        this.activityData[today].totalMinutes += minutes;

        if (!this.activityData[today].games[gameId]) {
            this.activityData[today].games[gameId] = 0;
        }

        this.activityData[today].games[gameId] += minutes;
        this.saveActivityData();
    }

    // Get date string in YYYY-MM-DD format
    getDateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Get activity level (0-4) for a date
    getActivityLevel(dateString) {
        const data = this.activityData[dateString];
        if (!data || data.totalMinutes === 0) return 0;

        const minutes = data.totalMinutes;

        // Define activity thresholds (in minutes)
        if (minutes >= 240) return 4; // 4+ hours
        if (minutes >= 120) return 3; // 2-4 hours
        if (minutes >= 60) return 2;  // 1-2 hours
        if (minutes >= 30) return 1;  // 30min-1hour
        return 0;
    }

    // Get color for activity level
    getColor(level) {
        const colors = this.colorSchemes[this.currentColorScheme];
        return colors[Math.min(level, colors.length - 1)];
    }

    // Generate heatmap for last N days
    generateHeatmap(days = 365) {
        const heatmapData = [];
        const today = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateString = this.getDateString(date);

            heatmapData.push({
                date: dateString,
                level: this.getActivityLevel(dateString),
                minutes: this.activityData[dateString]?.totalMinutes || 0,
                games: this.activityData[dateString]?.games || {}
            });
        }

        return heatmapData;
    }

    // Get statistics
    getStats() {
        const allDates = Object.keys(this.activityData);
        const totalMinutes = allDates.reduce((sum, date) => {
            return sum + (this.activityData[date]?.totalMinutes || 0);
        }, 0);

        const activeDays = allDates.filter(date => {
            return (this.activityData[date]?.totalMinutes || 0) > 0;
        }).length;

        // Calculate current streak
        const currentStreak = this.getCurrentStreak();
        const longestStreak = this.getLongestStreak();

        return {
            totalHours: Math.round(totalMinutes / 60),
            totalMinutes,
            activeDays,
            currentStreak,
            longestStreak,
            averagePerDay: activeDays > 0 ? Math.round(totalMinutes / activeDays) : 0
        };
    }

    // Get current streak of consecutive gaming days
    getCurrentStreak() {
        let streak = 0;
        const today = new Date();

        for (let i = 0; i < 365; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateString = this.getDateString(date);

            if (this.getActivityLevel(dateString) > 0) {
                streak++;
            } else {
                break;
            }
        }

        return streak;
    }

    // Get longest streak ever
    getLongestStreak() {
        const allDates = Object.keys(this.activityData).sort();
        let longest = 0;
        let current = 0;
        let prevDate = null;

        for (const dateString of allDates) {
            if (this.getActivityLevel(dateString) > 0) {
                if (prevDate && this.isDayAfter(dateString, prevDate)) {
                    current++;
                } else {
                    current = 1;
                }

                longest = Math.max(longest, current);
                prevDate = dateString;
            }
        }

        return longest;
    }

    // Check if date1 is exactly one day after date2
    isDayAfter(dateString1, dateString2) {
        const date1 = new Date(dateString1);
        const date2 = new Date(dateString2);
        const diffTime = date1 - date2;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays === 1;
    }

    // Create heatmap UI
    createHeatmapUI() {
        const container = document.createElement('div');
        container.className = 'gaming-heatmap-container';
        container.style.cssText = `
            padding: 20px;
            background: rgba(0,0,0,0.5);
            border-radius: 10px;
            max-width: 1000px;
            margin: 20px auto;
        `;

        const stats = this.getStats();

        container.innerHTML = `
            <div class="heatmap-header" style="margin-bottom: 20px;">
                <h2 style="margin: 0 0 10px 0;">🗓️ Gaming Activity Calendar</h2>
                <div class="stats-row" style="display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 15px;">
                    <div class="stat-item">
                        <strong>${stats.totalHours}</strong> hours played
                    </div>
                    <div class="stat-item">
                        <strong>${stats.activeDays}</strong> active days
                    </div>
                    <div class="stat-item">
                        <strong>${stats.currentStreak}</strong> day streak
                    </div>
                    <div class="stat-item">
                        <strong>${stats.longestStreak}</strong> longest streak
                    </div>
                    <div class="stat-item">
                        <strong>${stats.averagePerDay}</strong> min/day avg
                    </div>
                </div>

                <div class="controls" style="display: flex; gap: 10px; align-items: center;">
                    <label>Color Scheme:</label>
                    <select id="heatmap-color-scheme" style="padding: 5px; border-radius: 5px;">
                        <option value="github">GitHub</option>
                        <option value="fire">Fire</option>
                        <option value="ocean">Ocean</option>
                        <option value="purple">Purple</option>
                        <option value="red">Red</option>
                    </select>
                    <button id="export-heatmap" class="btn" style="margin-left: auto;">📸 Export Image</button>
                </div>
            </div>

            <div id="heatmap-grid"></div>

            <div class="heatmap-legend" style="margin-top: 15px; display: flex; gap: 10px; align-items: center; font-size: 12px;">
                <span>Less</span>
                ${this.colorSchemes[this.currentColorScheme].map(color =>
                    `<div style="width: 15px; height: 15px; background: ${color}; border: 1px solid #444;"></div>`
                ).join('')}
                <span>More</span>
            </div>

            <div id="day-tooltip" style="
                position: fixed;
                display: none;
                background: rgba(0,0,0,0.9);
                color: white;
                padding: 10px;
                border-radius: 5px;
                font-size: 12px;
                pointer-events: none;
                z-index: 10000;
                border: 1px solid #666;
            "></div>
        `;

        // Render the heatmap grid
        this.renderGrid(container.querySelector('#heatmap-grid'));

        // Event listeners
        container.querySelector('#heatmap-color-scheme').addEventListener('change', (e) => {
            this.currentColorScheme = e.target.value;
            this.renderGrid(container.querySelector('#heatmap-grid'));
            this.updateLegend(container);
        });

        container.querySelector('#export-heatmap').addEventListener('click', () => {
            this.exportAsImage(container);
        });

        return container;
    }

    renderGrid(gridContainer) {
        const heatmapData = this.generateHeatmap(365);

        // Group by weeks
        const weeks = [];
        let currentWeek = [];

        // Start from the first Sunday before the data
        const firstDate = new Date(heatmapData[0].date);
        const dayOfWeek = firstDate.getDay();

        // Add empty cells for alignment
        for (let i = 0; i < dayOfWeek; i++) {
            currentWeek.push(null);
        }

        heatmapData.forEach(day => {
            currentWeek.push(day);

            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        });

        // Add remaining days
        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) {
                currentWeek.push(null);
            }
            weeks.push(currentWeek);
        }

        // Render grid
        gridContainer.innerHTML = '';
        gridContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(${weeks.length}, 15px);
            gap: 3px;
            overflow-x: auto;
        `;

        weeks.forEach(week => {
            const weekColumn = document.createElement('div');
            weekColumn.style.cssText = 'display: flex; flex-direction: column; gap: 3px;';

            week.forEach(day => {
                const cell = document.createElement('div');
                cell.style.cssText = `
                    width: 15px;
                    height: 15px;
                    border-radius: 2px;
                    cursor: pointer;
                    transition: transform 0.1s;
                `;

                if (day) {
                    const color = this.getColor(day.level);
                    cell.style.background = color;
                    cell.style.border = '1px solid #444';

                    // Hover effect
                    cell.addEventListener('mouseenter', (e) => {
                        cell.style.transform = 'scale(1.5)';
                        this.showTooltip(e, day);
                    });

                    cell.addEventListener('mouseleave', () => {
                        cell.style.transform = 'scale(1)';
                        this.hideTooltip();
                    });
                } else {
                    cell.style.background = 'transparent';
                }

                weekColumn.appendChild(cell);
            });

            gridContainer.appendChild(weekColumn);
        });
    }

    showTooltip(event, dayData) {
        const tooltip = document.getElementById('day-tooltip');
        if (!tooltip) return;

        const hours = Math.floor(dayData.minutes / 60);
        const mins = dayData.minutes % 60;

        const gamesList = Object.entries(dayData.games)
            .map(([gameId, minutes]) => {
                const gameName = this.getGameName(gameId);
                return `<div>• ${gameName}: ${Math.round(minutes)} min</div>`;
            })
            .join('');

        tooltip.innerHTML = `
            <strong>${dayData.date}</strong><br>
            ${dayData.minutes > 0 ? `${hours}h ${mins}m played` : 'No activity'}<br>
            ${gamesList ? `<div style="margin-top: 5px; font-size: 11px;">${gamesList}</div>` : ''}
        `;

        tooltip.style.display = 'block';
        tooltip.style.left = `${event.pageX + 10}px`;
        tooltip.style.top = `${event.pageY + 10}px`;
    }

    hideTooltip() {
        const tooltip = document.getElementById('day-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    getGameName(gameId) {
        // Try to get game name from coverflow manager
        if (window.coverflowManager) {
            const game = window.coverflowManager.games?.find(g => g.id === gameId);
            if (game) return game.name;
        }
        return gameId;
    }

    updateLegend(container) {
        const legend = container.querySelector('.heatmap-legend');
        legend.innerHTML = `
            <span>Less</span>
            ${this.colorSchemes[this.currentColorScheme].map(color =>
                `<div style="width: 15px; height: 15px; background: ${color}; border: 1px solid #444;"></div>`
            ).join('')}
            <span>More</span>
        `;
    }

    async exportAsImage(container) {
        try {
            // Use html2canvas if available
            if (typeof html2canvas !== 'undefined') {
                const canvas = await html2canvas(container);
                const link = document.createElement('a');
                link.download = `gaming-heatmap-${new Date().toISOString().split('T')[0]}.png`;
                link.href = canvas.toDataURL();
                link.click();
            } else {
                alert('Export feature requires html2canvas library. Please include it in your project.');
            }
        } catch (error) {
            console.error('Failed to export image:', error);
            alert('Failed to export image. See console for details.');
        }
    }

    // Import activity data from play time database
    async importFromPlayTimeDB(db) {
        // This would integrate with the existing play time tracking system
        console.log('Importing activity data from play time database...');

        // Example: query all sessions and aggregate by date
        // The actual implementation would depend on your database schema
    }
}

// Initialize
if (typeof window !== 'undefined') {
    window.gamingHeatmapManager = new GamingHeatmapManager();
}
