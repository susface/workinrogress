// Custom Cover Art Editor Module
// Create and edit custom box art for games

class CoverArtEditor {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.currentGame = null;
        this.history = [];
        this.historyIndex = -1;
        this.MAX_HISTORY_SIZE = 20; // Limit undo history
        this.templates = this.loadTemplates();
        this.customCovers = this.loadCustomCovers();
        this.activeModal = null; // Track active modal for cleanup
    }

    loadTemplates() {
        return [
            {
                name: 'Classic Box',
                width: 600,
                height: 900,
                layout: 'vertical',
                bgColor: '#2c3e50',
                hasTitle: true,
                hasLogo: true,
                titlePosition: 'bottom'
            },
            {
                name: 'Modern',
                width: 800,
                height: 600,
                layout: 'horizontal',
                bgColor: '#34495e',
                hasTitle: true,
                hasLogo: false,
                titlePosition: 'center'
            },
            {
                name: 'Minimalist',
                width: 600,
                height: 600,
                layout: 'square',
                bgColor: '#000000',
                hasTitle: true,
                hasLogo: false,
                titlePosition: 'top'
            },
            {
                name: 'Retro',
                width: 640,
                height: 960,
                layout: 'vertical',
                bgColor: '#8e44ad',
                hasTitle: true,
                hasLogo: false,
                titlePosition: 'bottom',
                style: 'retro'
            }
        ];
    }

    loadCustomCovers() {
        try {
            const saved = localStorage.getItem('custom-cover-art');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Failed to load custom covers:', error);
            return {};
        }
    }

    saveCustomCovers() {
        try {
            localStorage.setItem('custom-cover-art', JSON.stringify(this.customCovers));
        } catch (error) {
            console.error('Failed to save custom covers:', error);
        }
    }

    // Open editor for a game
    openEditor(game) {
        this.currentGame = game;
        this.showEditorModal();
    }

    // Generate options for all items in coverflow
    generateItemOptions() {
        const coverflowObj = window.coverflow || window.coverflowManager;

        console.log('[COVER_ART_EDITOR] Generating item options...');
        console.log('[COVER_ART_EDITOR] Coverflow object:', coverflowObj);

        // Get items from allAlbums or filteredAlbums
        const items = coverflowObj?.allAlbums || coverflowObj?.filteredAlbums || coverflowObj?.games || [];

        console.log('[COVER_ART_EDITOR] Items array:', items);
        console.log('[COVER_ART_EDITOR] Items count:', items.length);

        if (!coverflowObj || items.length === 0) {
            console.log('[COVER_ART_EDITOR] No items found, using current game only');
            const itemId = this.currentGame.id || this.currentGame.title || this.currentGame.name || 'current';
            const itemName = this.currentGame.title || this.currentGame.name || 'Current Item';
            return `<option value="${itemId}">${itemName}</option>`;
        }

        let options = '';
        items.forEach((item, index) => {
            // Use id if available, otherwise use title/name or index as fallback
            const itemId = item.id || item.title || item.name || `item-${index}`;
            const currentId = this.currentGame.id || this.currentGame.title || this.currentGame.name || 'current';
            const selected = itemId === currentId ? 'selected' : '';
            const type = item.type || 'game';
            const typeLabel = type !== 'game' ? ` [${type}]` : '';
            const itemName = item.title || item.name || `Item ${index + 1}`;
            options += `<option value="${itemId}" ${selected}>${itemName}${typeLabel}</option>`;
        });

        console.log('[COVER_ART_EDITOR] Generated options for', items.length, 'items');
        return options;
    }

    showEditorModal() {
        // Close existing modal if any
        if (this.activeModal) {
            this.closeEditor();
        }

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'cover-art-editor-modal';
        modal.className = 'modal-overlay';
        this.activeModal = modal;
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
            <div class="editor-container" style="
                background: #1a1a2e;
                border-radius: 10px;
                padding: 20px;
                max-width: 1400px;
                width: 95%;
                max-height: 90vh;
                overflow: auto;
            ">
                <div class="editor-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 15px;">
                    <h2 style="margin: 0; min-width: 180px;">🎨 Cover Art Editor</h2>
                    <div style="flex: 1; max-width: 800px;">
                        <label style="display: block; margin-bottom: 5px; font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.9);">Select Item to Edit:</label>
                        <select id="item-selector" style="width: 100%; padding: 12px; background: #1a1a1a; border: 1px solid rgba(255,255,255,0.3); border-radius: 5px; color: white; font-size: 18px;">
                            ${this.generateItemOptions()}
                        </select>
                    </div>
                    <button id="close-editor" class="btn" style="font-size: 18px; padding: 5px; width: 30px; height: 30px; min-width: 30px; line-height: 1;">✕</button>
                </div>

                <div class="editor-content" style="display: grid; grid-template-columns: 250px 1fr 300px; gap: 20px;">
                    <!-- Templates Panel -->
                    <div class="templates-panel" style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 5px;">
                        <h3>Templates</h3>
                        <div id="templates-list"></div>

                        <h3 style="margin-top: 20px;">Upload Image</h3>
                        <input type="file" id="upload-image" accept="image/*" style="width: 100%; margin-bottom: 10px;">

                        <h3>Quick Actions</h3>
                        <button id="search-online" class="btn btn-block">🔍 Search Online</button>
                    </div>

                    <!-- Canvas Area -->
                    <div class="canvas-panel" style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 5px; display: flex; align-items: center; justify-content: center;">
                        <div style="position: relative;">
                            <canvas id="cover-canvas" style="max-width: 100%; border: 2px solid #444;"></canvas>
                            <div id="canvas-overlay" style="
                                position: absolute;
                                top: 0;
                                left: 0;
                                width: 100%;
                                height: 100%;
                                pointer-events: none;
                                border: 2px dashed transparent;
                            "></div>
                        </div>
                    </div>

                    <!-- Tools Panel -->
                    <div class="tools-panel" style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 5px;">
                        <h3>Editing Tools</h3>

                        <div class="tool-section">
                            <h4>Background</h4>
                            <label>
                                <span>Color:</span>
                                <input type="color" id="bg-color" value="#2c3e50" style="width: 100%;">
                            </label>
                            <label style="display: block; margin-top: 10px;">
                                <input type="checkbox" id="bg-gradient">
                                <span>Use Gradient</span>
                            </label>
                            <input type="color" id="bg-color2" value="#34495e" style="width: 100%; margin-top: 5px; display: none;">
                        </div>

                        <div class="tool-section" style="margin-top: 15px;">
                            <h4>Text</h4>
                            <input type="text" id="title-text" placeholder="Game Title" value="${this.currentGame.title || this.currentGame.name || 'Game Title'}" style="width: 100%; padding: 5px; margin-bottom: 5px;">
                            <label>
                                <span>Font Size:</span>
                                <input type="range" id="font-size" min="20" max="100" value="48" style="width: 100%;">
                                <span id="font-size-value">48px</span>
                            </label>
                            <label style="margin-top: 5px;">
                                <span>Font:</span>
                                <select id="font-family" style="width: 100%; padding: 5px;">
                                    <option value="Arial">Arial</option>
                                    <option value="Impact">Impact</option>
                                    <option value="Georgia">Georgia</option>
                                    <option value="Courier New">Courier New</option>
                                    <option value="Verdana">Verdana</option>
                                </select>
                            </label>
                            <label style="margin-top: 5px;">
                                <span>Text Color:</span>
                                <input type="color" id="text-color" value="#ffffff" style="width: 100%;">
                            </label>
                            <label style="margin-top: 5px;">
                                <input type="checkbox" id="text-shadow" checked>
                                <span>Text Shadow</span>
                            </label>
                            <label style="margin-top: 5px;">
                                <span>Position:</span>
                                <select id="text-position" style="width: 100%; padding: 5px;">
                                    <option value="top">Top</option>
                                    <option value="center">Center</option>
                                    <option value="bottom" selected>Bottom</option>
                                </select>
                            </label>
                        </div>

                        <div class="tool-section" style="margin-top: 15px;">
                            <h4>Effects</h4>
                            <label>
                                <input type="checkbox" id="effect-vignette">
                                <span>Vignette</span>
                            </label>
                            <label style="display: block;">
                                <input type="checkbox" id="effect-scanlines">
                                <span>Scanlines (Retro)</span>
                            </label>
                            <label style="display: block;">
                                <input type="checkbox" id="effect-grain">
                                <span>Film Grain</span>
                            </label>
                        </div>

                        <div class="tool-section" style="margin-top: 15px;">
                            <h4>Actions</h4>
                            <button id="undo-btn" class="btn btn-block">↶ Undo</button>
                            <button id="redo-btn" class="btn btn-block">↷ Redo</button>
                            <button id="reset-btn" class="btn btn-block">🔄 Reset</button>
                            <button id="save-cover" class="btn btn-primary btn-block" style="margin-top: 10px;">💾 Save Cover</button>
                            <button id="export-cover" class="btn btn-block">📥 Export PNG</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Initialize canvas
        this.canvas = modal.querySelector('#cover-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Set default template
        this.applyTemplate(this.templates[0]);

        // Setup event listeners
        this.setupEventListeners(modal);

        // Render templates
        this.renderTemplates(modal);

        // Load existing custom cover if it exists
        this.loadExistingCover();

        // Initial render
        this.render();
    }

    setupEventListeners(modal) {
        // Close button
        modal.querySelector('#close-editor').addEventListener('click', () => {
            this.closeEditor();
        });

        // Item selector
        modal.querySelector('#item-selector').addEventListener('change', (e) => {
            const selectedId = e.target.value;
            const coverflowObj = window.coverflow || window.coverflowManager;
            const items = coverflowObj?.allAlbums || coverflowObj?.filteredAlbums || coverflowObj?.games || [];

            if (items && items.length > 0) {
                // Try to find by id, title, name, or index
                let selectedItem = items.find(item => {
                    const itemId = item.id || item.title || item.name;
                    return itemId === selectedId || String(itemId) === selectedId;
                });

                // If still not found, try by index
                if (!selectedItem && selectedId.startsWith('item-')) {
                    const index = parseInt(selectedId.replace('item-', ''));
                    selectedItem = items[index];
                }

                if (selectedItem) {
                    this.currentGame = selectedItem;
                    // Update the title text field
                    const titleInput = modal.querySelector('#title-text');
                    if (titleInput) {
                        titleInput.value = selectedItem.title || selectedItem.name || 'Untitled';
                    }
                    // Load existing cover for this item if available
                    this.loadExistingCover();
                    // Re-render with new item
                    this.render();
                }
            }
        });

        // Template selection
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('template-item')) {
                const index = parseInt(e.target.dataset.index);
                this.applyTemplate(this.templates[index]);
                this.render();
            }
        });

        // Background controls
        modal.querySelector('#bg-color').addEventListener('input', () => {
            this.saveState();
            this.render();
        });

        modal.querySelector('#bg-gradient').addEventListener('change', (e) => {
            modal.querySelector('#bg-color2').style.display = e.target.checked ? 'block' : 'none';
            this.saveState();
            this.render();
        });

        modal.querySelector('#bg-color2').addEventListener('input', () => {
            this.saveState();
            this.render();
        });

        // Text controls
        ['#title-text', '#font-size', '#font-family', '#text-color', '#text-shadow', '#text-position'].forEach(selector => {
            const element = modal.querySelector(selector);
            const event = element.type === 'checkbox' ? 'change' : 'input';

            element.addEventListener(event, () => {
                if (selector === '#font-size') {
                    modal.querySelector('#font-size-value').textContent = element.value + 'px';
                }
                this.saveState();
                this.render();
            });
        });

        // Effects
        ['#effect-vignette', '#effect-scanlines', '#effect-grain'].forEach(selector => {
            modal.querySelector(selector).addEventListener('change', () => {
                this.saveState();
                this.render();
            });
        });

        // Actions
        modal.querySelector('#undo-btn').addEventListener('click', () => this.undo());
        modal.querySelector('#redo-btn').addEventListener('click', () => this.redo());
        modal.querySelector('#reset-btn').addEventListener('click', () => {
            this.applyTemplate(this.templates[0]);
            this.render();
        });

        modal.querySelector('#save-cover').addEventListener('click', () => this.saveCover());
        modal.querySelector('#export-cover').addEventListener('click', () => this.exportCover());

        // Upload image
        modal.querySelector('#upload-image').addEventListener('change', (e) => {
            this.handleImageUpload(e);
        });

        // Search online
        modal.querySelector('#search-online').addEventListener('click', () => {
            this.searchOnline();
        });
    }

    renderTemplates(modal) {
        const container = modal.querySelector('#templates-list');
        container.innerHTML = this.templates.map((template, index) => `
            <div class="template-item" data-index="${index}" style="
                padding: 10px;
                margin: 5px 0;
                background: rgba(255,255,255,0.1);
                border-radius: 5px;
                cursor: pointer;
                transition: background 0.2s;
            " onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">
                <strong>${template.name}</strong><br>
                <small>${template.width}x${template.height}</small>
            </div>
        `).join('');
    }

    applyTemplate(template) {
        this.canvas.width = template.width;
        this.canvas.height = template.height;
        this.currentTemplate = template;
    }

    render() {
        const modal = document.getElementById('cover-art-editor-modal');
        if (!modal || !this.ctx || !this.canvas) return;

        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Background
        const bgGradient = modal.querySelector('#bg-gradient').checked;
        const bgColor = modal.querySelector('#bg-color').value;
        const bgColor2 = modal.querySelector('#bg-color2').value;

        if (bgGradient) {
            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, bgColor);
            gradient.addColorStop(1, bgColor2);
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = bgColor;
        }
        ctx.fillRect(0, 0, width, height);

        // Effects - Vignette
        if (modal.querySelector('#effect-vignette').checked) {
            const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width/2);
            gradient.addColorStop(0, 'transparent');
            gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
        }

        // Effects - Scanlines
        if (modal.querySelector('#effect-scanlines').checked) {
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            for (let i = 0; i < height; i += 4) {
                ctx.fillRect(0, i, width, 2);
            }
        }

        // Effects - Grain (optimized - skip pixels for performance)
        if (modal.querySelector('#effect-grain').checked) {
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;

            // Apply grain to every 4th pixel for better performance
            for (let i = 0; i < data.length; i += 16) {
                const noise = (Math.random() - 0.5) * 30;
                data[i] += noise;
                data[i + 1] += noise;
                data[i + 2] += noise;
            }

            ctx.putImageData(imageData, 0, 0);
        }

        // Text
        const titleText = modal.querySelector('#title-text').value;
        const fontSize = modal.querySelector('#font-size').value;
        const fontFamily = modal.querySelector('#font-family').value;
        const textColor = modal.querySelector('#text-color').value;
        const textShadow = modal.querySelector('#text-shadow').checked;
        const textPosition = modal.querySelector('#text-position').value;

        ctx.font = `bold ${fontSize}px ${fontFamily}`;
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';

        if (textShadow) {
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;
        }

        let textY;
        switch (textPosition) {
            case 'top':
                textY = parseInt(fontSize) + 20;
                break;
            case 'center':
                textY = height / 2;
                break;
            case 'bottom':
                textY = height - 40;
                break;
        }

        ctx.fillText(titleText, width / 2, textY);

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
                this.saveState();
                // Clean up to prevent memory leaks
                img.onload = null;
                img.onerror = null;
                img.src = '';
            };
            img.onerror = () => {
                console.error('[COVER_ART_EDITOR] Failed to load image');
                // Clean up
                img.onload = null;
                img.onerror = null;
            };
            img.src = e.target.result;

            // Clean up FileReader
            reader.onload = null;
        };
        reader.readAsDataURL(file);
    }

    searchOnline() {
        const gameName = this.currentGame.title || this.currentGame.name || 'game';
        const query = encodeURIComponent(`${gameName} game cover art`);
        const searchUrl = `https://www.google.com/search?tbm=isch&q=${query}`;
        window.open(searchUrl, '_blank');
    }

    saveCover() {
        const dataUrl = this.canvas.toDataURL('image/png');
        // Use id if available, otherwise use title or name as key
        const gameKey = this.currentGame.id || this.currentGame.title || this.currentGame.name;
        this.customCovers[gameKey] = dataUrl;
        this.saveCustomCovers();

        console.log('[COVER_ART_EDITOR] Cover saved for:', gameKey);

        // Update the game's image property
        this.currentGame.image = dataUrl;

        // Trigger a cover refresh in the coverflow
        const coverflowObj = window.coverflow || window.coverflowManager;
        if (coverflowObj) {
            // Update the game in the allAlbums array
            const items = coverflowObj.allAlbums || coverflowObj.filteredAlbums || coverflowObj.games || [];
            const gameIndex = items.findIndex(item => {
                const itemKey = item.id || item.title || item.name;
                return itemKey === gameKey;
            });

            if (gameIndex !== -1) {
                items[gameIndex].image = dataUrl;
                console.log('[COVER_ART_EDITOR] Updated game in array at index:', gameIndex);
            }

            // Recreate the 3D covers to show the updated image
            if (typeof coverflowObj.createCovers === 'function') {
                coverflowObj.createCovers();
                console.log('[COVER_ART_EDITOR] Refreshed 3D covers');
            }

            // Update thumbnails if the method exists
            if (typeof coverflowObj.createThumbnails === 'function') {
                coverflowObj.createThumbnails();
                console.log('[COVER_ART_EDITOR] Refreshed thumbnails');
            }
        }

        // Show success message
        if (typeof this.showToast === 'function') {
            this.showToast('Cover art saved successfully!', 'success');
        } else if (coverflowObj && typeof coverflowObj.showToast === 'function') {
            coverflowObj.showToast('Cover art saved successfully!', 'success');
        } else {
            alert('Cover art saved! The custom cover will be used in the launcher.');
        }
    }

    exportCover() {
        const dataUrl = this.canvas.toDataURL('image/png');
        const link = document.createElement('a');
        const gameName = this.currentGame.title || this.currentGame.name || 'game';
        link.download = `${gameName.replace(/[^a-z0-9]/gi, '_')}_cover.png`;
        link.href = dataUrl;
        link.click();
    }

    saveState() {
        if (!this.canvas) return;

        try {
            // Save current canvas state for undo/redo
            const dataUrl = this.canvas.toDataURL();
            this.history = this.history.slice(0, this.historyIndex + 1);
            this.history.push(dataUrl);
            this.historyIndex++;

            // Limit history size to prevent memory bloat
            if (this.history.length > this.MAX_HISTORY_SIZE) {
                this.history.shift();
                this.historyIndex--;
            }
        } catch (error) {
            console.error('[COVER-EDITOR] Failed to save state:', error);
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.loadState(this.history[this.historyIndex]);
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.loadState(this.history[this.historyIndex]);
        }
    }

    loadState(dataUrl) {
        const img = new Image();
        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0);
            // Clean up to prevent memory leaks
            img.onload = null;
            img.onerror = null;
            img.src = '';
        };
        img.onerror = () => {
            console.error('[COVER_ART_EDITOR] Failed to load state');
            // Clean up
            img.onload = null;
            img.onerror = null;
        };
        img.src = dataUrl;
    }

    loadExistingCover() {
        if (!this.currentGame || !this.canvas) return;

        const gameKey = this.currentGame.id || this.currentGame.title || this.currentGame.name;
        const existingCover = this.customCovers[gameKey];

        if (existingCover) {
            console.log('[COVER_ART_EDITOR] Loading existing custom cover for:', gameKey);
            const img = new Image();
            img.onload = () => {
                // Set canvas size to match the image
                this.canvas.width = img.width;
                this.canvas.height = img.height;

                // Draw the existing cover
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.drawImage(img, 0, 0);

                // Save to history
                this.saveState();

                // Clean up to prevent memory leaks
                img.onload = null;
                img.onerror = null;
                img.src = '';
            };
            img.onerror = () => {
                console.error('[COVER_ART_EDITOR] Failed to load existing cover');
                // Clean up
                img.onload = null;
                img.onerror = null;
            };
            img.src = existingCover;
        } else {
            console.log('[COVER_ART_EDITOR] No existing custom cover found for:', gameKey);
        }
    }

    // Get custom cover for a game
    getCustomCover(gameId) {
        return this.customCovers[gameId] || null;
    }

    // Check if game has custom cover
    hasCustomCover(gameId) {
        return !!this.customCovers[gameId];
    }

    // Close editor and cleanup
    closeEditor() {
        if (this.activeModal) {
            this.activeModal.remove();
            this.activeModal = null;
        }

        // Clear canvas to free memory
        if (this.canvas) {
            this.canvas.width = 0;
            this.canvas.height = 0;
            this.canvas = null;
            this.ctx = null;
        }
    }

    // Cleanup method to prevent memory leaks
    destroy() {
        console.log('[COVER-EDITOR] Destroying cover art editor...');

        // Close any open modal
        this.closeEditor();

        // Clear history
        this.history = [];
        this.historyIndex = -1;

        // Clear custom covers from memory (but keep in localStorage)
        this.customCovers = {};
    }
}

// Initialize
if (typeof window !== 'undefined') {
    window.coverArtEditor = new CoverArtEditor();
}
