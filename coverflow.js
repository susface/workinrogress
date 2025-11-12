// CoverFlow Implementation using Three.js
class CoverFlow {
    constructor() {
        this.container = document.getElementById('coverflow-container');
        this.currentIndex = 0;
        this.targetIndex = 0;
        this.covers = [];
        this.albums = this.createAlbumData();
        this.isAnimating = false;

        this.init();
        this.createCovers();
        this.addEventListeners();
        this.animate();
        this.updateInfo();
    }

    init() {
        // Scene setup
        this.scene = new THREE.Scene();

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            50,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 8);
        this.camera.lookAt(0, 0, 0);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setClearColor(0x000000, 0);
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    createAlbumData() {
        // Sample album data with colored placeholders
        const colors = [
            0xFF6B6B, 0x4ECDC4, 0x45B7D1, 0xFFA07A,
            0x98D8C8, 0xF7DC6F, 0xBB8FCE, 0x85C1E2,
            0xF8B195, 0xC06C84, 0x6C5B7B, 0x355C7D
        ];

        return colors.map((color, i) => ({
            title: `Album ${i + 1}`,
            artist: `Artist ${i + 1}`,
            color: color
        }));
    }

    createCovers() {
        const coverWidth = 2;
        const coverHeight = 2;

        this.albums.forEach((album, index) => {
            // Create cover geometry
            const geometry = new THREE.PlaneGeometry(coverWidth, coverHeight);

            // Create colored material for placeholder
            const material = new THREE.MeshPhongMaterial({
                color: album.color,
                side: THREE.DoubleSide,
                shininess: 100
            });

            const cover = new THREE.Mesh(geometry, material);
            cover.userData = { index, album };

            // Add a border/frame
            const borderGeometry = new THREE.EdgesGeometry(geometry);
            const borderMaterial = new THREE.LineBasicMaterial({
                color: 0xffffff,
                linewidth: 2
            });
            const border = new THREE.LineSegments(borderGeometry, borderMaterial);
            cover.add(border);

            this.scene.add(cover);
            this.covers.push(cover);
        });

        this.updateCoverPositions(0);
    }

    updateCoverPositions(immediate = false) {
        const spacing = 2.5;
        const sideAngle = Math.PI / 3; // 60 degrees
        const sideOffset = 1.5;
        const depthOffset = 1.5;

        this.covers.forEach((cover, index) => {
            const diff = index - this.targetIndex;

            let targetX, targetZ, targetRotY, targetScale;

            if (diff === 0) {
                // Center cover - flat and prominent
                targetX = 0;
                targetZ = 0;
                targetRotY = 0;
                targetScale = 1.2;
            } else if (diff < 0) {
                // Left side covers
                targetX = diff * spacing - sideOffset;
                targetZ = -depthOffset - Math.abs(diff) * 0.3;
                targetRotY = sideAngle;
                targetScale = 0.8;
            } else {
                // Right side covers
                targetX = diff * spacing + sideOffset;
                targetZ = -depthOffset - Math.abs(diff) * 0.3;
                targetRotY = -sideAngle;
                targetScale = 0.8;
            }

            // Smooth animation
            if (immediate) {
                cover.position.x = targetX;
                cover.position.z = targetZ;
                cover.rotation.y = targetRotY;
                cover.scale.set(targetScale, targetScale, 1);
            } else {
                // Lerp for smooth animation
                cover.position.x += (targetX - cover.position.x) * 0.1;
                cover.position.z += (targetZ - cover.position.z) * 0.1;
                cover.rotation.y += (targetRotY - cover.rotation.y) * 0.1;

                const currentScale = cover.scale.x;
                const newScale = currentScale + (targetScale - currentScale) * 0.1;
                cover.scale.set(newScale, newScale, 1);
            }

            // Update opacity based on distance from center
            const opacity = 1 - Math.min(Math.abs(diff) * 0.15, 0.5);
            cover.material.opacity = opacity;
            cover.material.transparent = true;
        });
    }

    navigate(direction) {
        if (this.isAnimating) return;

        this.targetIndex += direction;
        this.targetIndex = Math.max(0, Math.min(this.albums.length - 1, this.targetIndex));

        if (this.targetIndex !== this.currentIndex) {
            this.isAnimating = true;
            this.currentIndex = this.targetIndex;
            this.updateInfo();

            setTimeout(() => {
                this.isAnimating = false;
            }, 300);
        }
    }

    navigateTo(index) {
        if (this.isAnimating || index === this.currentIndex) return;

        this.targetIndex = Math.max(0, Math.min(this.albums.length - 1, index));
        this.isAnimating = true;
        this.currentIndex = this.targetIndex;
        this.updateInfo();

        setTimeout(() => {
            this.isAnimating = false;
        }, 300);
    }

    updateInfo() {
        const album = this.albums[this.currentIndex];
        document.getElementById('album-title').textContent = album.title;
        document.getElementById('album-artist').textContent = album.artist;
    }

    addEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.navigate(-1);
            } else if (e.key === 'ArrowRight') {
                this.navigate(1);
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
                this.navigateTo(clickedCover.userData.index);
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
    }

    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Update cover positions with smooth interpolation
        this.updateCoverPositions(false);

        // Add subtle floating animation to center cover
        const centerCover = this.covers[this.currentIndex];
        if (centerCover) {
            centerCover.position.y = Math.sin(Date.now() * 0.001) * 0.05;
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize CoverFlow when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    new CoverFlow();
});
