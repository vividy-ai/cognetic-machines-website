// Teleoperation Pick & Place Game
class TeleopGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        // Robot arm - mounted in center, can reach both sides
        this.robot = {
            baseX: this.width / 2,
            baseY: 120,
            arm1Length: 130,
            arm2Length: 120,
            angle1: Math.PI * 0.6,  // shoulder angle
            angle2: -Math.PI * 0.4  // elbow angle (relative)
        };

        // Gripper state
        this.gripperOpen = true;
        this.holdingPackage = false;

        // Package on conveyor (left side)
        this.package = {
            x: 120,
            y: this.height - 100,
            width: 50,
            height: 40,
            grabbed: false
        };

        // Drop zone (right side)
        this.dropZone = {
            x: this.width - 180,
            y: this.height - 90,
            width: 80,
            height: 50
        };

        // Mouse position
        this.mouseX = this.width / 2;
        this.mouseY = this.height / 2;

        // Game state
        this.score = 0;
        this.packagesDelivered = 0;
        this.message = "Move to the package and click to grab";

        // Bind events
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('click', () => this.onClick());

        // Start animation
        this.animate();
    }

    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        this.mouseY = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        this.solveIK();
    }

    solveIK() {
        const robot = this.robot;
        const targetX = this.mouseX;
        const targetY = this.mouseY;

        // Vector from base to target
        const dx = targetX - robot.baseX;
        const dy = targetY - robot.baseY;
        let dist = Math.sqrt(dx * dx + dy * dy);

        // Clamp to reachable distance
        const maxReach = robot.arm1Length + robot.arm2Length - 10;
        const minReach = Math.abs(robot.arm1Length - robot.arm2Length) + 20;
        dist = Math.max(minReach, Math.min(maxReach, dist));

        // Law of cosines for elbow angle
        const cosAngle2 = (dist * dist - robot.arm1Length * robot.arm1Length - robot.arm2Length * robot.arm2Length)
                         / (2 * robot.arm1Length * robot.arm2Length);
        robot.angle2 = -Math.acos(Math.max(-1, Math.min(1, cosAngle2)));

        // Shoulder angle
        const angleToTarget = Math.atan2(dy, dx);
        const k1 = robot.arm1Length + robot.arm2Length * Math.cos(robot.angle2);
        const k2 = robot.arm2Length * Math.sin(robot.angle2);
        robot.angle1 = angleToTarget - Math.atan2(k2, k1);
    }

    getGripperPos() {
        const robot = this.robot;
        const elbow = {
            x: robot.baseX + Math.cos(robot.angle1) * robot.arm1Length,
            y: robot.baseY + Math.sin(robot.angle1) * robot.arm1Length
        };
        const wrist = {
            x: elbow.x + Math.cos(robot.angle1 + robot.angle2) * robot.arm2Length,
            y: elbow.y + Math.sin(robot.angle1 + robot.angle2) * robot.arm2Length
        };
        return { elbow, wrist };
    }

    onClick() {
        const { wrist } = this.getGripperPos();
        const pkg = this.package;
        const drop = this.dropZone;

        if (!this.holdingPackage) {
            // Try to grab package
            const overPackage = wrist.x > pkg.x - 15 && wrist.x < pkg.x + pkg.width + 15 &&
                               wrist.y > pkg.y - 20 && wrist.y < pkg.y + pkg.height + 15;
            if (overPackage) {
                this.holdingPackage = true;
                this.gripperOpen = false;
                this.message = "Now move to the drop zone and click!";
            }
        } else {
            // Try to drop
            const overDrop = wrist.x > drop.x - 15 && wrist.x < drop.x + drop.width + 15 &&
                            wrist.y > drop.y - 20 && wrist.y < drop.y + drop.height + 15;

            this.holdingPackage = false;
            this.gripperOpen = true;

            if (overDrop) {
                this.packagesDelivered++;
                this.score += 100;
                this.message = "Nice! +100 points";
            } else {
                this.message = "Missed! Try again";
            }

            // Reset package position
            setTimeout(() => {
                this.package.x = 100 + Math.random() * 60;
                this.message = "Move to the package and click to grab";
            }, 1000);
        }
    }

    draw() {
        const ctx = this.ctx;

        // Background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, this.width, this.height);

        // Grid lines for depth
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = 1;
        for (let y = 50; y < this.height; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }

        // Floor
        ctx.fillStyle = '#252525';
        ctx.fillRect(0, this.height - 50, this.width, 50);

        // Conveyor belt (left side)
        this.drawConveyor();

        // Drop zone
        this.drawDropZone();

        // Package (either on conveyor or held)
        const { wrist } = this.getGripperPos();
        if (this.holdingPackage) {
            this.drawPackage(wrist.x - this.package.width / 2, wrist.y + 10);
        } else {
            this.drawPackage(this.package.x, this.package.y);

            // Highlight if gripper is near
            const near = Math.abs(wrist.x - (this.package.x + this.package.width/2)) < 40 &&
                        Math.abs(wrist.y - this.package.y) < 50;
            if (near) {
                ctx.strokeStyle = '#f97316';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(this.package.x - 5, this.package.y - 5,
                              this.package.width + 10, this.package.height + 10);
                ctx.setLineDash([]);
            }
        }

        // Robot arm
        this.drawRobot();

        // UI
        this.drawUI();
    }

    drawConveyor() {
        const ctx = this.ctx;
        const y = this.height - 50;

        // Conveyor frame
        ctx.fillStyle = '#444';
        ctx.fillRect(60, y - 55, 150, 10);

        // Legs
        ctx.fillStyle = '#333';
        ctx.fillRect(70, y - 45, 8, 45);
        ctx.fillRect(192, y - 45, 8, 45);

        // Rollers
        ctx.fillStyle = '#555';
        for (let x = 85; x < 200; x += 25) {
            ctx.beginPath();
            ctx.arc(x, y - 50, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Label
        ctx.fillStyle = '#666';
        ctx.font = '10px sans-serif';
        ctx.fillText('CONVEYOR', 100, y - 62);
    }

    drawDropZone() {
        const ctx = this.ctx;
        const dz = this.dropZone;

        // Bin
        ctx.fillStyle = '#333';
        ctx.fillRect(dz.x, dz.y, dz.width, dz.height);

        // Inner
        ctx.fillStyle = '#222';
        ctx.fillRect(dz.x + 5, dz.y + 5, dz.width - 10, dz.height - 10);

        // Dashed outline
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(dz.x, dz.y, dz.width, dz.height);
        ctx.setLineDash([]);

        // Label
        ctx.fillStyle = '#888';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('DROP', dz.x + dz.width / 2, dz.y + dz.height / 2 + 4);
        ctx.textAlign = 'left';
    }

    drawPackage(x, y) {
        const ctx = this.ctx;
        const w = this.package.width;
        const h = this.package.height;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x + 3, y + 3, w, h);

        // Box body
        ctx.fillStyle = '#c9956a';
        ctx.fillRect(x, y, w, h);

        // Highlight top
        ctx.fillStyle = '#d4a574';
        ctx.fillRect(x, y, w, 8);

        // Tape cross
        ctx.fillStyle = '#b8854a';
        ctx.fillRect(x + w/2 - 4, y, 8, h);
        ctx.fillRect(x, y + h/2 - 3, w, 6);

        // Border
        ctx.strokeStyle = '#a07040';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
    }

    drawRobot() {
        const ctx = this.ctx;
        const robot = this.robot;
        const { elbow, wrist } = this.getGripperPos();

        // Ceiling rail
        ctx.fillStyle = '#444';
        ctx.fillRect(50, 0, this.width - 100, 15);

        // Rail details
        ctx.fillStyle = '#555';
        ctx.fillRect(50, 12, this.width - 100, 3);

        // Vertical mount from ceiling
        ctx.fillStyle = '#444';
        ctx.fillRect(robot.baseX - 12, 0, 24, robot.baseY - 20);

        // Mount connector
        ctx.fillStyle = '#555';
        ctx.fillRect(robot.baseX - 18, robot.baseY - 25, 36, 10);

        // Shoulder mount
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(robot.baseX, robot.baseY, 25, 0, Math.PI * 2);
        ctx.fill();

        // Upper arm
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 20;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(robot.baseX, robot.baseY);
        ctx.lineTo(elbow.x, elbow.y);
        ctx.stroke();

        // Arm highlight
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.moveTo(robot.baseX, robot.baseY);
        ctx.lineTo(elbow.x, elbow.y);
        ctx.stroke();

        // Elbow joint
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(elbow.x, elbow.y, 15, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(elbow.x, elbow.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Forearm
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 16;
        ctx.beginPath();
        ctx.moveTo(elbow.x, elbow.y);
        ctx.lineTo(wrist.x, wrist.y);
        ctx.stroke();

        ctx.strokeStyle = '#555';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(elbow.x, elbow.y);
        ctx.lineTo(wrist.x, wrist.y);
        ctx.stroke();

        // Wrist
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(wrist.x, wrist.y, 10, 0, Math.PI * 2);
        ctx.fill();

        // Gripper
        ctx.fillStyle = '#444';
        ctx.fillRect(wrist.x - 6, wrist.y, 12, 15);

        // Gripper fingers
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        if (this.gripperOpen) {
            ctx.beginPath();
            ctx.moveTo(wrist.x - 4, wrist.y + 15);
            ctx.lineTo(wrist.x - 12, wrist.y + 30);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(wrist.x + 4, wrist.y + 15);
            ctx.lineTo(wrist.x + 12, wrist.y + 30);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.moveTo(wrist.x - 4, wrist.y + 15);
            ctx.lineTo(wrist.x - 4, wrist.y + 30);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(wrist.x + 4, wrist.y + 15);
            ctx.lineTo(wrist.x + 4, wrist.y + 30);
            ctx.stroke();
        }

        // Shoulder joint accent
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(robot.baseX, robot.baseY, 8, 0, Math.PI * 2);
        ctx.fill();
    }

    drawUI() {
        const ctx = this.ctx;

        // Message
        ctx.fillStyle = '#888';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.message, this.width / 2, 25);

        // Score
        if (this.packagesDelivered > 0) {
            ctx.fillStyle = '#f97316';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`Delivered: ${this.packagesDelivered}  Score: ${this.score}`, this.width - 20, 25);
        }

        ctx.textAlign = 'left';
    }

    animate() {
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new TeleopGame('teleop-canvas');
});
