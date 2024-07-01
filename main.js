document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const context = canvas.getContext('2d');
    const startButton = document.getElementById('start-button');
    const difficultySlider = document.getElementById('difficulty-slider');
    const difficultyLabel = document.getElementById('difficulty-label');
    const messageDiv = document.getElementById('message');

    let size = 9; // default grid size
    let numMines = 10; // default number of mines
    let grid = [];
    let revealed = [];
    let mines = new Set();
    let gameOver = false;
    let won = false;
    const difficulties = ['超易', '较易', '中等', '较难', '超难'];

    difficultySlider.addEventListener('input', (event) => {
        difficultyLabel.textContent = difficulties[event.target.value - 1];
        size = parseInt(event.target.value) + 8;  // Adjust grid size based on difficulty
        numMines = Math.floor(size * size * 0.1); // Adjust number of mines based on grid size
    });

    startButton.addEventListener('click', () => {
        messageDiv.textContent = '';
        initializeGame();
        draw();
    });

    canvas.addEventListener('click', (event) => {
        if (gameOver || won) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = Math.floor((event.clientX - rect.left) * scaleX / (canvas.width / size));
        const y = Math.floor((event.clientY - rect.top) * scaleY / (canvas.height / size));

        if (x < size && y < size) {
            revealCell(x, y);
            draw();
            if (checkWin()) {
                won = true;
                showResult('✔️', 'green');
                messageDiv.style.color = 'green';
						    messageDiv.textContent = `恭喜成功！你挖出了所有的雷。`;
						// alert("恭喜！你成功挖出所有地雷！");
            }
        }
    });

    function initializeGame() {
        grid = Array.from({ length: size }, () => Array(size).fill(0));
        revealed = Array.from({ length: size }, () => Array(size).fill(false));
        mines = new Set();
        gameOver = false;
        won = false;

        // Place mines
        while (mines.size < numMines) {
            const x = Math.floor(Math.random() * size);
            const y = Math.floor(Math.random() * size);
            if (!mines.has(`${x},${y}`)) {
                mines.add(`${x},${y}`);
                grid[y][x] = -1;
            }
        }

        // Calculate adjacent mines
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (grid[y][x] === -1) continue;
                grid[y][x] = countAdjacentMines(x, y);
            }
        }
    }

    function countAdjacentMines(x, y) {
        let count = 0;
        for (let dy of [-1, 0, 1]) {
            for (let dx of [-1, 0, 1]) {
                if (dy === 0 && dx === 0) continue;
                const nx = x + dx, ny = y + dy;
                if (nx >= 0 && nx < size && ny >= 0 && ny < size && grid[ny][nx] === -1) {
                    count += 1;
                }
            }
        }
        return count;
    }

    function draw() {
        const cellSize = Math.min(canvas.width, canvas.height) / size;
        context.clearRect(0, 0, canvas.width, canvas.height);

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                context.strokeStyle = 'lightgray';
                context.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);

                if (revealed[y][x]) {
                    if (grid[y][x] === -1) {
                        context.fillStyle = 'white';
                        context.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                        context.font = '25px Arial';
                        context.textAlign = 'center';
                        context.textBaseline = 'middle';
                        context.fillText('💣', x * cellSize + cellSize / 2, y * cellSize + cellSize / 2);
                    } else {
                        context.fillStyle = 'white';
                        context.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                        if (grid[y][x] > 0) {
                            context.fillStyle = 'black';
                            context.textAlign = 'center';
                            context.textBaseline = 'middle';
                            context.font = '20px Arial';
                            context.fillText(grid[y][x], x * cellSize + cellSize / 2, y * cellSize + cellSize / 2);
                        }
                    }
                } else {
                    context.fillStyle = 'gray';
                    context.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                }
            }
        }

        if (won) {
            showResult('✔️', 'green');
        }
    }

    function revealCell(x, y) {
        if (revealed[y][x]) return;
        revealed[y][x] = true;
        if (grid[y][x] === -1) {
            gameOver = true;
            showResult('💥', 'red');
            //alert("你踩到了地雷！游戏结束。");
						messageDiv.style.color = 'red';
						messageDiv.textContent = `你踩到了地雷！游戏结束。`;
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
                if (grid[y][x] !== -1 && !revealed[y][x]) {
                    return false;
                }
            }
        }
        return true;
    }

    function showResult(result, color) {
        context.fillStyle = color;
        context.font = '40px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(result, canvas.width / 2, canvas.height / 2);
    }

    // Initialize game
    canvas.width = window.innerWidth * 0.9;
    canvas.height = canvas.width; // Make sure the canvas is a square
    initializeGame();
    draw();
});