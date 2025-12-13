// Launch Profiles Module
// Create and manage multiple launch configurations per game

class LaunchProfilesManager {
    constructor() {
        this.profiles = this.loadProfiles();
        this.activeModal = null;
    }

    // Load profiles from localStorage
    loadProfiles() {
        try {
            const saved = localStorage.getItem('launch-profiles');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('[LAUNCH_PROFILES] Failed to load profiles:', error);
            return {};
        }
    }

    // Save profiles to localStorage
    saveProfiles() {
        try {
            localStorage.setItem('launch-profiles', JSON.stringify(this.profiles));
        } catch (error) {
            console.error('[LAUNCH_PROFILES] Failed to save profiles:', error);
        }
    }

    // Get profiles for a game
    getGameProfiles(gameId) {
        return this.profiles[gameId] || [];
    }

    // Get default profile for a game
    getDefaultProfile(gameId) {
        const profiles = this.getGameProfiles(gameId);
        return profiles.find(p => p.isDefault) || profiles[0] || null;
    }

    // Create a new profile
    createProfile(gameId, profile) {
        if (!this.profiles[gameId]) {
            this.profiles[gameId] = [];
        }

        const newProfile = {
            id: Date.now().toString(),
            name: profile.name || 'New Profile',
            arguments: profile.arguments || '',
            workingDirectory: profile.workingDirectory || '',
            environmentVariables: profile.environmentVariables || {},
            preLaunchCommand: profile.preLaunchCommand || '',
            postLaunchCommand: profile.postLaunchCommand || '',
            isDefault: this.profiles[gameId].length === 0, // First profile is default
            createdAt: Date.now(),
            lastUsed: null
        };

        this.profiles[gameId].push(newProfile);
        this.saveProfiles();

        console.log(`[LAUNCH_PROFILES] Created profile "${newProfile.name}" for game ${gameId}`);
        return newProfile;
    }

    // Update a profile
    updateProfile(gameId, profileId, updates) {
        const profiles = this.getGameProfiles(gameId);
        const index = profiles.findIndex(p => p.id === profileId);

        if (index !== -1) {
            profiles[index] = { ...profiles[index], ...updates };
            this.saveProfiles();
            console.log(`[LAUNCH_PROFILES] Updated profile ${profileId}`);
            return profiles[index];
        }

        return null;
    }

    // Delete a profile
    deleteProfile(gameId, profileId) {
        const profiles = this.getGameProfiles(gameId);
        const index = profiles.findIndex(p => p.id === profileId);

        if (index !== -1) {
            const wasDefault = profiles[index].isDefault;
            profiles.splice(index, 1);

            // If deleted profile was default, make first remaining profile default
            if (wasDefault && profiles.length > 0) {
                profiles[0].isDefault = true;
            }

            this.profiles[gameId] = profiles;
            this.saveProfiles();
            console.log(`[LAUNCH_PROFILES] Deleted profile ${profileId}`);
            return true;
        }

        return false;
    }

    // Set default profile
    setDefaultProfile(gameId, profileId) {
        const profiles = this.getGameProfiles(gameId);

        profiles.forEach(p => {
            p.isDefault = p.id === profileId;
        });

        this.saveProfiles();
        console.log(`[LAUNCH_PROFILES] Set default profile to ${profileId}`);
    }

    // Build launch command with profile
    buildLaunchCommand(game, profile = null) {
        const selectedProfile = profile || this.getDefaultProfile(game.id);
        let command = game.launch_command || '';

        if (selectedProfile) {
            // Add arguments
            if (selectedProfile.arguments) {
                command += ` ${selectedProfile.arguments}`;
            }

            // Record last used
            selectedProfile.lastUsed = Date.now();
            this.saveProfiles();
        }

        return {
            command: command.trim(),
            profile: selectedProfile,
            workingDirectory: selectedProfile?.workingDirectory || game.install_directory,
            environmentVariables: selectedProfile?.environmentVariables || {},
            preLaunchCommand: selectedProfile?.preLaunchCommand || '',
            postLaunchCommand: selectedProfile?.postLaunchCommand || ''
        };
    }

