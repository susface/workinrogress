/**
 * Game Backlog Manager
 * Track games you want to play, completion status, priority, and more
 */

class BacklogManager {
    constructor() {
        this.backlog = new Map(); // gameId -> backlog entry
        this.loadFromStorage();
    }

    /**
     * Backlog entry statuses
     */
    static STATUSES = {
        WANT_TO_PLAY: 'want_to_play',
        PLAYING: 'playing',
        COMPLETED: 'completed',
        ON_HOLD: 'on_hold',
        DROPPED: 'dropped',
        BEATEN: 'beaten' // Main story done, not 100%
    };

    static PRIORITIES = {
        LOW: 1,
        MEDIUM: 2,
        HIGH: 3,
        URGENT: 4
    };

    /**
     * Load backlog from localStorage
     */
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('game-backlog');
            if (saved) {
                const data = JSON.parse(saved);
                Object.entries(data).forEach(([gameId, entry]) => {
                    this.backlog.set(parseInt(gameId, 10), entry);
                });
                console.log(`[BACKLOG] Loaded ${this.backlog.size} entries`);
            }
        } catch (error) {
            console.error('[BACKLOG] Error loading:', error);
        }
    }

    /**
     * Save backlog to localStorage
     */
    saveToStorage() {
        try {
            const data = {};
            this.backlog.forEach((entry, gameId) => {
                data[gameId] = entry;
            });
            localStorage.setItem('game-backlog', JSON.stringify(data));
        } catch (error) {
            console.error('[BACKLOG] Error saving:', error);
        }
    }

    /**
     * Add game to backlog
     */
    addToBacklog(gameId, gameTitle, status = BacklogManager.STATUSES.WANT_TO_PLAY, priority = BacklogManager.PRIORITIES.MEDIUM) {
        const entry = {
            gameId: gameId,
            gameTitle: gameTitle,
            status: status,
            priority: priority,
            addedDate: new Date().toISOString(),
            startedDate: null,
            completedDate: null,
            estimatedHours: null,
            actualHours: null,
            completionPercentage: 0,
            notes: '',
            rating: null // User rating after completion
        };

        this.backlog.set(gameId, entry);
        this.saveToStorage();
        console.log(`[BACKLOG] Added ${gameTitle}`);
        return entry;
    }

    /**
     * Update backlog entry
     */
    updateEntry(gameId, updates) {
        const entry = this.backlog.get(gameId);
        if (!entry) {
            throw new Error('Game not in backlog');
        }

        // Auto-set dates based on status changes
        if (updates.status) {
            if (updates.status === BacklogManager.STATUSES.PLAYING && !entry.startedDate) {
                updates.startedDate = new Date().toISOString();
            }
            if ((updates.status === BacklogManager.STATUSES.COMPLETED ||
                 updates.status === BacklogManager.STATUSES.BEATEN) &&
                !entry.completedDate) {
                updates.completedDate = new Date().toISOString();
            }
        }

        Object.assign(entry, updates);
        this.backlog.set(gameId, entry);
        this.saveToStorage();
        return entry;
    }

    /**
     * Remove from backlog
     */
    removeFromBacklog(gameId) {
        this.backlog.delete(gameId);
        this.saveToStorage();
    }

    /**
     * Get backlog entry
     */
    getEntry(gameId) {
        return this.backlog.get(gameId);
    }

    /**
     * Get all entries by status
     */
    getByStatus(status) {
        return Array.from(this.backlog.values())
            .filter(entry => entry.status === status)
            .sort((a, b) => b.priority - a.priority);
    }

    /**
     * Get statistics
     */
    getStatistics() {
        const stats = {
            total: this.backlog.size,
            wantToPlay: 0,
            playing: 0,
            completed: 0,
            beaten: 0,
            onHold: 0,
            dropped: 0,
            completionRate: 0,
            avgCompletionTime: 0
        };

        let totalCompletionTime = 0;
        let completedCount = 0;

        this.backlog.forEach(entry => {
            switch (entry.status) {
                case BacklogManager.STATUSES.WANT_TO_PLAY:
                    stats.wantToPlay++;
                    break;
                case BacklogManager.STATUSES.PLAYING:
                    stats.playing++;
                    break;
                case BacklogManager.STATUSES.COMPLETED:
                    stats.completed++;
                    if (entry.actualHours) {
                        totalCompletionTime += entry.actualHours;
                        completedCount++;
                    }
                    break;
                case BacklogManager.STATUSES.BEATEN:
                    stats.beaten++;
                    break;
                case BacklogManager.STATUSES.ON_HOLD:
                    stats.onHold++;
                    break;
                case BacklogManager.STATUSES.DROPPED:
                    stats.dropped++;
                    break;
            }
        });

        stats.completionRate = stats.total > 0 ?
            ((stats.completed + stats.beaten) / stats.total * 100).toFixed(1) : 0;

        stats.avgCompletionTime = completedCount > 0 ?
            (totalCompletionTime / completedCount).toFixed(1) : 0;

        return stats;
    }

    /**
     * Get priority games (high priority + want to play or playing)
     */
    getPriorityGames(limit = 5) {
        return Array.from(this.backlog.values())
            .filter(entry =>
                entry.priority >= BacklogManager.PRIORITIES.HIGH &&
                (entry.status === BacklogManager.STATUSES.WANT_TO_PLAY ||
                 entry.status === BacklogManager.STATUSES.PLAYING)
            )
            .sort((a, b) => b.priority - a.priority)
            .slice(0, limit);
    }

    /**
     * Export backlog
     */
    exportBacklog() {
        const data = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            entries: Array.from(this.backlog.values())
        };
        return JSON.stringify(data, null, 2);
    }

    /**
     * Import backlog
     */
    importBacklog(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (!data.entries || !Array.isArray(data.entries)) {
                throw new Error('Invalid backlog format');
            }

            data.entries.forEach(entry => {
                this.backlog.set(entry.gameId, entry);
            });

            this.saveToStorage();
            return data.entries.length;
        } catch (error) {
            console.error('[BACKLOG] Import error:', error);
            throw error;
        }
    }

    /**
     * Show backlog manager UI
     */
    showBacklogUI() {
        const stats = this.getStatistics();

        const modal = document.createElement('div');
        modal.className = 'backlog-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow-y: auto;
            padding: 20px;
        `;

        modal.innerHTML = `
            <div style="background: #1a1a1a; padding: 30px; border-radius: 12px; max-width: 1000px; width: 100%; max-height: 90vh; overflow-y: auto;">
                <h2 style="margin: 0 0 20px 0; color: #4fc3f7;">📚 Game Backlog Manager</h2>

                <!-- Statistics Dashboard -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 25px;">
                    <div style="background: #2a2a2a; padding: 16px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 28px; color: #4fc3f7; font-weight: bold;">${stats.total}</div>
                        <div style="color: #888; font-size: 12px; margin-top: 4px;">Total Games</div>
                    </div>
                    <div style="background: #2a2a2a; padding: 16px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 28px; color: #81c784; font-weight: bold;">${stats.completed}</div>
                        <div style="color: #888; font-size: 12px; margin-top: 4px;">Completed</div>
                    </div>
                    <div style="background: #2a2a2a; padding: 16px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 28px; color: #ffb74d; font-weight: bold;">${stats.playing}</div>
                        <div style="color: #888; font-size: 12px; margin-top: 4px;">Playing</div>
                    </div>
                    <div style="background: #2a2a2a; padding: 16px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 28px; color: #ff6b6b; font-weight: bold;">${stats.wantToPlay}</div>
                        <div style="color: #888; font-size: 12px; margin-top: 4px;">Want to Play</div>
                    </div>
                    <div style="background: #2a2a2a; padding: 16px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 28px; color: #9575cd; font-weight: bold;">${stats.completionRate}%</div>
                        <div style="color: #888; font-size: 12px; margin-top: 4px;">Completion Rate</div>
                    </div>
                </div>

                <!-- Filter Tabs -->
                <div style="display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap;">
                    <button class="backlog-filter" data-status="all" style="
                        padding: 8px 16px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        border: none;
                        border-radius: 6px;
                        color: #fff;
                        cursor: pointer;
                        font-size: 13px;
                        font-weight: bold;
                    ">All (${stats.total})</button>
                    <button class="backlog-filter" data-status="${BacklogManager.STATUSES.WANT_TO_PLAY}" style="
                        padding: 8px 16px;
                        background: #2a2a2a;
                        border: 1px solid #444;
                        border-radius: 6px;
                        color: #fff;
                        cursor: pointer;
                        font-size: 13px;
                    ">Want to Play (${stats.wantToPlay})</button>
                    <button class="backlog-filter" data-status="${BacklogManager.STATUSES.PLAYING}" style="
                        padding: 8px 16px;
                        background: #2a2a2a;
                        border: 1px solid #444;
                        border-radius: 6px;
                        color: #fff;
                        cursor: pointer;
                        font-size: 13px;
                    ">Playing (${stats.playing})</button>
                    <button class="backlog-filter" data-status="${BacklogManager.STATUSES.COMPLETED}" style="
                        padding: 8px 16px;
                        background: #2a2a2a;
                        border: 1px solid #444;
                        border-radius: 6px;
                        color: #fff;
                        cursor: pointer;
                        font-size: 13px;
                    ">Completed (${stats.completed})</button>
                    <button class="backlog-filter" data-status="${BacklogManager.STATUSES.ON_HOLD}" style="
                        padding: 8px 16px;
                        background: #2a2a2a;
                        border: 1px solid #444;
                        border-radius: 6px;
                        color: #fff;
                        cursor: pointer;
                        font-size: 13px;
                    ">On Hold (${stats.onHold})</button>
                </div>

                <!-- Game List -->
                <div id="backlog-list" style="margin-bottom: 20px; max-height: 400px; overflow-y: auto;">
                    <!-- Populated by JS -->
                </div>

                <!-- Actions -->
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <button id="add-to-backlog-btn" style="
                        flex: 1;
                        padding: 12px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        border: none;
                        border-radius: 6px;
                        color: #fff;
                        cursor: pointer;
                        font-weight: bold;
                    ">➕ Add Game to Backlog</button>
                    <button id="export-backlog-btn" style="
                        padding: 12px 20px;
                        background: #2a2a2a;
                        border: 1px solid #444;
                        border-radius: 6px;
                        color: #fff;
                        cursor: pointer;
                    ">Export</button>
                    <button id="import-backlog-btn" style="
                        padding: 12px 20px;
                        background: #2a2a2a;
                        border: 1px solid #444;
                        border-radius: 6px;
                        color: #fff;
                        cursor: pointer;
                    ">Import</button>
                    <input type="file" id="import-backlog-input" accept=".json" style="display: none;">
                </div>

                <button id="close-backlog-modal" style="
                    width: 100%;
                    padding: 12px;
                    background: #4fc3f7;
                    border: none;
                    border-radius: 6px;
                    color: #000;
                    cursor: pointer;
                    font-weight: bold;
                ">Close</button>
            </div>
        `;

        document.body.appendChild(modal);

        // Render initial list
        this.renderBacklogList(modal, 'all');

        // Filter buttons
        modal.querySelectorAll('.backlog-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.backlog-filter').forEach(b => {
                    b.style.background = '#2a2a2a';
                    b.style.border = '1px solid #444';
                });
                btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                btn.style.border = 'none';

                this.renderBacklogList(modal, btn.getAttribute('data-status'));
            });
        });

        // Add game button
        modal.querySelector('#add-to-backlog-btn').addEventListener('click', () => {
            this.showAddGameDialog(modal);
        });

        // Export
        modal.querySelector('#export-backlog-btn').addEventListener('click', () => {
            const json = this.exportBacklog();
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `game-backlog-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            if (window.coverflow && typeof window.coverflow.showToast === 'function') {
                window.coverflow.showToast('Backlog exported!', 'success');
            }
        });

        // Import
        modal.querySelector('#import-backlog-btn').addEventListener('click', () => {
            modal.querySelector('#import-backlog-input').click();
        });

        modal.querySelector('#import-backlog-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const count = this.importBacklog(event.target.result);
                        modal.remove();
                        this.showBacklogUI(); // Refresh

                        if (window.coverflow && typeof window.coverflow.showToast === 'function') {
                            window.coverflow.showToast(`Imported ${count} games!`, 'success');
                        }
                    } catch (error) {
                        if (window.coverflow && typeof window.coverflow.showToast === 'function') {
                            window.coverflow.showToast(`Import failed: ${error.message}`, 'error');
                        }
                    }
                };
                reader.readAsText(file);
            }
        });

        // Close
        modal.querySelector('#close-backlog-modal').addEventListener('click', () => {
            modal.remove();
        });

        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    /**
     * Render backlog list
     */
    renderBacklogList(modal, statusFilter) {
        const container = modal.querySelector('#backlog-list');
        const entries = statusFilter === 'all' ?
            Array.from(this.backlog.values()).sort((a, b) => b.priority - a.priority) :
            this.getByStatus(statusFilter);

        if (entries.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No games in this category</p>';
            return;
        }

        container.innerHTML = entries.map(entry => {
            const statusColors = {
                [BacklogManager.STATUSES.WANT_TO_PLAY]: '#ff6b6b',
                [BacklogManager.STATUSES.PLAYING]: '#ffb74d',
                [BacklogManager.STATUSES.COMPLETED]: '#81c784',
                [BacklogManager.STATUSES.BEATEN]: '#4fc3f7',
                [BacklogManager.STATUSES.ON_HOLD]: '#9575cd',
                [BacklogManager.STATUSES.DROPPED]: '#888'
            };

            const statusLabels = {
                [BacklogManager.STATUSES.WANT_TO_PLAY]: 'Want to Play',
                [BacklogManager.STATUSES.PLAYING]: 'Playing',
                [BacklogManager.STATUSES.COMPLETED]: 'Completed',
                [BacklogManager.STATUSES.BEATEN]: 'Beaten',
                [BacklogManager.STATUSES.ON_HOLD]: 'On Hold',
                [BacklogManager.STATUSES.DROPPED]: 'Dropped'
            };

            const priorityStars = '⭐'.repeat(entry.priority);

            return `
                <div class="backlog-entry" data-game-id="${entry.gameId}" style="
                    background: #2a2a2a;
                    padding: 16px;
                    margin: 8px 0;
                    border-radius: 8px;
                    border-left: 4px solid ${statusColors[entry.status]};
                    cursor: pointer;
                    transition: background 0.2s;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;">
                            <h3 style="margin: 0 0 8px 0; color: #fff; font-size: 16px;">${this.escapeHtml(entry.gameTitle)}</h3>
                            <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                                <span style="
                                    background: ${statusColors[entry.status]};
                                    color: #000;
                                    padding: 4px 10px;
                                    border-radius: 12px;
                                    font-size: 11px;
                                    font-weight: bold;
                                ">${statusLabels[entry.status]}</span>
                                <span style="color: #ffb74d; font-size: 14px;">${priorityStars}</span>
                                ${entry.completionPercentage > 0 ? `
                                    <span style="color: #81c784; font-size: 12px;">
                                        ${entry.completionPercentage}% complete
                                    </span>
                                ` : ''}
                                ${entry.actualHours ? `
                                    <span style="color: #4fc3f7; font-size: 12px;">
                                        ${entry.actualHours}h played
                                    </span>
                                ` : ''}
                            </div>
                            ${entry.notes ? `
                                <p style="color: #aaa; font-size: 13px; margin: 8px 0 0 0; font-style: italic;">
                                    "${this.escapeHtml(entry.notes).substring(0, 100)}${entry.notes.length > 100 ? '...' : ''}"
                                </p>
                            ` : ''}
                        </div>
                        <button class="edit-backlog-entry" data-game-id="${entry.gameId}" style="
                            padding: 6px 12px;
                            background: #667eea;
                            border: none;
                            border-radius: 4px;
                            color: #fff;
                            cursor: pointer;
                            font-size: 12px;
                            margin-left: 12px;
                        ">Edit</button>
                    </div>
                </div>
            `;
        }).join('');

        // Add edit button handlers
        container.querySelectorAll('.edit-backlog-entry').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const gameId = parseInt(btn.getAttribute('data-game-id'), 10);
                this.showEditEntryDialog(modal, gameId);
            });
        });

        // Add hover effects
        container.querySelectorAll('.backlog-entry').forEach(entry => {
            entry.addEventListener('mouseenter', () => entry.style.background = '#333');
            entry.addEventListener('mouseleave', () => entry.style.background = '#2a2a2a');
        });
    }

    /**
     * Show add game dialog (simplified for this example)
     */
    showAddGameDialog(parentModal) {
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #1a1a1a;
            padding: 25px;
            border-radius: 12px;
            z-index: 10000;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
        `;

        dialog.innerHTML = `
            <h3 style="margin: 0 0 20px 0; color: #4fc3f7;">Add Game to Backlog</h3>
            <p style="color: #888; font-size: 13px; margin-bottom: 15px;">
                Note: Select a game from your library using the search below, or enter a game name manually.
            </p>
            <input type="text" id="add-game-name" placeholder="Game name..." style="
                width: 100%;
                padding: 10px;
                background: #2a2a2a;
                border: 1px solid #444;
                border-radius: 6px;
                color: #fff;
                margin-bottom: 15px;
            ">
            <div style="display: flex; gap: 10px;">
                <button id="confirm-add-game" style="
                    flex: 1;
                    padding: 10px;
                    background: #667eea;
                    border: none;
                    border-radius: 6px;
                    color: #fff;
                    cursor: pointer;
                    font-weight: bold;
                ">Add</button>
                <button id="cancel-add-game" style="
                    flex: 1;
                    padding: 10px;
                    background: #2a2a2a;
                    border: 1px solid #444;
                    border-radius: 6px;
                    color: #fff;
                    cursor: pointer;
                ">Cancel</button>
            </div>
        `;

        document.body.appendChild(dialog);

        dialog.querySelector('#confirm-add-game').addEventListener('click', () => {
            const gameName = dialog.querySelector('#add-game-name').value.trim();
            if (gameName) {
                // For demo, use timestamp as gameId if no real ID
                const fakeId = Date.now();
                this.addToBacklog(fakeId, gameName);
                dialog.remove();
                parentModal.remove();
                this.showBacklogUI(); // Refresh

                if (window.coverflow && typeof window.coverflow.showToast === 'function') {
                    window.coverflow.showToast(`Added "${gameName}" to backlog!`, 'success');
                }
            }
        });

        dialog.querySelector('#cancel-add-game').addEventListener('click', () => {
            dialog.remove();
        });
    }

    /**
     * Show edit entry dialog
     */
    showEditEntryDialog(parentModal, gameId) {
        const entry = this.getEntry(gameId);
        if (!entry) return;

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #1a1a1a;
            padding: 25px;
            border-radius: 12px;
            z-index: 10000;
            max-width: 450px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
        `;

        dialog.innerHTML = `
            <h3 style="margin: 0 0 20px 0; color: #4fc3f7;">Edit: ${this.escapeHtml(entry.gameTitle)}</h3>

            <label style="display: block; color: #aaa; font-size: 13px; margin-bottom: 5px;">Status:</label>
            <select id="edit-status" style="
                width: 100%;
                padding: 10px;
                background: #2a2a2a;
                border: 1px solid #444;
                border-radius: 6px;
                color: #fff;
                margin-bottom: 15px;
            ">
                <option value="${BacklogManager.STATUSES.WANT_TO_PLAY}" ${entry.status === BacklogManager.STATUSES.WANT_TO_PLAY ? 'selected' : ''}>Want to Play</option>
                <option value="${BacklogManager.STATUSES.PLAYING}" ${entry.status === BacklogManager.STATUSES.PLAYING ? 'selected' : ''}>Playing</option>
                <option value="${BacklogManager.STATUSES.BEATEN}" ${entry.status === BacklogManager.STATUSES.BEATEN ? 'selected' : ''}>Beaten</option>
                <option value="${BacklogManager.STATUSES.COMPLETED}" ${entry.status === BacklogManager.STATUSES.COMPLETED ? 'selected' : ''}>100% Completed</option>
                <option value="${BacklogManager.STATUSES.ON_HOLD}" ${entry.status === BacklogManager.STATUSES.ON_HOLD ? 'selected' : ''}>On Hold</option>
                <option value="${BacklogManager.STATUSES.DROPPED}" ${entry.status === BacklogManager.STATUSES.DROPPED ? 'selected' : ''}>Dropped</option>
            </select>

            <label style="display: block; color: #aaa; font-size: 13px; margin-bottom: 5px;">Priority:</label>
            <select id="edit-priority" style="
                width: 100%;
                padding: 10px;
                background: #2a2a2a;
                border: 1px solid #444;
                border-radius: 6px;
                color: #fff;
                margin-bottom: 15px;
            ">
                <option value="1" ${entry.priority === 1 ? 'selected' : ''}>⭐ Low</option>
                <option value="2" ${entry.priority === 2 ? 'selected' : ''}>⭐⭐ Medium</option>
                <option value="3" ${entry.priority === 3 ? 'selected' : ''}>⭐⭐⭐ High</option>
                <option value="4" ${entry.priority === 4 ? 'selected' : ''}>⭐⭐⭐⭐ Urgent</option>
            </select>

            <label style="display: block; color: #aaa; font-size: 13px; margin-bottom: 5px;">Completion %:</label>
            <input type="number" id="edit-completion" min="0" max="100" value="${entry.completionPercentage}" style="
                width: 100%;
                padding: 10px;
                background: #2a2a2a;
                border: 1px solid #444;
                border-radius: 6px;
                color: #fff;
                margin-bottom: 15px;
            ">

            <label style="display: block; color: #aaa; font-size: 13px; margin-bottom: 5px;">Notes:</label>
            <textarea id="edit-notes" style="
                width: 100%;
                padding: 10px;
                background: #2a2a2a;
                border: 1px solid #444;
                border-radius: 6px;
                color: #fff;
                min-height: 80px;
                margin-bottom: 15px;
                resize: vertical;
            ">${entry.notes || ''}</textarea>

            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                <button id="save-edit" style="
                    flex: 1;
                    padding: 12px;
                    background: #667eea;
                    border: none;
                    border-radius: 6px;
                    color: #fff;
                    cursor: pointer;
                    font-weight: bold;
                ">Save</button>
                <button id="cancel-edit" style="
                    flex: 1;
                    padding: 12px;
                    background: #2a2a2a;
                    border: 1px solid #444;
                    border-radius: 6px;
                    color: #fff;
                    cursor: pointer;
                ">Cancel</button>
            </div>

            <button id="remove-from-backlog" style="
                width: 100%;
                padding: 10px;
                background: #e74c3c;
                border: none;
                border-radius: 6px;
                color: #fff;
                cursor: pointer;
                font-size: 13px;
            ">Remove from Backlog</button>
        `;

        document.body.appendChild(dialog);

        dialog.querySelector('#save-edit').addEventListener('click', () => {
            this.updateEntry(gameId, {
                status: dialog.querySelector('#edit-status').value,
                priority: parseInt(dialog.querySelector('#edit-priority').value, 10),
                completionPercentage: parseInt(dialog.querySelector('#edit-completion').value, 10),
                notes: dialog.querySelector('#edit-notes').value
            });

            dialog.remove();
            parentModal.remove();
            this.showBacklogUI(); // Refresh

            if (window.coverflow && typeof window.coverflow.showToast === 'function') {
                window.coverflow.showToast('Updated!', 'success');
            }
        });

        dialog.querySelector('#cancel-edit').addEventListener('click', () => {
            dialog.remove();
        });

        dialog.querySelector('#remove-from-backlog').addEventListener('click', () => {
            if (confirm(`Remove "${entry.gameTitle}" from backlog?`)) {
                this.removeFromBacklog(gameId);
                dialog.remove();
                parentModal.remove();
                this.showBacklogUI(); // Refresh

                if (window.coverflow && typeof window.coverflow.showToast === 'function') {
                    window.coverflow.showToast('Removed from backlog', 'success');
                }
            }
        });
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export for global use
if (typeof window !== 'undefined') {
    window.BacklogManager = BacklogManager;
}
