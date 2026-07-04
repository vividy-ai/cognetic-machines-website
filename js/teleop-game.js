// 3D Teleoperation Pick & Place Game using Three.js
class TeleopGame3D {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        // Replace canvas with a container div
        this.container = document.createElement('div');
        this.container.style.width = '700px';
        this.container.style.height = '400px';
        this.container.style.position = 'relative';
        this.container.style.borderRadius = '12px';
        this.container.style.overflow = 'hidden';
        this.canvas.parentNode.replaceChild(this.container, this.canvas);

        // Game state
        this.holdingPackage = false;
        this.score = 0;
        this.packagesDelivered = 0;
        this.message = "Move mouse to control arm. Click to grab/drop.";

        // Target position for IK
        this.targetX = 0;
        this.targetZ = -2;

        // Initialize Three.js
        this.initThree();
        this.createScene();
        this.createRobot();
        this.createUI();
        this.bindEvents();
        this.animate();
    }

    initThree() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);

        // Camera - zoomed in
        this.camera = new THREE.PerspectiveCamera(45, 700 / 400, 0.1, 1000);
        this.camera.position.set(0, 3.5, 5);
        this.camera.lookAt(0, 1.2, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(700, 400);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        mainLight.position.set(5, 10, 5);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 1024;
        mainLight.shadow.mapSize.height = 1024;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 50;
        mainLight.shadow.camera.left = -10;
        mainLight.shadow.camera.right = 10;
        mainLight.shadow.camera.top = 10;
        mainLight.shadow.camera.bottom = -10;
        this.scene.add(mainLight);

        const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
        fillLight.position.set(-5, 5, -5);
        this.scene.add(fillLight);
    }

    createScene() {
        // Floor
        const floorGeom = new THREE.PlaneGeometry(20, 20);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x252525,
            roughness: 0.8
        });
        this.floor = new THREE.Mesh(floorGeom, floorMat);
        this.floor.rotation.x = -Math.PI / 2;
        this.floor.receiveShadow = true;
        this.scene.add(this.floor);

        // Grid
        const gridHelper = new THREE.GridHelper(20, 20, 0x333333, 0x2a2a2a);
        this.scene.add(gridHelper);

        // One long table for everything
        this.createWorkbench();

        // Drop zone indicator
        const dropZoneGeom = new THREE.BoxGeometry(0.9, 0.05, 0.9);
        const dropZoneMat = new THREE.MeshStandardMaterial({
            color: 0xf97316,
            transparent: true,
            opacity: 0.3
        });
        this.dropZone = new THREE.Mesh(dropZoneGeom, dropZoneMat);
        this.dropZone.position.set(-1.3, 1.08, 0);
        this.scene.add(this.dropZone);

        // Drop zone border
        const dropBorderGeom = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.9, 0.1, 0.9));
        const dropBorderMat = new THREE.LineBasicMaterial({ color: 0xf97316 });
        const dropBorder = new THREE.LineSegments(dropBorderGeom, dropBorderMat);
        dropBorder.position.copy(this.dropZone.position);
        this.scene.add(dropBorder);
        this.dropBorder = dropBorder;

        // Package
        this.createPackage();
    }

    createWorkbench() {
        const tableGroup = new THREE.Group();

        // Long table top
        const topGeom = new THREE.BoxGeometry(5, 0.12, 1.8);
        const topMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.6 });
        const top = new THREE.Mesh(topGeom, topMat);
        top.position.y = 1;
        top.castShadow = true;
        top.receiveShadow = true;
        tableGroup.add(top);

        // Table edge trim
        const trimGeom = new THREE.BoxGeometry(5.05, 0.04, 1.85);
        const trimMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
        const trim = new THREE.Mesh(trimGeom, trimMat);
        trim.position.y = 1.06;
        tableGroup.add(trim);

        // Legs
        const legGeom = new THREE.BoxGeometry(0.12, 1, 0.12);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
        const legPositions = [
            [-2.3, 0.5, -0.75],
            [2.3, 0.5, -0.75],
            [-2.3, 0.5, 0.75],
            [2.3, 0.5, 0.75],
            [0, 0.5, -0.75],
            [0, 0.5, 0.75]
        ];
        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeom, legMat);
            leg.position.set(...pos);
            leg.castShadow = true;
            tableGroup.add(leg);
        });

        this.scene.add(tableGroup);
    }

    createPackage() {
        const boxGeom = new THREE.BoxGeometry(0.5, 0.4, 0.5);
        const boxMat = new THREE.MeshStandardMaterial({
            color: 0xc9956a,
            roughness: 0.6
        });
        this.package = new THREE.Mesh(boxGeom, boxMat);
        this.package.position.set(1.3, 1.28, 0);
        this.package.castShadow = true;
        this.scene.add(this.package);

        // Tape stripes
        const tapeGeom = new THREE.BoxGeometry(0.52, 0.06, 0.52);
        const tapeMat = new THREE.MeshStandardMaterial({ color: 0x8b6914 });
        const tape = new THREE.Mesh(tapeGeom, tapeMat);
        tape.position.y = 0.08;
        this.package.add(tape);
    }

    createRobot() {
        this.robotGroup = new THREE.Group();

        // Materials
        const darkMetal = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.6 });
        const lightMetal = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.4, metalness: 0.6 });
        const accentMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3, metalness: 0.8 });

        // Base - sits on table
        const baseGeom = new THREE.CylinderGeometry(0.3, 0.35, 0.15, 32);
        this.base = new THREE.Mesh(baseGeom, darkMetal);
        this.base.position.y = 1.15;
        this.base.castShadow = true;
        this.robotGroup.add(this.base);

        // Turret (rotates)
        const turretGeom = new THREE.CylinderGeometry(0.22, 0.25, 0.18, 32);
        this.turret = new THREE.Mesh(turretGeom, lightMetal);
        this.turret.position.y = 0.12;
        this.turret.castShadow = true;
        this.base.add(this.turret);

        // Shoulder joint
        const shoulderGeom = new THREE.SphereGeometry(0.14, 16, 16);
        this.shoulder = new THREE.Mesh(shoulderGeom, accentMat);
        this.shoulder.position.y = 0.12;
        this.turret.add(this.shoulder);

        // Upper arm
        const upperArmGeom = new THREE.BoxGeometry(0.1, 0.8, 0.1);
        this.upperArm = new THREE.Mesh(upperArmGeom, lightMetal);
        this.upperArm.position.y = 0.4;
        this.upperArm.castShadow = true;
        this.shoulder.add(this.upperArm);

        // Elbow joint
        const elbowGeom = new THREE.SphereGeometry(0.1, 16, 16);
        this.elbow = new THREE.Mesh(elbowGeom, accentMat);
        this.elbow.position.y = 0.4;
        this.upperArm.add(this.elbow);

        // Forearm
        const forearmGeom = new THREE.BoxGeometry(0.08, 0.7, 0.08);
        this.forearm = new THREE.Mesh(forearmGeom, lightMetal);
        this.forearm.position.y = 0.35;
        this.forearm.castShadow = true;
        this.elbow.add(this.forearm);

        // Wrist
        const wristGeom = new THREE.SphereGeometry(0.07, 16, 16);
        this.wrist = new THREE.Mesh(wristGeom, accentMat);
        this.wrist.position.y = 0.35;
        this.forearm.add(this.wrist);

        // Gripper base
        const gripBaseGeom = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        this.gripperBase = new THREE.Mesh(gripBaseGeom, darkMetal);
        this.gripperBase.position.y = -0.08;
        this.wrist.add(this.gripperBase);

        // Gripper fingers
        const fingerGeom = new THREE.BoxGeometry(0.03, 0.15, 0.06);
        const fingerMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.3, metalness: 0.7 });

        this.leftFinger = new THREE.Mesh(fingerGeom, fingerMat);
        this.leftFinger.position.set(-0.04, -0.1, 0);
        this.gripperBase.add(this.leftFinger);

        this.rightFinger = new THREE.Mesh(fingerGeom, fingerMat);
        this.rightFinger.position.set(0.04, -0.1, 0);
        this.gripperBase.add(this.rightFinger);

        this.robotGroup.position.set(0, 0, 0);
        this.scene.add(this.robotGroup);
    }

    createUI() {
        // UI Overlay
        this.uiDiv = document.createElement('div');
        this.uiDiv.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            padding: 12px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            pointer-events: none;
            font-family: 'Instrument Sans', sans-serif;
        `;

        this.messageSpan = document.createElement('span');
        this.messageSpan.style.cssText = 'color: #888; font-size: 14px;';
        this.messageSpan.textContent = this.message;

        this.scoreSpan = document.createElement('span');
        this.scoreSpan.style.cssText = 'color: #f97316; font-size: 14px; font-weight: bold;';

        this.uiDiv.appendChild(this.messageSpan);
        this.uiDiv.appendChild(this.scoreSpan);
        this.container.appendChild(this.uiDiv);
    }

    bindEvents() {
        this.container.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.container.addEventListener('click', () => this.onClick());
    }

    onMouseMove(e) {
        const rect = this.container.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;

        // Map mouse to target position on the table (x is direct, not inverted)
        this.targetX = -x * 2.5;  // Flip X so left mouse = left arm
        this.targetZ = y * 0.8;   // Flip Z for correct depth

        this.updateRobot();
    }

    updateRobot() {
        // Calculate angle to target (turret rotation)
        const angle = Math.atan2(this.targetX, -this.targetZ);
        this.turret.rotation.y = angle;

        // Distance to target (for arm reach)
        const dist = Math.sqrt(this.targetX * this.targetX + this.targetZ * this.targetZ);
        const clampedDist = Math.max(0.3, Math.min(2.2, dist));

        // Simple IK for 2-joint arm - longer reach
        const L1 = 0.8; // upper arm
        const L2 = 0.7; // forearm
        const targetY = 1.25; // height to reach (table surface + package)
        const baseY = 1.5; // shoulder height (on table)

        const dy = targetY - baseY;
        const dxz = clampedDist;
        const d = Math.sqrt(dy * dy + dxz * dxz);

        // Clamp to reachable
        const reachMax = L1 + L2 - 0.05;
        const reachMin = Math.abs(L1 - L2) + 0.05;
        const reach = Math.max(reachMin, Math.min(reachMax, d));

        // Law of cosines
        const cosAngle2 = (reach * reach - L1 * L1 - L2 * L2) / (2 * L1 * L2);
        const angle2 = Math.acos(Math.max(-1, Math.min(1, cosAngle2)));

        const angleToTarget = Math.atan2(dy, dxz);
        const k1 = L1 + L2 * Math.cos(angle2);
        const k2 = L2 * Math.sin(angle2);
        const angle1 = angleToTarget + Math.atan2(k2, k1);

        // Apply to arm (rotations in local space)
        this.shoulder.rotation.x = -(Math.PI / 2 - angle1);
        this.elbow.rotation.x = -(Math.PI - angle2);

        // Keep gripper pointing down
        this.wrist.rotation.x = -this.shoulder.rotation.x - this.elbow.rotation.x;

        // Update package position if holding
        if (this.holdingPackage) {
            const worldPos = new THREE.Vector3();
            this.gripperBase.getWorldPosition(worldPos);
            this.package.position.set(worldPos.x, worldPos.y - 0.28, worldPos.z);
        }
    }

    onClick() {
        const gripperPos = new THREE.Vector3();
        this.gripperBase.getWorldPosition(gripperPos);

        if (!this.holdingPackage) {
            // Try to grab
            const distToPackage = gripperPos.distanceTo(this.package.position);
            if (distToPackage < 0.6) {
                this.holdingPackage = true;
                this.closeGripper();
                this.message = "Now move to the DROP zone and click!";
            }
        } else {
            // Try to drop
            const dropPos = new THREE.Vector3(-1.3, 1.28, 0);
            const distToDrop = new THREE.Vector2(gripperPos.x - dropPos.x, gripperPos.z - dropPos.z).length();

            this.holdingPackage = false;
            this.openGripper();

            if (distToDrop < 0.6) {
                this.packagesDelivered++;
                this.score += 100;
                this.message = "Nice! +100 points";
                this.package.position.set(-1.3, 1.28, 0);
            } else {
                this.message = "Missed! Try again";
            }

            // Reset package after delay
            setTimeout(() => {
                this.package.position.set(1.3 + (Math.random() - 0.5) * 0.2, 1.28, (Math.random() - 0.5) * 0.2);
                this.message = "Move mouse to control arm. Click to grab/drop.";
            }, 1500);
        }
    }

    closeGripper() {
        this.leftFinger.position.x = -0.02;
        this.rightFinger.position.x = 0.02;
    }

    openGripper() {
        this.leftFinger.position.x = -0.05;
        this.rightFinger.position.x = 0.05;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Subtle drop zone pulse
        const pulse = Math.sin(Date.now() * 0.003) * 0.1 + 0.3;
        this.dropZone.material.opacity = pulse;

        // Update UI
        this.messageSpan.textContent = this.message;
        if (this.packagesDelivered > 0) {
            this.scoreSpan.textContent = `Delivered: ${this.packagesDelivered}  Score: ${this.score}`;
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Load Three.js first
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.onload = () => {
        new TeleopGame3D('teleop-canvas');
    };
    document.head.appendChild(script);
});