    // Show profiles manager modal
    showProfilesModal(game) {
        if (this.activeModal) {
            this.closeModal();
        }

        const profiles = this.getGameProfiles(game.id);

        const modal = document.createElement('div');
        modal.id = 'launch-profiles-modal';
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
            <div class="profiles-container" style="
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 15px;
                padding: 25px;
                max-width: 800px;
                width: 95%;
                max-height: 90vh;
                overflow: auto;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            ">
                <div class="profiles-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <div>
                        <h2 style="margin: 0; color: #4fc3f7;">
                            <span style="margin-right: 10px;">🚀</span>
                            Launch Profiles
                        </h2>
                        <p style="margin: 5px 0 0 0; color: rgba(255,255,255,0.6); font-size: 14px;">
                            ${this.escapeHtml(game.title || game.name)}
                        </p>
                    </div>
                    <button id="close-profiles" class="btn" style="font-size: 20px; padding: 5px 12px; background: rgba(255,255,255,0.1);">×</button>
                </div>

                <div class="profiles-actions" style="margin-bottom: 20px;">
                    <button id="create-profile-btn" class="btn" style="padding: 10px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer;">
                        ➕ New Profile
                    </button>
                </div>

                <div id="profiles-list" style="display: flex; flex-direction: column; gap: 15px;">
                    ${profiles.length === 0 ? `
                        <div class="empty-state" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                            <p style="font-size: 18px; margin-bottom: 10px;">No launch profiles yet</p>
                            <p style="font-size: 14px;">Create a profile to customize how you launch this game</p>
                        </div>
                    ` : profiles.map(profile => this.renderProfileCard(profile, game)).join('')}
                </div>

                <div id="profile-editor" style="display: none; margin-top: 20px; padding: 20px; background: rgba(0,0,0,0.3); border-radius: 10px;">
                    <h3 style="margin: 0 0 20px 0; color: #81c784;">
                        <span id="editor-title">Create Profile</span>
                    </h3>

                    <div style="display: grid; gap: 15px;">
                        <div>
                            <label style="display: block; margin-bottom: 5px; color: rgba(255,255,255,0.8);">Profile Name:</label>
                            <input type="text" id="profile-name-input" placeholder="e.g., With Mods, Performance Mode, Vanilla"
                                style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 5px; color: white; box-sizing: border-box;">
                        </div>

                        <div>
                            <label style="display: block; margin-bottom: 5px; color: rgba(255,255,255,0.8);">Launch Arguments:</label>
                            <input type="text" id="profile-args-input" placeholder="e.g., -fullscreen -high -dx12"
                                style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 5px; color: white; font-family: monospace; box-sizing: border-box;">
                            <small style="color: rgba(255,255,255,0.5);">Command line arguments to pass to the game</small>
                        </div>

                        <div>
                            <label style="display: block; margin-bottom: 5px; color: rgba(255,255,255,0.8);">Working Directory (Optional):</label>
                            <input type="text" id="profile-workdir-input" placeholder="Leave empty for game's install directory"
                                style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 5px; color: white; box-sizing: border-box;">
                        </div>

                        <div>
                            <label style="display: block; margin-bottom: 5px; color: rgba(255,255,255,0.8);">Pre-Launch Command (Optional):</label>
                            <input type="text" id="profile-prelaunch-input" placeholder="Command to run before launching the game"
                                style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 5px; color: white; font-family: monospace; box-sizing: border-box;">
                            <small style="color: rgba(255,255,255,0.5);">e.g., Start a mod manager, kill conflicting processes</small>
                        </div>

                        <div>
                            <label style="display: block; margin-bottom: 5px; color: rgba(255,255,255,0.8);">Environment Variables (Optional):</label>
                            <textarea id="profile-env-input" placeholder="KEY=VALUE (one per line)"
                                style="width: 100%; height: 80px; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 5px; color: white; font-family: monospace; resize: vertical; box-sizing: border-box;"></textarea>
                            <small style="color: rgba(255,255,255,0.5);">e.g., DXVK_HUD=fps, STEAM_COMPAT_DATA_PATH=/path</small>
                        </div>

                        <div style="display: flex; gap: 10px; margin-top: 10px;">
                            <button id="save-profile-btn" class="btn" style="padding: 10px 25px; background: #4CAF50; border: none; border-radius: 5px; color: white; cursor: pointer;">
                                💾 Save Profile
                            </button>
                            <button id="cancel-profile-btn" class="btn" style="padding: 10px 25px; background: rgba(255,255,255,0.1); border: none; border-radius: 5px; color: white; cursor: pointer;">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.activeModal = modal;
        this.currentGame = game;
        this.editingProfileId = null;

        // Setup event listeners
        this.setupModalEvents(modal, game);
    }

