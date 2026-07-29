class AvatarRenderer {
    constructor(canvas, gender = 'male') {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gender = gender === 'male' ? 'male' : 'female';
        this.isTalking = false;
        this.talkPhase = 0;
        this.blinkTimer = 0;
        this.blinkDuration = 0;
        this.headTilt = 0;
        this.headTiltTarget = 0;
        this.breath = 0;
        this.eyeLookX = 0;
        this.eyeLookY = 0;
        this.eyeLookTimer = 0;
        this.running = false;
        this.animFrame = null;
        this.skinColors = { light: '#e8b88a', mid: '#d4a574', shadow: '#b8845a' };
        this.hairColor = this.gender === 'male' ? '#2c1810' : '#1a1a2e';
        this.shirtColor = this.gender === 'male' ? '#2a4a7f' : '#c44a6a';
    }

    start() {
        this.running = true;
        this.resize();
        this.loop();
    }

    stop() {
        this.running = false;
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    resize() {
        const rect = this.canvas.parentElement?.getBoundingClientRect() || { width: 320, height: 240 };
        this.canvas.width = rect.width || 320;
        this.canvas.height = rect.height || 240;
        this.w = this.canvas.width;
        this.h = this.canvas.height;
    }

    setTalking(talking) {
        this.isTalking = talking;
        if (!talking) this.talkPhase = 0;
    }

    loop() {
        if (!this.running) return;
        this.update();
        this.draw();
        this.animFrame = requestAnimationFrame(() => this.loop());
    }

    update() {
        this.breath = Math.sin(Date.now() / 600) * 2;

        if (this.isTalking) {
            this.talkPhase += 0.15 + Math.random() * 0.1;
            this.headTiltTarget = Math.sin(Date.now() / 400) * 3;
        } else {
            this.talkPhase *= 0.9;
            this.headTiltTarget = 0;
        }

        if (this.blinkDuration > 0) {
            this.blinkDuration -= 0.04;
        } else {
            this.blinkTimer += 0.016;
            if (this.blinkTimer > 2.5 + Math.random() * 3) {
                this.blinkDuration = 0.2;
                this.blinkTimer = 0;
            }
        }

        this.headTilt += (this.headTiltTarget - this.headTilt) * 0.05;

        this.eyeLookTimer += 0.016;
        if (this.eyeLookTimer > 1.5 + Math.random() * 2) {
            this.eyeLookX = (Math.random() - 0.5) * 6;
            this.eyeLookY = (Math.random() - 0.5) * 4;
            this.eyeLookTimer = 0;
        }
    }

    draw() {
        const ctx = this.ctx;
        const w = this.w, h = this.h;
        ctx.clearRect(0, 0, w, h);

        // Background gradient
        const grad = ctx.createRadialGradient(w / 2, h * 0.3, 0, w / 2, h * 0.3, w * 0.8);
        grad.addColorStop(0, '#1a1a2e');
        grad.addColorStop(1, '#0f0f1a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.translate(w / 2, h * 0.5);
        ctx.rotate(this.headTilt * Math.PI / 180);
        ctx.translate(0, this.breath);

        const scale = Math.min(w, h) / 280;
        ctx.scale(scale, scale);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(0, 80, 70, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        // Neck
        ctx.fillStyle = this.skinColors.shadow;
        ctx.beginPath();
        ctx.moveTo(-18, 50);
        ctx.lineTo(-22, 85);
        ctx.lineTo(22, 85);
        ctx.lineTo(18, 50);
        ctx.fill();

        // Shoulders + clothes
        ctx.fillStyle = this.shirtColor;
        ctx.beginPath();
        ctx.moveTo(-60, 75);
        ctx.lineTo(-70, 120);
        ctx.lineTo(70, 120);
        ctx.lineTo(60, 75);
        ctx.fill();

        if (this.gender === 'male') {
            ctx.strokeStyle = '#1d3a6a';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-30, 78);
            ctx.lineTo(-30, 105);
            ctx.moveTo(30, 78);
            ctx.lineTo(30, 105);
            ctx.stroke();
        } else {
            // Collar detail
            ctx.fillStyle = '#b83858';
            ctx.beginPath();
            ctx.moveTo(-20, 78);
            ctx.lineTo(0, 88);
            ctx.lineTo(20, 78);
            ctx.lineTo(0, 95);
            ctx.fill();
        }

        // Head
        ctx.fillStyle = this.skinColors.light;
        ctx.beginPath();
        ctx.ellipse(0, -5, 52, 62, 0, 0, Math.PI * 2);
        ctx.fill();

        // Hair
        ctx.fillStyle = this.hairColor;
        if (this.gender === 'male') {
            ctx.beginPath();
            ctx.ellipse(0, -58, 54, 30, 0, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.rect(-54, -60, 108, 18);
            ctx.fill();
            // Side hair
            ctx.beginPath();
            ctx.ellipse(-50, -20, 8, 40, -0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(50, -20, 8, 40, 0.1, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.ellipse(0, -58, 58, 38, 0, Math.PI, Math.PI * 2);
            ctx.fill();
            // Long hair sides
            ctx.beginPath();
            ctx.ellipse(-55, -10, 12, 55, -0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(55, -10, 12, 55, 0.2, 0, Math.PI * 2);
            ctx.fill();
            // Hair strand
            for (let i = -40; i <= 40; i += 15) {
                ctx.beginPath();
                ctx.moveTo(i, -65);
                const len = 20 + Math.random() * 15;
                ctx.quadraticCurveTo(i + 5, -65 + len, i + 8, -65 + len + 8);
                ctx.lineWidth = 2;
                ctx.strokeStyle = this.hairColor;
                ctx.stroke();
            }
        }

        // Eyebrows
        ctx.strokeStyle = this.hairColor;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        const browY = -30;
        ctx.beginPath();
        ctx.moveTo(-30, browY);
        ctx.quadraticCurveTo(-15, browY - 4, -5, browY);
        ctx.moveTo(30, browY);
        ctx.quadraticCurveTo(15, browY - 4, 5, browY);
        ctx.stroke();

        // Eyes
        const eyeY = -16;
        const eyeSpacing = 20;
        for (let side = -1; side <= 1; side += 2) {
            const ex = side * eyeSpacing;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.ellipse(ex, eyeY, 12, 8, 0, 0, Math.PI * 2);
            ctx.fill();

            const blink = this.blinkDuration > 0 ? Math.min(1, this.blinkDuration * 5) : 0;
            if (blink > 0.5) {
                // Closed eye
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(ex - 11, eyeY);
                ctx.lineTo(ex + 11, eyeY);
                ctx.stroke();
            } else {
                // Iris
                const irisR = 6 - blink * 6;
                if (irisR > 0.5) {
                    ctx.fillStyle = this.gender === 'male' ? '#3d2b1f' : '#4a6741';
                    ctx.beginPath();
                    ctx.arc(ex + this.eyeLookX * 0.3, eyeY + this.eyeLookY * 0.3, irisR, 0, Math.PI * 2);
                    ctx.fill();

                    // Pupil
                    ctx.fillStyle = '#111';
                    ctx.beginPath();
                    ctx.arc(ex + this.eyeLookX * 0.4, eyeY + this.eyeLookY * 0.4, irisR * 0.5, 0, Math.PI * 2);
                    ctx.fill();

                    // Highlight
                    ctx.fillStyle = '#fff';
                    ctx.beginPath();
                    ctx.arc(ex + this.eyeLookX * 0.3 + 3, eyeY + this.eyeLookY * 0.3 - 3, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // Nose
        ctx.fillStyle = this.skinColors.mid;
        ctx.beginPath();
        ctx.ellipse(0, -2, 4, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this.skinColors.shadow;
        ctx.beginPath();
        ctx.ellipse(0, 3, 2, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Smile lines
        ctx.strokeStyle = this.skinColors.shadow;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-15, 10);
        ctx.quadraticCurveTo(-10, 4, 0, 4);
        ctx.moveTo(15, 10);
        ctx.quadraticCurveTo(10, 4, 0, 4);
        ctx.stroke();

        // Mouth
        const mouthOpen = Math.abs(Math.sin(this.talkPhase)) * (this.isTalking ? 7 : 0);
        ctx.fillStyle = '#8b3a4a';
        ctx.beginPath();
        ctx.ellipse(0, 18, 12, 4 + mouthOpen, 0, 0, Math.PI * 2);
        ctx.fill();

        if (mouthOpen > 2) {
            ctx.fillStyle = '#2a0a0a';
            ctx.beginPath();
            ctx.rect(-8, 18, 16, mouthOpen * 0.6);
            ctx.fill();

            // Teeth
            ctx.fillStyle = '#eee';
            ctx.fillRect(-8, 18, 3, 4);
            ctx.fillRect(-3, 18, 3, 4);
            ctx.fillRect(2, 18, 3, 4);
        }

        // Lips
        ctx.strokeStyle = '#b84a5a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 14, 10, 0.2, Math.PI - 0.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 22, 10, Math.PI + 0.2, -0.2);
        ctx.stroke();

        // Cheek blush (female)
        if (this.gender === 'female') {
            ctx.fillStyle = 'rgba(255, 100, 120, 0.15)';
            ctx.beginPath();
            ctx.ellipse(-30, 8, 10, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(30, 8, 10, 6, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // Name tag
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        const nx = w / 2 - 60, ny = h - 32, nw = 120, nh = 24, nr = 12;
        ctx.beginPath();
        ctx.moveTo(nx + nr, ny);
        ctx.lineTo(nx + nw - nr, ny);
        ctx.quadraticCurveTo(nx + nw, ny, nx + nw, ny + nr);
        ctx.lineTo(nx + nw, ny + nh - nr);
        ctx.quadraticCurveTo(nx + nw, ny + nh, nx + nw - nr, ny + nh);
        ctx.lineTo(nx + nr, ny + nh);
        ctx.quadraticCurveTo(nx, ny + nh, nx, ny + nh - nr);
        ctx.lineTo(nx, ny + nr);
        ctx.quadraticCurveTo(nx, ny, nx + nr, ny);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🤖 ' + (this.gender === 'male' ? 'Adam' : 'Eve'), w / 2, h - 20);
    }
}