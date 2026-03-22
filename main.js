document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const context = canvas.getContext('2d');
    const startButton = document.getElementById('start-button');
    const difficultySlider = document.getElementById('difficulty-slider');
    const difficultyLabel = document.getElementById('difficulty-label');
    const messageDiv = document.getElementById('message');
    const mineCountEl = document.getElementById('mine-count');
    const timerEl = document.getElementById('timer');

    // Default: difficulty 1 → size = 1+8 = 9, mines = floor(81*0.1) = 8
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

    // Classic Minesweeper number colors (bright palette for dark background)
    const numberColors = [
        '',          // 0 - not shown
        '#4fc3f7',   // 1 - cyan blue
        '#69f0ae',   // 2 - green
        '#ff5252',   // 3 - red
        '#b39ddb',   // 4 - purple
        '#ffab40',   // 5 - orange
        '#4dd0e1',   // 6 - teal
        '#f48fb1',   // 7 - pink
        '#cfd8dc',   // 8 - light gray
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

        if (x >= 0 && x < size && y >= 0 && y < size) {
            revealCell(x, y);
            draw();
            if (!gameOver && checkWin()) {
                won = true;
                stopTimer();
                drawOverlay('#69f0ae', '🏆');
                messageDiv.className = 'win';
                messageDiv.textContent = `🏆 恭喜！用时 ${elapsedTime} 秒，成功扫雷！`;
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
                if (nx >= 0 && nx < size && ny >= 0 && ny < size && grid[ny][nx] === -1) {
                    count++;
                }
            }
        }
        return count;
    }

    function draw() {
        const cellSize = canvas.width / size;
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Draw dark background
        context.fillStyle = '#0d1a2e';
        context.fillRect(0, 0, canvas.width, canvas.height);

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                drawCell(x, y, cellSize);
            }
        }

        if (won) {
            drawOverlay('#69f0ae', '🏆');
        }
    }

    function drawCell(x, y, cellSize) {
        const gap = 2;
        const px = x * cellSize + gap;
        const py = y * cellSize + gap;
        const w = cellSize - gap * 2;
        const h = cellSize - gap * 2;
        const radius = Math.max(2, w * 0.12);

        if (revealed[y][x]) {
            if (grid[y][x] === -1) {
                // Mine cell - deep red glow
                roundRect(context, px, py, w, h, radius);
                context.fillStyle = '#3d1010';
                context.fill();

                // Red inner glow
                const grad = context.createRadialGradient(px + w/2, py + h/2, 0, px + w/2, py + h/2, w/2);
                grad.addColorStop(0, 'rgba(255,50,50,0.25)');
                grad.addColorStop(1, 'rgba(255,50,50,0)');
                context.fillStyle = grad;
                context.fill();

                // Bomb emoji
                const emojiSize = Math.floor(w * 0.58);
                context.font = `${emojiSize}px Arial`;
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.fillText('💣', px + w / 2, py + h / 2);

            } else {
                // Revealed safe cell
                roundRect(context, px, py, w, h, radius);
                context.fillStyle = '#1a2d4d';
                context.fill();

                // Subtle inner border
                context.strokeStyle = 'rgba(79,195,247,0.12)';
                context.lineWidth = 1;
                context.stroke();

                if (grid[y][x] > 0) {
                    const numSize = Math.max(10, Math.floor(w * 0.52));
                    context.fillStyle = numberColors[grid[y][x]];
                    context.font = `bold ${numSize}px Orbitron, Arial`;
                    context.textAlign = 'center';
                    context.textBaseline = 'middle';
                    context.fillText(grid[y][x], px + w / 2, py + h / 2);
                }
            }
        } else {
            // Unrevealed cell - 3D raised effect
            roundRect(context, px, py, w, h, radius);
            context.fillStyle = '#2c4080';
            context.fill();

            // Top-left highlight (light edge)
            context.beginPath();
            context.moveTo(px + radius, py);
            context.lineTo(px + w - radius, py);
            context.lineTo(px + w, py + radius);
            context.lineTo(px + w, py + h - radius);
            context.strokeStyle = 'rgba(255,255,255,0.18)';
            context.lineWidth = 2;
            context.stroke();

            // Bottom-right shadow
            context.beginPath();
            context.moveTo(px + w, py + h - radius);
            context.lineTo(px + w - radius, py + h);
            context.lineTo(px + radius, py + h);
            context.lineTo(px, py + h - radius);
            context.strokeStyle = 'rgba(0,0,0,0.45)';
            context.lineWidth = 2;
            context.stroke();

            // Subtle shimmer gradient
            const shimmer = context.createLinearGradient(px, py, px + w, py + h);
            shimmer.addColorStop(0, 'rgba(255,255,255,0.07)');
            shimmer.addColorStop(0.5, 'rgba(255,255,255,0)');
            shimmer.addColorStop(1, 'rgba(0,0,0,0.1)');
            roundRect(context, px, py, w, h, radius);
            context.fillStyle = shimmer;
            context.fill();
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
            // Reveal all mines
            for (let my = 0; my < size; my++) {
                for (let mx = 0; mx < size; mx++) {
                    if (grid[my][mx] === -1) revealed[my][mx] = true;
                }
            }
            draw();
            drawOverlay('#ff5252', '💥');
            messageDiv.className = 'lose';
            messageDiv.textContent = `💥 踩到地雷！游戏结束。用时 ${elapsedTime} 秒`;
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

    function drawOverlay(color, emoji) {
        // Semi-transparent dark veil
        context.fillStyle = 'rgba(0,0,0,0.55)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Colored glow circle in center
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const r = canvas.width * 0.22;
        const grd = context.createRadialGradient(cx, cy, 0, cx, cy, r);
        grd.addColorStop(0, color.replace('#', 'rgba(') + ', 0.35)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');

        // Convert hex to rgba manually for gradient
        const hexToRgba = (hex, alpha) => {
            const r = parseInt(hex.slice(1,3),16);
            const g = parseInt(hex.slice(3,5),16);
            const b = parseInt(hex.slice(5,7),16);
            return `rgba(${r},${g},${b},${alpha})`;
        };
        const grd2 = context.createRadialGradient(cx, cy, 0, cx, cy, r);
        grd2.addColorStop(0, hexToRgba(color, 0.4));
        grd2.addColorStop(1, 'rgba(0,0,0,0)');
        context.fillStyle = grd2;
        context.beginPath();
        context.arc(cx, cy, r, 0, Math.PI * 2);
        context.fill();

        // Large emoji
        const emojiSize = Math.floor(canvas.width * 0.22);
        context.font = `${emojiSize}px Arial`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(emoji, cx, cy);
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

    // Initialize canvas to a square fitting screen width
    const canvasSize = Math.min(Math.floor(window.innerWidth * 0.94), 540);
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    initializeGame();
    draw();
});
