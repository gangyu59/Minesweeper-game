document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const context = canvas.getContext('2d');
    const startButton = document.getElementById('start-button');
    const difficultySlider = document.getElementById('difficulty-slider');
    const difficultyLabel = document.getElementById('difficulty-label');
    const messageDiv = document.getElementById('message');
    const mineCountEl = document.getElementById('mine-count');
    const timerEl = document.getElementById('timer');

    let size = 9;
    let numMines = 8;
    let grid = [];
    let revealed = [];
    let mines = new Set();
    let gameOver = false;
    let won = false;
    let timerInterval = null;
    let elapsedTime = 0;
    let gameStarted = false;

    const difficulties = ['超易', '较易', '中等', '较难', '超难'];

    // Vivid number colors for dark background
    const numberColors = [
        '',
        '#29b6f6',  // 1 - bright sky blue
        '#00e676',  // 2 - vivid green
        '#ff1744',  // 3 - vivid red
        '#d500f9',  // 4 - vivid purple
        '#ff6d00',  // 5 - vivid orange
        '#00e5ff',  // 6 - vivid cyan
        '#ff4081',  // 7 - vivid pink
        '#b0bec5',  // 8 - light gray
    ];

    difficultySlider.addEventListener('input', (event) => {
        const val = parseInt(event.target.value);
        difficultyLabel.textContent = difficulties[val - 1];
        size = val + 8;
        numMines = Math.floor(size * size * 0.1);
        mineCountEl.textContent = numMines;
    });

    startButton.addEventListener('click', () => {
        messageDiv.textContent = '';
        messageDiv.className = '';
        stopTimer();
        elapsedTime = 0;
        timerEl.textContent = '0';
        gameStarted = false;
        canvas.classList.remove('shake');
        initializeGame();
        draw();
    });

    canvas.addEventListener('click', (event) => {
        if (gameOver || won) return;

        if (!gameStarted) {
            gameStarted = true;
            startTimer();
        }

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = Math.floor((event.clientX - rect.left) * scaleX / (canvas.width / size));
        const y = Math.floor((event.clientY - rect.top) * scaleY / (canvas.height / size));

        if (x < 0 || x >= size || y < 0 || y >= size) return;

        revealCell(x, y);

        if (gameOver) {
            // Draw board first (shows all revealed mines), then animate
            drawBoardOnly();
            startExplosionAnimation(x, y);
        } else {
            draw();
            if (checkWin()) {
                won = true;
                stopTimer();
                startWinAnimation();
            }
        }
    });

    function initializeGame() {
        grid = Array.from({ length: size }, () => Array(size).fill(0));
        revealed = Array.from({ length: size }, () => Array(size).fill(false));
        mines = new Set();
        gameOver = false;
        won = false;

        while (mines.size < numMines) {
            const x = Math.floor(Math.random() * size);
            const y = Math.floor(Math.random() * size);
            if (!mines.has(`${x},${y}`)) {
                mines.add(`${x},${y}`);
                grid[y][x] = -1;
            }
        }

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (grid[y][x] === -1) continue;
                grid[y][x] = countAdjacentMines(x, y);
            }
        }

        mineCountEl.textContent = numMines;
    }

    function countAdjacentMines(x, y) {
        let count = 0;
        for (let dy of [-1, 0, 1]) {
            for (let dx of [-1, 0, 1]) {
                if (dy === 0 && dx === 0) continue;
                const nx = x + dx, ny = y + dy;
                if (nx >= 0 && nx < size && ny >= 0 && ny < size && grid[ny][nx] === -1) count++;
            }
        }
        return count;
    }

    // Draw only the game board (no overlays) - used by animations
    function drawBoardOnly() {
        const cellSize = canvas.width / size;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#080f1e';
        context.fillRect(0, 0, canvas.width, canvas.height);
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                drawCell(x, y, cellSize);
            }
        }
    }

    function draw() {
        drawBoardOnly();
    }

    function drawCell(x, y, cellSize) {
        const gap = 2;
        const px = x * cellSize + gap;
        const py = y * cellSize + gap;
        const w = cellSize - gap * 2;
        const h = cellSize - gap * 2;
        const radius = Math.max(2, w * 0.13);

        if (revealed[y][x]) {
            if (grid[y][x] === -1) {
                // Mine cell
                roundRect(context, px, py, w, h, radius);
                context.fillStyle = '#3d0808';
                context.fill();

                // Pulsing red glow
                const grd = context.createRadialGradient(px+w/2, py+h/2, 0, px+w/2, py+h/2, w*0.7);
                grd.addColorStop(0, 'rgba(255,60,0,0.45)');
                grd.addColorStop(1, 'rgba(255,0,0,0)');
                roundRect(context, px, py, w, h, radius);
                context.fillStyle = grd;
                context.fill();

                const sz = Math.floor(w * 0.60);
                context.font = `${sz}px Arial`;
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.fillText('💣', px + w/2, py + h/2);

            } else {
                // Safe revealed cell
                roundRect(context, px, py, w, h, radius);
                context.fillStyle = '#152040';
                context.fill();

                context.strokeStyle = 'rgba(79,195,247,0.15)';
                context.lineWidth = 1;
                context.stroke();

                if (grid[y][x] > 0) {
                    const numSz = Math.max(10, Math.floor(w * 0.54));
                    context.fillStyle = numberColors[grid[y][x]];
                    context.font = `bold ${numSz}px Orbitron, Arial`;
                    context.textAlign = 'center';
                    context.textBaseline = 'middle';
                    // Subtle glow matching number color
                    context.shadowColor = numberColors[grid[y][x]];
                    context.shadowBlur = 8;
                    context.fillText(grid[y][x], px + w/2, py + h/2);
                    context.shadowBlur = 0;
                }
            }
        } else {
            // Unrevealed cell - vibrant 3D raised
            roundRect(context, px, py, w, h, radius);
            const cellGrd = context.createLinearGradient(px, py, px + w, py + h);
            cellGrd.addColorStop(0, '#5070e0');
            cellGrd.addColorStop(1, '#2c3fa0');
            context.fillStyle = cellGrd;
            context.fill();

            // Top-left highlight
            context.beginPath();
            context.moveTo(px + radius, py + 1.5);
            context.lineTo(px + w - radius, py + 1.5);
            context.strokeStyle = 'rgba(255,255,255,0.30)';
            context.lineWidth = 2;
            context.stroke();

            context.beginPath();
            context.moveTo(px + 1.5, py + radius);
            context.lineTo(px + 1.5, py + h - radius);
            context.strokeStyle = 'rgba(255,255,255,0.18)';
            context.lineWidth = 2;
            context.stroke();

            // Bottom-right shadow
            context.beginPath();
            context.moveTo(px + w - 1.5, py + radius);
            context.lineTo(px + w - 1.5, py + h - radius);
            context.strokeStyle = 'rgba(0,0,0,0.5)';
            context.lineWidth = 2;
            context.stroke();

            context.beginPath();
            context.moveTo(px + radius, py + h - 1.5);
            context.lineTo(px + w - radius, py + h - 1.5);
            context.strokeStyle = 'rgba(0,0,0,0.5)';
            context.lineWidth = 2;
            context.stroke();
        }
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    function revealCell(x, y) {
        if (revealed[y][x]) return;
        revealed[y][x] = true;

        if (grid[y][x] === -1) {
            gameOver = true;
            stopTimer();
            // Reveal all mines so board shows them
            for (let my = 0; my < size; my++) {
                for (let mx = 0; mx < size; mx++) {
                    if (grid[my][mx] === -1) revealed[my][mx] = true;
                }
            }
            // Caller handles draw + animation
            return;
        }

        if (grid[y][x] === 0) {
            for (let dy of [-1, 0, 1]) {
                for (let dx of [-1, 0, 1]) {
                    if (dy === 0 && dx === 0) continue;
                    const nx = x + dx, ny = y + dy;
                    if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
                        revealCell(nx, ny);
                    }
                }
            }
        }
    }

    function checkWin() {
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (grid[y][x] !== -1 && !revealed[y][x]) return false;
            }
        }
        return true;
    }

    // === EXPLOSION ANIMATION ===
    function startExplosionAnimation(hitX, hitY) {
        const cellSize = canvas.width / size;
        const cx = hitX * cellSize + cellSize / 2;
        const cy = hitY * cellSize + cellSize / 2;
        const startTime = performance.now();
        const duration = 900;

        // CSS screen shake
        canvas.classList.add('shake');
        setTimeout(() => canvas.classList.remove('shake'), 650);

        function frame(now) {
            const t = Math.min((now - startTime) / duration, 1);

            drawBoardOnly();

            // Red flash: ramps up then fades
            const flash = t < 0.25 ? (t / 0.25) * 0.65 : ((1 - t) / 0.75) * 0.4;
            context.fillStyle = `rgba(220, 20, 20, ${flash})`;
            context.fillRect(0, 0, canvas.width, canvas.height);

            // Shockwave rings expanding from mine
            for (let i = 0; i < 4; i++) {
                const delay = i * 0.12;
                const rt = Math.max(0, t - delay) / (1 - delay);
                if (rt > 0 && rt <= 1) {
                    const radius = rt * canvas.width * 0.72;
                    const opacity = (1 - rt) * 0.8;
                    const r = Math.floor(255);
                    const g = Math.floor(140 * (1 - rt));
                    context.beginPath();
                    context.arc(cx, cy, radius, 0, Math.PI * 2);
                    context.strokeStyle = `rgba(${r},${g},0,${opacity})`;
                    context.lineWidth = Math.max(1, 4 * (1 - rt));
                    context.stroke();
                }
            }

            // 💥 emoji scales in with overshoot (spring)
            if (t > 0.12) {
                const et = Math.min(1, (t - 0.12) / 0.5);
                // Spring: overshoot to 1.3x then settle at 1x
                const spring = 1 - Math.cos(et * Math.PI * 2.2) * Math.exp(-et * 5) * (1 - et);
                const sz = Math.floor(canvas.width * 0.30 * Math.max(0, spring));
                if (sz > 0) {
                    context.font = `${sz}px Arial`;
                    context.textAlign = 'center';
                    context.textBaseline = 'middle';
                    context.fillText('💥', canvas.width / 2, canvas.height / 2);
                }
            }

            if (t < 1) {
                requestAnimationFrame(frame);
            } else {
                drawFinalOverlay('#ff1744', '💥');
                messageDiv.className = 'lose';
                messageDiv.textContent = `💥 踩到地雷！游戏结束。用时 ${elapsedTime} 秒`;
            }
        }

        requestAnimationFrame(frame);
    }

    // === WIN CONFETTI ANIMATION ===
    function startWinAnimation() {
        const confettiColors = ['#ff1744','#00e676','#29b6f6','#d500f9','#ff6d00','#ff4081','#ffe000'];
        const particles = Array.from({length: 70}, () => ({
            x: Math.random() * canvas.width,
            y: -10 - Math.random() * canvas.height * 0.6,
            vx: (Math.random() - 0.5) * 5,
            vy: 1.5 + Math.random() * 3.5,
            size: 5 + Math.random() * 9,
            color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.15,
            isCircle: Math.random() > 0.6,
        }));

        const startTime = performance.now();
        const duration = 2000;
        let lastTime = startTime;

        function frame(now) {
            const t = Math.min((now - startTime) / duration, 1);
            const dt = Math.min((now - lastTime) / 16.67, 3); // cap delta
            lastTime = now;

            drawBoardOnly();

            // Update & draw confetti
            for (const p of particles) {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vy += 0.1 * dt;
                p.rotation += p.rotSpeed * dt;
                if (p.y > canvas.height + 20) continue;

                context.save();
                context.globalAlpha = Math.min(1, (1 - t) * 3); // fade out near end
                context.translate(p.x, p.y);
                context.rotate(p.rotation);
                context.fillStyle = p.color;
                if (p.isCircle) {
                    context.beginPath();
                    context.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                    context.fill();
                } else {
                    context.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
                }
                context.restore();
            }

            // 🏆 zoom in with spring
            if (t > 0.05) {
                const et = Math.min(1, (t - 0.05) / 0.50);
                const spring = 1 - Math.cos(et * Math.PI * 2.5) * Math.exp(-et * 5) * (1 - et);
                const sz = Math.floor(canvas.width * 0.28 * Math.max(0, spring));
                if (sz > 0) {
                    context.save();
                    context.shadowColor = '#ffab40';
                    context.shadowBlur = 50;
                    context.font = `${sz}px Arial`;
                    context.textAlign = 'center';
                    context.textBaseline = 'middle';
                    context.fillText('🏆', canvas.width / 2, canvas.height / 2);
                    context.restore();
                }
            }

            if (t < 1) {
                requestAnimationFrame(frame);
            } else {
                drawFinalOverlay('#00e676', '🏆');
                messageDiv.className = 'win';
                messageDiv.textContent = `🏆 恭喜！用时 ${elapsedTime} 秒，成功扫雷！`;
            }
        }

        requestAnimationFrame(frame);
    }

    // === FINAL STATIC OVERLAY (after animation ends) ===
    function drawFinalOverlay(color, emoji) {
        context.fillStyle = 'rgba(0,0,0,0.62)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const hexToRgba = (hex, a) => {
            const rv = parseInt(hex.slice(1,3),16);
            const gv = parseInt(hex.slice(3,5),16);
            const bv = parseInt(hex.slice(5,7),16);
            return `rgba(${rv},${gv},${bv},${a})`;
        };
        const r = canvas.width * 0.30;
        const grd = context.createRadialGradient(cx, cy, 0, cx, cy, r);
        grd.addColorStop(0, hexToRgba(color, 0.55));
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        context.fillStyle = grd;
        context.beginPath();
        context.arc(cx, cy, r, 0, Math.PI * 2);
        context.fill();

        const sz = Math.floor(canvas.width * 0.26);
        context.save();
        context.shadowColor = color;
        context.shadowBlur = 40;
        context.font = `${sz}px Arial`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(emoji, cx, cy);
        context.restore();
    }

    function startTimer() {
        timerInterval = setInterval(() => {
            elapsedTime++;
            timerEl.textContent = elapsedTime;
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    const canvasSize = Math.min(Math.floor(window.innerWidth * 0.94), 540);
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    initializeGame();
    draw();
});