    renderProfileCard(profile, game) {
        return `
            <div class="profile-card" data-profile-id="${profile.id}" style="
                padding: 15px 20px;
                background: ${profile.isDefault ? 'rgba(79, 195, 247, 0.15)' : 'rgba(255,255,255,0.05)'};
                border: 1px solid ${profile.isDefault ? '#4fc3f7' : 'rgba(255,255,255,0.1)'};
                border-radius: 10px;
                transition: all 0.2s;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                            <strong style="font-size: 16px; color: white;">${this.escapeHtml(profile.name)}</strong>
                            ${profile.isDefault ? '<span style="padding: 2px 8px; background: #4fc3f7; color: #000; border-radius: 3px; font-size: 11px; font-weight: bold;">DEFAULT</span>' : ''}
                        </div>
                        ${profile.arguments ? `
                            <div style="font-family: monospace; font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 5px;">
                                Args: ${this.escapeHtml(profile.arguments)}
                            </div>
                        ` : ''}
                        ${profile.lastUsed ? `
                            <div style="font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 5px;">
                                Last used: ${new Date(profile.lastUsed).toLocaleDateString()}
                            </div>
                        ` : ''}
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="launch-profile-btn btn" data-profile-id="${profile.id}" style="padding: 8px 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 5px; color: white; cursor: pointer; font-size: 13px;">
                            ▶ Launch
                        </button>
                        <button class="edit-profile-btn btn" data-profile-id="${profile.id}" style="padding: 8px 12px; background: rgba(255,255,255,0.1); border: none; border-radius: 5px; color: white; cursor: pointer;">
                            ✏️
                        </button>
                        ${!profile.isDefault ? `
                            <button class="set-default-btn btn" data-profile-id="${profile.id}" style="padding: 8px 12px; background: rgba(255,255,255,0.1); border: none; border-radius: 5px; color: white; cursor: pointer;" title="Set as default">
                                ⭐
                            </button>
                        ` : ''}
                        <button class="delete-profile-btn btn" data-profile-id="${profile.id}" style="padding: 8px 12px; background: rgba(244, 67, 54, 0.3); border: none; border-radius: 5px; color: #ff6b6b; cursor: pointer;">
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    setupModalEvents(modal, game) {
        // Close button
        modal.querySelector('#close-profiles').addEventListener('click', () => {
            this.closeModal();
        });

        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });

        // Create profile button
        modal.querySelector('#create-profile-btn').addEventListener('click', () => {
            this.showEditor(modal);
        });

        // Cancel editor
        modal.querySelector('#cancel-profile-btn').addEventListener('click', () => {
            this.hideEditor(modal);
        });

        // Save profile
        modal.querySelector('#save-profile-btn').addEventListener('click', () => {
            this.saveProfile(modal, game);
        });

        // Profile action buttons (using event delegation)
        modal.querySelector('#profiles-list').addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            const profileId = btn.dataset.profileId;

            if (btn.classList.contains('launch-profile-btn')) {
                this.launchWithProfile(game, profileId);
            } else if (btn.classList.contains('edit-profile-btn')) {
                this.editProfile(modal, profileId);
            } else if (btn.classList.contains('set-default-btn')) {
                this.setDefaultProfile(game.id, profileId);
                this.refreshProfilesList(modal, game);
            } else if (btn.classList.contains('delete-profile-btn')) {
                if (confirm('Are you sure you want to delete this profile?')) {
                    this.deleteProfile(game.id, profileId);
                    this.refreshProfilesList(modal, game);
                }
            }
        });
    }

    showEditor(modal, profile = null) {
        const editor = modal.querySelector('#profile-editor');
        const title = modal.querySelector('#editor-title');

        if (profile) {
            title.textContent = 'Edit Profile';
            modal.querySelector('#profile-name-input').value = profile.name;
            modal.querySelector('#profile-args-input').value = profile.arguments || '';
            modal.querySelector('#profile-workdir-input').value = profile.workingDirectory || '';
            modal.querySelector('#profile-prelaunch-input').value = profile.preLaunchCommand || '';
            modal.querySelector('#profile-env-input').value = this.envToString(profile.environmentVariables);
            this.editingProfileId = profile.id;
        } else {
            title.textContent = 'Create Profile';
            modal.querySelector('#profile-name-input').value = '';
            modal.querySelector('#profile-args-input').value = '';
            modal.querySelector('#profile-workdir-input').value = '';
            modal.querySelector('#profile-prelaunch-input').value = '';
            modal.querySelector('#profile-env-input').value = '';
            this.editingProfileId = null;
        }

        editor.style.display = 'block';
        modal.querySelector('#profile-name-input').focus();
    }

    hideEditor(modal) {
        modal.querySelector('#profile-editor').style.display = 'none';
        this.editingProfileId = null;
    }

    saveProfile(modal, game) {
        const name = modal.querySelector('#profile-name-input').value.trim();
        const args = modal.querySelector('#profile-args-input').value.trim();
        const workDir = modal.querySelector('#profile-workdir-input').value.trim();
        const preLaunch = modal.querySelector('#profile-prelaunch-input').value.trim();
        const envVars = this.parseEnvString(modal.querySelector('#profile-env-input').value);

        if (!name) {
            this.showToast('Please enter a profile name', 'error');
            return;
        }

        const profileData = {
            name,
            arguments: args,
            workingDirectory: workDir,
            preLaunchCommand: preLaunch,
            environmentVariables: envVars
        };

        if (this.editingProfileId) {
            this.updateProfile(game.id, this.editingProfileId, profileData);
        } else {
            this.createProfile(game.id, profileData);
        }

        this.hideEditor(modal);
        this.refreshProfilesList(modal, game);
        this.showToast(`Profile "${name}" saved!`, 'success');
    }

    editProfile(modal, profileId) {
        const profiles = this.getGameProfiles(this.currentGame.id);
        const profile = profiles.find(p => p.id === profileId);
        if (profile) {
            this.showEditor(modal, profile);
        }
    }

    refreshProfilesList(modal, game) {
        const list = modal.querySelector('#profiles-list');
        const profiles = this.getGameProfiles(game.id);

        if (profiles.length === 0) {
            list.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                    <p style="font-size: 18px; margin-bottom: 10px;">No launch profiles yet</p>
                    <p style="font-size: 14px;">Create a profile to customize how you launch this game</p>
                </div>
            `;
        } else {
            list.innerHTML = profiles.map(profile => this.renderProfileCard(profile, game)).join('');
        }
    }

    async launchWithProfile(game, profileId) {
        const profiles = this.getGameProfiles(game.id);
        const profile = profiles.find(p => p.id === profileId);

        if (!profile) {
            this.showToast('Profile not found', 'error');
            return;
        }

        const launchConfig = this.buildLaunchCommand(game, profile);

        try {
            // Run pre-launch command if specified
            if (launchConfig.preLaunchCommand && window.electronAPI) {
                console.log('[LAUNCH_PROFILES] Running pre-launch command:', launchConfig.preLaunchCommand);
                // Note: This would need IPC support in main.js
            }

            // Launch the game
            if (window.electronAPI && window.electronAPI.launchGame) {
                const result = await window.electronAPI.launchGame(launchConfig.command, game.id);
                if (result.success) {
                    this.showToast(`Launched with "${profile.name}" profile`, 'success');
                    this.closeModal();
                } else {
                    throw new Error(result.error || 'Launch failed');
                }
            } else {
                // Fallback for non-Electron
                this.showToast(`Would launch with: ${launchConfig.command}`, 'info');
            }

        } catch (error) {
            console.error('[LAUNCH_PROFILES] Launch failed:', error);
            this.showToast(`Launch failed: ${error.message}`, 'error');
        }
    }

    parseEnvString(str) {
        const env = {};
        if (!str) return env;

        str.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && trimmed.includes('=')) {
                const [key, ...valueParts] = trimmed.split('=');
                env[key.trim()] = valueParts.join('=').trim();
            }
        });

        return env;
    }

    envToString(env) {
        if (!env || typeof env !== 'object') return '';
        return Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n');
    }

    closeModal() {
        if (this.activeModal) {
            this.activeModal.remove();
            this.activeModal = null;
        }
        this.currentGame = null;
        this.editingProfileId = null;
    }

    showToast(message, type = 'info') {
        const coverflowObj = window.coverflow || window.coverflowManager;
        if (coverflowObj && typeof coverflowObj.showToast === 'function') {
            coverflowObj.showToast(message, type);
        } else {
            console.log(`[LAUNCH_PROFILES] ${type}: ${message}`);
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Quick launch with default profile
    async quickLaunch(game) {
        const defaultProfile = this.getDefaultProfile(game.id);

        if (!defaultProfile) {
            // No profile, launch normally
            if (window.electronAPI && window.electronAPI.launchGame) {
                return await window.electronAPI.launchGame(game.launch_command, game.id);
            }
            return { success: false, error: 'No launch method available' };
        }

        return this.launchWithProfile(game, defaultProfile.id);
    }

    // Cleanup
    destroy() {
        this.closeModal();
    }
}

// Initialize globally
if (typeof window !== 'undefined') {
    window.launchProfilesManager = new LaunchProfilesManager();
}
