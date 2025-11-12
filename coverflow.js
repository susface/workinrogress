// Enhanced CoverFlow Implementation using Three.js
class CoverFlow {
    constructor() {
        this.container = document.getElementById('coverflow-container');
        this.currentIndex = 0;
        this.targetIndex = 0;
        this.covers = [];
        this.reflections = [];
        this.allAlbums = [];
        this.filteredAlbums = [];
        this.isAnimating = false;
        this.autoRotateInterval = null;

        // Settings with defaults
        this.settings = {
            animationSpeed: 0.1,
            coverSpacing: 2.5,
            sideAngle: Math.PI / 3,
            showReflections: true,
            autoRotate: false
        };

        this.loadSettings();
        this.initAlbumData();
        this.init();
        this.createCovers();
        this.createThumbnails();
        this.addEventListeners();
        this.animate();
        this.updateInfo();
        this.hideLoadingScreen();
    }

    loadSettings() {
        const saved = localStorage.getItem('coverflow-settings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    }

    saveSettings() {
        localStorage.setItem('coverflow-settings', JSON.stringify(this.settings));
    }

    initAlbumData() {
        // Enhanced album data with more information
        const albums = [
            { title: 'Midnight Dreams', artist: 'Luna Eclipse', year: '2023', genre: 'Electronic', color: 0xFF6B6B },
            { title: 'Ocean Waves', artist: 'Aqua Marina', year: '2022', genre: 'Ambient', color: 0x4ECDC4 },
            { title: 'Urban Lights', artist: 'City Sounds', year: '2023', genre: 'Hip Hop', color: 0x45B7D1 },
            { title: 'Sunset Boulevard', artist: 'Golden Hour', year: '2021', genre: 'Jazz', color: 0xFFA07A },
            { title: 'Forest Whispers', artist: 'Nature\'s Voice', year: '2022', genre: 'Classical', color: 0x98D8C8 },
            { title: 'Electric Storm', artist: 'Thunder Bay', year: '2023', genre: 'Rock', color: 0xF7DC6F },
            { title: 'Neon Nights', artist: 'Synthwave Collective', year: '2022', genre: 'Synthwave', color: 0xBB8FCE },
            { title: 'Mountain Peak', artist: 'Summit Sounds', year: '2021', genre: 'Folk', color: 0x85C1E2 },
            { title: 'Desert Rose', artist: 'Sahara Ensemble', year: '2023', genre: 'World', color: 0xF8B195 },
            { title: 'Cosmic Journey', artist: 'Space Travelers', year: '2022', genre: 'Psychedelic', color: 0xC06C84 },
            { title: 'Velvet Dreams', artist: 'Midnight Lounge', year: '2021', genre: 'Lounge', color: 0x6C5B7B },
            { title: 'Winter Solstice', artist: 'Arctic Symphony', year: '2023', genre: 'Orchestral', color: 0x355C7D },
            { title: 'Tokyo Nights', artist: 'J-Wave', year: '2022', genre: 'J-Pop', color: 0xFF69B4 },
            { title: 'Latin Fire', artist: 'Salsa Kings', year: '2023', genre: 'Latin', color: 0xFF4500 },
            { title: 'Deep Blue', artist: 'Ocean Jazz Quartet', year: '2021', genre: 'Jazz', color: 0x191970 },
            { title: 'Retro Wave', artist: '80s Revival', year: '2022', genre: 'Synthpop', color: 0xFF1493 }
        ];

        this.allAlbums = albums;
        this.filteredAlbums = [...albums];
        document.getElementById('total-albums').textContent = this.filteredAlbums.length;
    }

    init() {
        // Scene setup
        this.scene = new THREE.Scene();

        // Camera setup with better perspective
        this.camera = new THREE.PerspectiveCamera(
            45,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0.5, 9);
        this.camera.lookAt(0, 0, 0);

        // Renderer setup with better quality
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Enhanced lighting for better visuals
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        mainLight.position.set(5, 5, 5);
        mainLight.castShadow = true;
        this.scene.add(mainLight);

        const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
        fillLight.position.set(-5, 3, -5);
        this.scene.add(fillLight);

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    createCovers() {
        const coverWidth = 2;
        const coverHeight = 2;

        this.filteredAlbums.forEach((album, index) => {
            // Create cover group (for cover + reflection)
            const coverGroup = new THREE.Group();

            // Create cover geometry
            const geometry = new THREE.PlaneGeometry(coverWidth, coverHeight);

            // Create material - support for images or colors
            let material;
            if (album.image) {
                const texture = new THREE.TextureLoader().load(album.image);
                material = new THREE.MeshPhongMaterial({
                    map: texture,
                    side: THREE.DoubleSide,
                    shininess: 80
                });
            } else {
                material = new THREE.MeshPhongMaterial({
                    color: album.color,
                    side: THREE.DoubleSide,
                    shininess: 80
                });
            }

            const cover = new THREE.Mesh(geometry, material);
            cover.castShadow = true;
            cover.userData = { index, album, isCover: true };

            // Add border/frame with subtle glow
            const borderGeometry = new THREE.EdgesGeometry(geometry);
            const borderMaterial = new THREE.LineBasicMaterial({
                color: 0xffffff,
                linewidth: 1
            });
            const border = new THREE.LineSegments(borderGeometry, borderMaterial);
            cover.add(border);

            coverGroup.add(cover);

            // Create reflection
            const reflectionMaterial = material.clone();
            reflectionMaterial.opacity = 0.3;
            reflectionMaterial.transparent = true;

            const reflection = new THREE.Mesh(geometry, reflectionMaterial);
            reflection.position.y = -coverHeight;
            reflection.rotation.x = Math.PI;
            reflection.scale.y = -0.6;
            reflection.userData = { isReflection: true };

            coverGroup.add(reflection);
            this.reflections.push(reflection);

            this.scene.add(coverGroup);
            this.covers.push(coverGroup.children[0]); // Store the actual cover, not the group
        });

        this.updateCoverPositions(true);
    }

    updateCoverPositions(immediate = false) {
        const spacing = this.settings.coverSpacing;
        const sideAngle = this.settings.sideAngle;
        const sideOffset = 1.5;
        const depthOffset = 1.5;
        const speed = this.settings.animationSpeed;

        this.covers.forEach((cover, index) => {
            const diff = index - this.targetIndex;
            const parent = cover.parent;

            let targetX, targetZ, targetRotY, targetScale, targetY;

            if (diff === 0) {
                // Center cover - flat and prominent
                targetX = 0;
                targetY = 0;
                targetZ = 0;
                targetRotY = 0;
                targetScale = 1.3;
            } else if (diff < 0) {
                // Left side covers
                targetX = diff * spacing - sideOffset;
                targetY = -0.2 - Math.abs(diff) * 0.05;
                targetZ = -depthOffset - Math.abs(diff) * 0.4;
                targetRotY = sideAngle;
                targetScale = Math.max(0.7, 1 - Math.abs(diff) * 0.1);
            } else {
                // Right side covers
                targetX = diff * spacing + sideOffset;
                targetY = -0.2 - Math.abs(diff) * 0.05;
                targetZ = -depthOffset - Math.abs(diff) * 0.4;
                targetRotY = -sideAngle;
                targetScale = Math.max(0.7, 1 - Math.abs(diff) * 0.1);
            }

            // Smooth animation with easing
            if (immediate) {
                parent.position.x = targetX;
                parent.position.y = targetY;
                parent.position.z = targetZ;
                parent.rotation.y = targetRotY;
                parent.scale.set(targetScale, targetScale, 1);
            } else {
                // Cubic easing for smoother motion
                parent.position.x += (targetX - parent.position.x) * speed;
                parent.position.y += (targetY - parent.position.y) * speed;
                parent.position.z += (targetZ - parent.position.z) * speed;
                parent.rotation.y += (targetRotY - parent.rotation.y) * speed;

                const currentScale = parent.scale.x;
                const newScale = currentScale + (targetScale - currentScale) * speed;
                parent.scale.set(newScale, newScale, 1);
            }

            // Update opacity based on distance from center
            const opacity = 1 - Math.min(Math.abs(diff) * 0.12, 0.6);
            cover.material.opacity = opacity;
            cover.material.transparent = true;

            // Update reflection visibility
            const reflection = parent.children[1];
            if (reflection && reflection.userData.isReflection) {
                reflection.visible = this.settings.showReflections;
                reflection.material.opacity = opacity * 0.3;
            }
        });
    }

    navigate(direction) {
        if (this.isAnimating) return;

        const newIndex = this.targetIndex + direction;
        if (newIndex < 0 || newIndex >= this.filteredAlbums.length) return;

        this.targetIndex = newIndex;
        this.isAnimating = true;
        this.currentIndex = this.targetIndex;
        this.updateInfo();
        this.updateThumbnails();

        setTimeout(() => {
            this.isAnimating = false;
        }, 300);
    }

    navigateTo(index) {
        if (this.isAnimating || index === this.currentIndex || index < 0 || index >= this.filteredAlbums.length) return;

        this.targetIndex = index;
        this.isAnimating = true;
        this.currentIndex = this.targetIndex;
        this.updateInfo();
        this.updateThumbnails();

        setTimeout(() => {
            this.isAnimating = false;
        }, 300);
    }

    navigateToFirst() {
        this.navigateTo(0);
    }

    navigateToLast() {
        this.navigateTo(this.filteredAlbums.length - 1);
    }

    navigateRandom() {
        const randomIndex = Math.floor(Math.random() * this.filteredAlbums.length);
        this.navigateTo(randomIndex);
    }

    updateInfo() {
        const album = this.filteredAlbums[this.currentIndex];
        document.getElementById('album-title').textContent = album.title;
        document.getElementById('album-artist').textContent = album.artist;
        document.getElementById('album-year').textContent = album.year;
        document.getElementById('album-genre').textContent = album.genre;
        document.getElementById('current-position').textContent = this.currentIndex + 1;
    }

    createThumbnails() {
        const container = document.getElementById('thumbnail-container');
        container.innerHTML = '';

        this.filteredAlbums.forEach((album, index) => {
            const thumb = document.createElement('canvas');
            thumb.className = 'thumbnail';
            thumb.width = 60;
            thumb.height = 60;

            const ctx = thumb.getContext('2d');

            // Draw colored background
            ctx.fillStyle = '#' + album.color.toString(16).padStart(6, '0');
            ctx.fillRect(0, 0, 60, 60);

            // Add subtle gradient
            const gradient = ctx.createLinearGradient(0, 0, 60, 60);
            gradient.addColorStop(0, 'rgba(255,255,255,0.2)');
            gradient.addColorStop(1, 'rgba(0,0,0,0.2)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 60, 60);

            thumb.addEventListener('click', () => this.navigateTo(index));
            container.appendChild(thumb);
        });

        this.updateThumbnails();
    }

    updateThumbnails() {
        const thumbs = document.querySelectorAll('.thumbnail');
        thumbs.forEach((thumb, index) => {
            thumb.classList.toggle('active', index === this.currentIndex);
        });

        // Scroll active thumbnail into view
        const activeThumb = thumbs[this.currentIndex];
        if (activeThumb) {
            activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }

        // Update navigation buttons
        document.getElementById('thumb-prev').disabled = this.currentIndex === 0;
        document.getElementById('thumb-next').disabled = this.currentIndex === this.filteredAlbums.length - 1;
    }

    filterAlbums(query) {
        const lowerQuery = query.toLowerCase().trim();

        if (!lowerQuery) {
            this.filteredAlbums = [...this.allAlbums];
        } else {
            this.filteredAlbums = this.allAlbums.filter(album =>
                album.title.toLowerCase().includes(lowerQuery) ||
                album.artist.toLowerCase().includes(lowerQuery) ||
                album.genre.toLowerCase().includes(lowerQuery)
            );
        }

        // Rebuild the scene
        this.clearScene();
        this.currentIndex = 0;
        this.targetIndex = 0;
        this.createCovers();
        this.createThumbnails();
        this.updateInfo();
        document.getElementById('total-albums').textContent = this.filteredAlbums.length;
    }

    clearScene() {
        this.covers.forEach(cover => {
            if (cover.parent) {
                this.scene.remove(cover.parent);
            }
        });
        this.covers = [];
        this.reflections = [];
    }

    loadFromJSON(jsonData) {
        try {
            this.allAlbums = jsonData.albums || jsonData;
            this.filteredAlbums = [...this.allAlbums];
            this.clearScene();
            this.currentIndex = 0;
            this.targetIndex = 0;
            this.createCovers();
            this.createThumbnails();
            this.updateInfo();
            document.getElementById('total-albums').textContent = this.filteredAlbums.length;
        } catch (error) {
            console.error('Error loading JSON:', error);
            alert('Failed to load albums from JSON file. Please check the format.');
        }
    }

    toggleAutoRotate() {
        this.settings.autoRotate = !this.settings.autoRotate;

        if (this.settings.autoRotate) {
            this.autoRotateInterval = setInterval(() => {
                const nextIndex = (this.currentIndex + 1) % this.filteredAlbums.length;
                this.navigateTo(nextIndex);
            }, 5000);
        } else {
            if (this.autoRotateInterval) {
                clearInterval(this.autoRotateInterval);
                this.autoRotateInterval = null;
            }
        }

        this.saveSettings();
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log('Fullscreen error:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    addEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            // Don't interfere when typing in search
            if (e.target.tagName === 'INPUT') return;

            switch(e.key) {
                case 'ArrowLeft':
                    this.navigate(-1);
                    break;
                case 'ArrowRight':
                    this.navigate(1);
                    break;
                case 'Home':
                    this.navigateToFirst();
                    break;
                case 'End':
                    this.navigateToLast();
                    break;
                case ' ':
                    e.preventDefault();
                    this.navigateRandom();
                    break;
                case 'f':
                case 'F':
                    this.toggleFullscreen();
                    break;
                case '?':
                    this.openModal('shortcuts-modal');
                    break;
                case 'Escape':
                    this.closeAllModals();
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    }
                    break;
                default:
                    // Number keys 1-9 for percentage jumps
                    if (e.key >= '1' && e.key <= '9') {
                        const percent = parseInt(e.key) / 10;
                        const targetIndex = Math.floor((this.filteredAlbums.length - 1) * percent);
                        this.navigateTo(targetIndex);
                    }
            }
        });

        // Mouse wheel
        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const direction = e.deltaY > 0 ? 1 : -1;
            this.navigate(direction);
        }, { passive: false });

        // Mouse click on covers
        this.container.addEventListener('click', (e) => {
            const mouse = new THREE.Vector2();
            const rect = this.container.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.camera);

            const intersects = raycaster.intersectObjects(this.covers);
            if (intersects.length > 0) {
                const clickedCover = intersects[0].object;
                if (clickedCover.userData.isCover) {
                    this.navigateTo(clickedCover.userData.index);
                }
            }
        });

