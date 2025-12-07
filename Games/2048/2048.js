// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function () {
    // Create grid background cells
    const gridBackground = document.getElementById('gridBackground');
    for (let i = 0; i < 16; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        gridBackground.appendChild(cell);
    }

    // Initialize game
    new Game2048();
});

class Game2048 {
    constructor() {
        this.size = 4;
        this.grid = [];
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('2048BestScore')) || 0;
        this.moves = 0;
        this.gameStarted = false;
        this.gameOver = false;
        this.won = false;
        this.keepPlaying = false;
        this.previousState = null;
        this.gameStartTime = null;
        this.totalMergeXP = 0;
        this.highestTile = 0;

        this.initElements();
        this.initEventListeners();
        this.newGame();
    }

    initElements() {
        this.gridContainer = document.getElementById('gridContainer');
        this.gridTiles = document.getElementById('gridTiles');
        this.scoreEl = document.getElementById('score');
        this.bestScoreEl = document.getElementById('bestScore');
        this.movesEl = document.getElementById('moves');
        this.recordScoreEl = document.getElementById('recordScore');
        this.startBanner = document.getElementById('startBanner');
        this.undoBtn = document.getElementById('undoBtn');

        // Adaugă elementele XP dacă nu există
        this.winXPEl = document.getElementById('winXP') || this.createXPEl('winXP');
        this.finalXPEl = document.getElementById('finalXP') || this.createXPEl('finalXP');
    }

    createXPEl(id) {
        const xpEl = document.createElement('span');
        xpEl.id = id;
        xpEl.className = 'xp-text hidden';
        return xpEl;
    }

    initEventListeners() {
        // Start button
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startBanner.classList.add('hidden');
            this.gameStarted = true;
            this.gameStartTime = Date.now();
        });

        // Keyboard
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));

        // Touch
        this.setupTouchControls();

        // Buttons
        this.undoBtn.addEventListener('click', () => this.undo());
        document.getElementById('newGameBtn').addEventListener('click', () => this.restart());
        document.getElementById('continueBtn').addEventListener('click', () => {
            this.keepPlaying = true;
            document.getElementById('winOverlay').classList.add('hidden');
        });
        document.getElementById('newGameWinBtn').addEventListener('click', () => {
            document.getElementById('winOverlay').classList.add('hidden');
            this.restart();
        });
        document.getElementById('tryAgainBtn').addEventListener('click', () => {
            document.getElementById('gameOverOverlay').classList.add('hidden');
            this.restart();
        });

        // Resize
        window.addEventListener('resize', () => {
            if (this.gameStarted && !this.gameOver) {
                this.render();
            }
        });
    }

    setupTouchControls() {
        let touchStartX = 0;
        let touchStartY = 0;

        this.gridContainer.addEventListener('touchstart', (e) => {
            if (!this.gameStarted || this.gameOver) return;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            e.preventDefault();
        });

        this.gridContainer.addEventListener('touchend', (e) => {
            if (!this.gameStarted || this.gameOver) return;

            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;

            const dx = touchEndX - touchStartX;
            const dy = touchEndY - touchStartY;

            if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    this.move(dx > 0 ? 'right' : 'left');
                } else {
                    this.move(dy > 0 ? 'down' : 'up');
                }
            }
        });
    }

    handleKeyPress(e) {
        if (!this.gameStarted || this.gameOver) return;

        const keyMap = {
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right'
        };

        if (keyMap[e.key]) {
            e.preventDefault();
            this.move(keyMap[e.key]);
        }
    }

    newGame() {
        this.grid = Array(this.size).fill(null).map(() => Array(this.size).fill(0));
        this.score = 0;
        this.moves = 0;
        this.gameOver = false;
        this.won = false;
        this.keepPlaying = false;
        this.previousState = null;
        this.totalMergeXP = 0;
        this.highestTile = 0;

        this.addRandomTile();
        this.addRandomTile();

        this.updateUI();
        this.render();
    }

    restart() {
        this.newGame();
        this.startBanner.classList.remove('hidden');
        this.gameStarted = false;
        this.gameStartTime = null;
    }

    addRandomTile() {
        const emptyCells = [];
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.grid[i][j] === 0) {
                    emptyCells.push({ x: i, y: j });
                }
            }
        }

        if (emptyCells.length > 0) {
            const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            this.grid[cell.x][cell.y] = Math.random() < 0.9 ? 2 : 4;
            if (this.grid[cell.x][cell.y] > this.highestTile) {
                this.highestTile = this.grid[cell.x][cell.y];
            }
        }
    }

    move(direction) {
        if (!this.gameStarted || this.gameOver) return;

        // Save state
        this.previousState = {
            grid: JSON.parse(JSON.stringify(this.grid)),
            score: this.score,
            moves: this.moves,
            totalMergeXP: this.totalMergeXP,
            highestTile: this.highestTile
        };

        let moved = false;
        const oldGrid = JSON.parse(JSON.stringify(this.grid)); // Keep for animations

        if (direction === 'left') moved = this.moveLeft();
        else if (direction === 'right') moved = this.moveRight();
        else if (direction === 'up') moved = this.moveUp();
        else if (direction === 'down') moved = this.moveDown();

        if (moved) {
            this.moves++;
            this.updateUI();
            this.render(oldGrid); // Pass old grid for animations

            setTimeout(() => {
                this.addRandomTile();
                this.render();

                // Check win
                if (!this.won && this.hasWon()) {
                    this.won = true;
                    if (!this.keepPlaying) {
                        setTimeout(() => this.showWin(), 300);
                    }
                }

                // Check game over
                if (!this.canMove()) {
                    this.gameOver = true;
                    setTimeout(() => this.showGameOver(), 300);
                }
            }, 150);
        } else {
            this.previousState = null;
        }
    }

    moveLeft() {
        let moved = false;
        for (let i = 0; i < this.size; i++) {
            const row = this.grid[i];
            const newRow = this.slide(row);
            if (JSON.stringify(row) !== JSON.stringify(newRow)) {
                moved = true;
                this.grid[i] = newRow;
            }
        }
        return moved;
    }

    moveRight() {
        let moved = false;
        for (let i = 0; i < this.size; i++) {
            const row = this.grid[i].slice().reverse();
            const newRow = this.slide(row).reverse();
            if (JSON.stringify(this.grid[i]) !== JSON.stringify(newRow)) {
                moved = true;
                this.grid[i] = newRow;
            }
        }
        return moved;
    }

    moveUp() {
        let moved = false;
        for (let j = 0; j < this.size; j++) {
            const col = [];
            for (let i = 0; i < this.size; i++) {
                col.push(this.grid[i][j]);
            }
            const newCol = this.slide(col);
            if (JSON.stringify(col) !== JSON.stringify(newCol)) {
                moved = true;
                for (let i = 0; i < this.size; i++) {
                    this.grid[i][j] = newCol[i];
                }
            }
        }
        return moved;
    }

    moveDown() {
        let moved = false;
        for (let j = 0; j < this.size; j++) {
            const col = [];
            for (let i = 0; i < this.size; i++) {
                col.push(this.grid[i][j]);
            }
            const newCol = this.slide(col.reverse()).reverse();
            if (JSON.stringify(col.reverse()) !== JSON.stringify(newCol)) {
                moved = true;
                for (let i = 0; i < this.size; i++) {
                    this.grid[i][j] = newCol[i];
                }
            }
        }
        return moved;
    }

    slide(row) {
        // Remove zeros
        let arr = row.filter(val => val !== 0);

        // Merge
        for (let i = 0; i < arr.length - 1; i++) {
            if (arr[i] === arr[i + 1]) {
                const mergedValue = arr[i] * 2;
                arr[i] = mergedValue;

                // Adaugă la scor
                this.score += mergedValue;

                // Adaugă XP pentru fiecare combinare: 1 XP per combinare
                this.totalMergeXP += 1;

                // Actualizează cel mai mare tile
                if (mergedValue > this.highestTile) {
                    this.highestTile = mergedValue;
                }

                arr.splice(i + 1, 1);
            }
        }

        // Add zeros
        while (arr.length < this.size) {
            arr.push(0);
        }

        return arr;
    }

    hasWon() {
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.grid[i][j] === 2048) {
                    return true;
                }
            }
        }
        return false;
    }

    canMove() {
        // Check empty cells
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.grid[i][j] === 0) return true;
            }
        }

        // Check merges
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const current = this.grid[i][j];
                if (j < this.size - 1 && current === this.grid[i][j + 1]) return true;
                if (i < this.size - 1 && current === this.grid[i + 1][j]) return true;
            }
        }

        return false;
    }

    undo() {
        if (this.previousState) {
            this.grid = this.previousState.grid;
            this.score = this.previousState.score;
            this.moves = this.previousState.moves;
            this.totalMergeXP = this.previousState.totalMergeXP;
            this.highestTile = this.previousState.highestTile;
            this.previousState = null;
            this.gameOver = false;
            this.updateUI();
            this.render();
        }
    }

    // Calculează XP pentru joc
    calculateXP() {
        // Verifică dacă utilizatorul este logat
        if (!window.getIsUserLoggedIn || !window.getIsUserLoggedIn()) {
            return 0;
        }

        let xp = 0;

        // XP bazat pe timp: 10 XP per minut
        if (this.gameStartTime) {
            const gameDuration = Math.floor((Date.now() - this.gameStartTime) / 1000);
            const minutesPlayed = Math.max(1, Math.floor(gameDuration / 60));
            xp += minutesPlayed * 10;
        }

        // XP pentru combinări: 1 XP per combinare
        xp += this.totalMergeXP;

        // Bonus pentru scor înalt: +1 XP per 100 de puncte
        const scoreBonus = Math.floor(this.score / 100);
        xp += scoreBonus;

        // Bonus pentru tile înalt:
        if (this.highestTile >= 2048) {
            xp += 20; // Bonus pentru atingerea 2048
        } else if (this.highestTile >= 1024) {
            xp += 10; // Bonus pentru atingerea 1024
        } else if (this.highestTile >= 512) {
            xp += 5; // Bonus pentru atingerea 512
        }

        return Math.max(10, xp); // Minimum 10 XP
    }

    // Afișează notificare XP
    showXPEarnedNotification(xpAmount) {
        if (!xpAmount || xpAmount <= 0) return;

        const notification = document.createElement('div');
        notification.className = 'xp-notification';
        notification.innerHTML = `
            <div class="xp-notification-content">
                <span class="xp-icon">🎯</span>
                <span class="xp-text">+${xpAmount} XP Earned!</span>
            </div>
        `;

        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: linear-gradient(135deg, #ff9a76 0%, #ff6b9d 100%);
            color: white;
            padding: 15px 25px;
            border-radius: 15px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 1000;
            animation: slideInRight 0.3s ease-out, fadeOut 3s ease-in 2s forwards;
            font-weight: bold;
            font-size: 1.1em;
            display: flex;
            align-items: center;
            gap: 10px;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    updateUI() {
        this.scoreEl.textContent = this.score;
        this.movesEl.textContent = this.moves;

        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('2048BestScore', this.bestScore);
        }

        this.bestScoreEl.textContent = this.bestScore;
        this.recordScoreEl.textContent = this.bestScore;
        this.undoBtn.disabled = this.previousState === null;
    }

    render(previousGrid = null) {
        const containerWidth = this.gridTiles.offsetWidth;
        const gap = 15;
        const cellSize = (containerWidth - gap * 3) / 4;

        // Get existing tiles
        const existingTiles = {};
        this.gridTiles.querySelectorAll('.tile').forEach(tile => {
            const key = `${tile.dataset.row}-${tile.dataset.col}`;
            existingTiles[key] = tile;
        });

        // Track new tiles
        const newTiles = new Set();

        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const value = this.grid[i][j];
                if (value !== 0) {
                    const key = `${i}-${j}`;
                    let tile = existingTiles[key];

                    // Check if tile is new or moved
                    const isNew = !previousGrid || previousGrid[i][j] === 0;
                    const wasMerged = previousGrid && this.checkIfMerged(previousGrid, i, j, value);

                    if (!tile || tile.textContent != value) {
                        // Create new tile or update
                        if (tile) tile.remove();

                        tile = document.createElement('div');
                        tile.className = `tile tile-${value > 2048 ? 'super' : value}`;
                        tile.textContent = value;
                        tile.dataset.row = i;
                        tile.dataset.col = j;

                        if (isNew) {
                            tile.classList.add('tile-new');
                        }

                        if (wasMerged) {
                            tile.classList.add('tile-merged');
                        }

                        this.gridTiles.appendChild(tile);
                        newTiles.add(tile);
                    } else {
                        // Update position if moved
                        if (tile.dataset.row != i || tile.dataset.col != j) {
                            tile.dataset.row = i;
                            tile.dataset.col = j;
                        }
                        delete existingTiles[key];
                    }

                    tile.style.width = `${cellSize}px`;
                    tile.style.height = `${cellSize}px`;
                    tile.style.left = `${j * (cellSize + gap)}px`;
                    tile.style.top = `${i * (cellSize + gap)}px`;
                    tile.style.fontSize = this.getFontSize(value);
                }
            }
        }

        // Remove old tiles
        Object.values(existingTiles).forEach(tile => {
            tile.style.opacity = '0';
            setTimeout(() => tile.remove(), 150);
        });

        // Remove animation classes after animation
        setTimeout(() => {
            newTiles.forEach(tile => {
                tile.classList.remove('tile-new', 'tile-merged');
            });
        }, 200);
    }

    getFontSize(value) {
        if (value >= 1024) return '1.8rem';
        if (value >= 128) return '2rem';
        if (value > 2048) return '1.5rem';
        return '2.5rem';
    }

    checkIfMerged(previousGrid, row, col, value) {
        // Check if this position had a different value before
        return previousGrid[row][col] !== 0 &&
            previousGrid[row][col] !== value &&
            value > previousGrid[row][col];
    }

    showWin() {
        document.getElementById('winScore').textContent = this.score;
        document.getElementById('winMoves').textContent = this.moves;

        // Calculează și afișează XP
        const xpEarned = this.calculateXP();
        if (xpEarned > 0) {
            this.winXPEl.textContent = `+${xpEarned} XP`;
            this.winXPEl.classList.remove('hidden');
            this.winXPEl.style.cssText = `
            display: block;
            color: #ff6b9d;
            font-weight: bold;
            margin-top: 5px;
            font-size: 1.1em;
        `;

            // Afișează notificare
            this.showXPEarnedNotification(xpEarned);

            // Salvează în Firebase - game completed = TRUE (pentru că a ajuns la 2048)
            if (window.save2048Progress && this.gameStartTime) {
                const gameDuration = Math.floor((Date.now() - this.gameStartTime) / 1000);
                window.save2048Progress(this.score, this.moves, xpEarned, gameDuration, this.highestTile, true); // true = game completed
            }
        }

        document.getElementById('winOverlay').classList.remove('hidden');
    }
    showGameOver() {
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalMoves').textContent = this.moves;

        // Calculează și afișează XP
        const xpEarned = this.calculateXP();
        if (xpEarned > 0) {
            this.finalXPEl.textContent = `+${xpEarned} XP`;
            this.finalXPEl.classList.remove('hidden');
            this.finalXPEl.style.cssText = `
            display: block;
            color: #ff6b9d;
            font-weight: bold;
            margin-top: 5px;
            font-size: 1.1em;
        `;

            // Afișează notificare
            this.showXPEarnedNotification(xpEarned);

            // Salvează în Firebase - game completed = FALSE (pentru că nu a ajuns la 2048)
            // Dar îi dăm totuși XP pentru timpul jucat și combinațiile făcute
            if (window.save2048Progress && this.gameStartTime) {
                const gameDuration = Math.floor((Date.now() - this.gameStartTime) / 1000);
                const gameCompleted = this.highestTile >= 2048; // true doar dacă a ajuns la cel puțin 2048
                window.save2048Progress(this.score, this.moves, xpEarned, gameDuration, this.highestTile, gameCompleted);
            }
        }

        document.getElementById('gameOverOverlay').classList.remove('hidden');
    }
}

// Adaugă animațiile CSS pentru notificări
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    
    .xp-notification-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .xp-icon {
        font-size: 1.5em;
        animation: xpPulse 1s infinite;
    }
    
    @keyframes xpPulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
    }
    
    .xp-text {
        color: #ff6b9d;
        font-weight: bold;
    }
`;
document.head.appendChild(style);

// Expune funcția pentru Firebase
window.update2048BestScore = function (bestScore) {
    const game2048 = document.querySelector('.Game2048') || new Game2048();
    if (game2048.bestScore < bestScore) {
        game2048.bestScore = bestScore;
        game2048.updateUI();
    }
};