        // Touch support for mobile
        let touchStartX = 0;
        this.container.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        });

        this.container.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const diff = touchStartX - touchEndX;

            if (Math.abs(diff) > 50) {
                this.navigate(diff > 0 ? 1 : -1);
            }
        });

        // Search functionality
        const searchInput = document.getElementById('search-input');
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filterAlbums(e.target.value);
            }, 300);
        });

        document.getElementById('clear-search').addEventListener('click', () => {
            searchInput.value = '';
            this.filterAlbums('');
        });

        // Thumbnail navigation buttons
        document.getElementById('thumb-prev').addEventListener('click', () => this.navigate(-1));
        document.getElementById('thumb-next').addEventListener('click', () => this.navigate(1));

        // Top bar buttons
        document.getElementById('settings-btn').addEventListener('click', () => this.openModal('settings-modal'));
        document.getElementById('shortcuts-btn').addEventListener('click', () => this.openModal('shortcuts-modal'));
        document.getElementById('fullscreen-btn').addEventListener('click', () => this.toggleFullscreen());

        // Modal close buttons
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', () => this.closeAllModals());
        });

        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeAllModals();
                }
            });
        });

        // Settings controls
        this.setupSettingsControls();
    }

    setupSettingsControls() {
        const speedSlider = document.getElementById('animation-speed');
        const spacingSlider = document.getElementById('cover-spacing');
        const angleSlider = document.getElementById('side-angle');
        const reflectionToggle = document.getElementById('reflection-toggle');
        const autoRotateToggle = document.getElementById('auto-rotate');

        speedSlider.value = this.settings.animationSpeed * 100;
        spacingSlider.value = this.settings.coverSpacing * 10;
        angleSlider.value = (this.settings.sideAngle * 180 / Math.PI);
        reflectionToggle.checked = this.settings.showReflections;
        autoRotateToggle.checked = this.settings.autoRotate;

        speedSlider.addEventListener('input', (e) => {
            this.settings.animationSpeed = e.target.value / 100;
            document.getElementById('speed-value').textContent = e.target.value;
            this.saveSettings();
        });

        spacingSlider.addEventListener('input', (e) => {
            this.settings.coverSpacing = e.target.value / 10;
            document.getElementById('spacing-value').textContent = (e.target.value / 10).toFixed(1);
            this.saveSettings();
        });

        angleSlider.addEventListener('input', (e) => {
            this.settings.sideAngle = (e.target.value * Math.PI / 180);
            document.getElementById('angle-value').textContent = e.target.value + '°';
            this.saveSettings();
        });

        reflectionToggle.addEventListener('change', (e) => {
            this.settings.showReflections = e.target.checked;
            this.saveSettings();
        });

        autoRotateToggle.addEventListener('change', (e) => {
            if (e.target.checked !== this.settings.autoRotate) {
                this.toggleAutoRotate();
            }
        });

        document.getElementById('reset-settings').addEventListener('click', () => {
            this.settings = {
                animationSpeed: 0.1,
                coverSpacing: 2.5,
                sideAngle: Math.PI / 3,
                showReflections: true,
                autoRotate: false
            };
            this.saveSettings();
            this.setupSettingsControls();
            if (this.autoRotateInterval) {
                clearInterval(this.autoRotateInterval);
                this.autoRotateInterval = null;
            }
        });

        // JSON file loading
        document.getElementById('load-json-btn').addEventListener('click', () => {
            document.getElementById('json-file-input').click();
        });

        document.getElementById('json-file-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const jsonData = JSON.parse(event.target.result);
                        this.loadFromJSON(jsonData);
                        alert('Albums loaded successfully!');
                        this.closeAllModals();
                    } catch (error) {
                        alert('Invalid JSON file format');
                    }
                };
                reader.readAsText(file);
            }
        });
    }

    openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    hideLoadingScreen() {
        setTimeout(() => {
            document.getElementById('loading-screen').classList.add('hidden');
        }, 500);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Update cover positions with smooth interpolation
        this.updateCoverPositions(false);

        // Add subtle floating animation to center cover
        const centerCover = this.covers[this.currentIndex];
        if (centerCover) {
            const baseY = centerCover.parent.position.y;
            centerCover.parent.position.y = baseY + Math.sin(Date.now() * 0.001) * 0.03;
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize CoverFlow when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    new CoverFlow();
});
