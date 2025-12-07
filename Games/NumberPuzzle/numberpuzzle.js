// Elements
const board = document.getElementById('board');
const movesEl = document.getElementById('moves');
const timerEl = document.getElementById('timer');
const bestMovesEl = document.getElementById('bestMoves');
const startBanner = document.getElementById('startBanner');
const startBtn = document.getElementById('startBtn');
const winOverlay = document.getElementById('winOverlay');
const finalMovesEl = document.getElementById('finalMoves');
const finalTimeEl = document.getElementById('finalTime');
const newRecordEl = document.getElementById('newRecord');
const xpEarnedText = document.getElementById('xpEarnedText');
const shuffleBtn = document.getElementById('shuffleBtn');
const resetBtn = document.getElementById('resetBtn');
const playAgainBtn = document.getElementById('playAgainBtn');
const difficultyButtons = document.querySelectorAll('.diff-btn');

// Game state
let size = 4;
let tiles = [];
let emptyPos = { row: 0, col: 0 };
let moves = 0;
let seconds = 0;
let timerInterval = null;
let isPlaying = false;
let tileSize = 0;
let gap = 8;
let gameStartTime = null;

// Records
let records = {
    3: parseInt(localStorage.getItem('puzzle3x3')) || null,
    4: parseInt(localStorage.getItem('puzzle4x4')) || null,
    5: parseInt(localStorage.getItem('puzzle5x5')) || null
};

// Expune funcția pentru Firebase să o poată apela
window.updatePuzzleRecords = function(firebaseRecords) {
    records = {
        3: firebaseRecords["3"] || parseInt(localStorage.getItem('puzzle3x3')) || null,
        4: firebaseRecords["4"] || parseInt(localStorage.getItem('puzzle4x4')) || null,
        5: firebaseRecords["5"] || parseInt(localStorage.getItem('puzzle5x5')) || null
    };
    updateBestMoves();
};

// Init
initGame();

// Difficulty buttons
difficultyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        difficultyButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        size = parseInt(btn.dataset.size);
        initGame();
    });
});

// Initialize game
function initGame() {
    moves = 0;
    seconds = 0;
    isPlaying = false;
    movesEl.textContent = 0;
    timerEl.textContent = '0:00';
    updateBestMoves();
    stopTimer();
    
    // Create solved puzzle
    tiles = [];
    for(let r = 0; r < size; r++) {
        tiles[r] = [];
        for(let c = 0; c < size; c++) {
            tiles[r][c] = r * size + c + 1;
        }
    }
    tiles[size-1][size-1] = 0; // Empty space
    emptyPos = { row: size-1, col: size-1 };
    
    renderBoard();
    startBanner.classList.remove('hidden');
    winOverlay.classList.add('hidden');
    xpEarnedText.classList.add('hidden');
}

// Render board
function renderBoard() {
    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    
    const boardRect = board.getBoundingClientRect();
    tileSize = (boardRect.width - gap * (size + 1)) / size;
    
    for(let r = 0; r < size; r++) {
        for(let c = 0; c < size; c++) {
            const value = tiles[r][c];
            const tile = document.createElement('div');
            tile.className = 'tile';
            
            if(value === 0) {
                tile.classList.add('empty');
            } else {
                tile.textContent = value;
                tile.dataset.row = r;
                tile.dataset.col = c;
                
                // Check if correct position
                if(value === r * size + c + 1) {
                    tile.classList.add('correct');
                }
                
                // Check if can move (next to empty)
                if(canMove(r, c)) {
                    tile.classList.add('draggable');
                    addDragHandlers(tile, r, c);
                }
            }
            
            // Position tile
            const x = c * (tileSize + gap) + gap;
            const y = r * (tileSize + gap) + gap;
            tile.style.left = x + 'px';
            tile.style.top = y + 'px';
            tile.style.width = tileSize + 'px';
            tile.style.height = tileSize + 'px';
            
            board.appendChild(tile);
        }
    }
    
    board.style.height = (size * (tileSize + gap) + gap) + 'px';
}

// Check if tile can move
function canMove(row, col) {
    return (Math.abs(row - emptyPos.row) === 1 && col === emptyPos.col) ||
           (Math.abs(col - emptyPos.col) === 1 && row === emptyPos.row);
}

// Add drag handlers
function addDragHandlers(tile, row, col) {
    tile.addEventListener('mousedown', (e) => startDrag(e, tile, row, col));
    tile.addEventListener('touchstart', (e) => startDrag(e, tile, row, col), {passive: false});
}

// Start drag
function startDrag(e, tile, row, col) {
    if(!isPlaying) return;
    
    e.preventDefault();
    
    const touch = e.type === 'touchstart' ? e.touches[0] : e;
    const startX = touch.clientX;
    const startY = touch.clientY;
    
    // Store drag state on the tile itself
    tile.dragData = {
        startX,
        startY,
        offsetX: 0,
        offsetY: 0,
        originalX: col * (tileSize + gap) + gap,
        originalY: row * (tileSize + gap) + gap,
        row,
        col
    };
    
    tile.classList.add('dragging');
    
    if(e.type === 'mousedown') {
        document.addEventListener('mousemove', handleDrag);
        document.addEventListener('mouseup', endDrag);
    } else {
        document.addEventListener('touchmove', handleDrag, {passive: false});
        document.addEventListener('touchend', endDrag);
    }
}

// Handle drag
function handleDrag(e) {
    e.preventDefault();
    
    const tile = document.querySelector('.tile.dragging');
    if(!tile || !tile.dragData) return;
    
    const touch = e.type === 'touchmove' ? e.touches[0] : e;
    const { startX, startY, originalX, originalY, row, col } = tile.dragData;
    
    let deltaX = touch.clientX - startX;
    let deltaY = touch.clientY - startY;
    
    // Constrain movement to direction of empty space
    if(row === emptyPos.row) {
        // Can move horizontally
        deltaY = 0;
        const direction = col < emptyPos.col ? 1 : -1;
        const maxMove = tileSize + gap;
        
        if(direction > 0) {
            deltaX = Math.max(0, Math.min(deltaX, maxMove));
        } else {
            deltaX = Math.min(0, Math.max(deltaX, -maxMove));
        }
    } else if(col === emptyPos.col) {
        // Can move vertically
        deltaX = 0;
        const direction = row < emptyPos.row ? 1 : -1;
        const maxMove = tileSize + gap;
        
        if(direction > 0) {
            deltaY = Math.max(0, Math.min(deltaY, maxMove));
        } else {
            deltaY = Math.min(0, Math.max(deltaY, -maxMove));
        }
    }
    
    tile.dragData.offsetX = deltaX;
    tile.dragData.offsetY = deltaY;
    
    // Apply offset from original position
    tile.style.left = (originalX + deltaX) + 'px';
    tile.style.top = (originalY + deltaY) + 'px';
}

// End drag
function endDrag(e) {
    const tile = document.querySelector('.tile.dragging');
    if(!tile || !tile.dragData) return;
    
    const { offsetX, offsetY, originalX, originalY, row, col } = tile.dragData;
    
    const threshold = (tileSize + gap) * 0.5;
    let shouldMove = false;
    
    if(Math.abs(offsetX) > threshold || Math.abs(offsetY) > threshold) {
        shouldMove = true;
    }
    
    if(shouldMove) {
        // Animate to final position
        const emptyX = emptyPos.col * (tileSize + gap) + gap;
        const emptyY = emptyPos.row * (tileSize + gap) + gap;
        
        tile.style.transition = 'all 0.2s ease';
        tile.style.left = emptyX + 'px';
        tile.style.top = emptyY + 'px';
        
        setTimeout(() => {
            // Move tile into empty space
            tiles[emptyPos.row][emptyPos.col] = tiles[row][col];
            tiles[row][col] = 0;
            emptyPos = { row, col };
            
            moves++;
            movesEl.textContent = moves;
            
            tile.style.transition = '';
            tile.classList.remove('dragging');
            tile.dragData = null;
            
            renderBoard();
            
            if(isSolved()) {
                setTimeout(winGame, 300);
            }
        }, 200);
    } else {
        // Snap back to original position
        tile.style.transition = 'all 0.2s ease';
        tile.style.left = originalX + 'px';
        tile.style.top = originalY + 'px';
        
        setTimeout(() => {
            tile.style.transition = '';
            tile.classList.remove('dragging');
            tile.dragData = null;
        }, 200);
    }
    
    // Cleanup event listeners
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('touchmove', handleDrag);
    document.removeEventListener('touchend', endDrag);
}

// Check if solved
function isSolved() {
    for(let r = 0; r < size; r++) {
        for(let c = 0; c < size; c++) {
            const expected = r * size + c + 1;
            if(r === size-1 && c === size-1) {
                if(tiles[r][c] !== 0) return false;
            } else {
                if(tiles[r][c] !== expected) return false;
            }
        }
    }
    return true;
}

// Shuffle
function shuffle() {
    for(let i = 0; i < 200; i++) {
        const movable = [];
        
        if(emptyPos.row > 0) movable.push({r: emptyPos.row-1, c: emptyPos.col});
        if(emptyPos.row < size-1) movable.push({r: emptyPos.row+1, c: emptyPos.col});
        if(emptyPos.col > 0) movable.push({r: emptyPos.row, c: emptyPos.col-1});
        if(emptyPos.col < size-1) movable.push({r: emptyPos.row, c: emptyPos.col+1});
        
        const rand = movable[Math.floor(Math.random() * movable.length)];
        tiles[emptyPos.row][emptyPos.col] = tiles[rand.r][rand.c];
        tiles[rand.r][rand.c] = 0;
        emptyPos = {row: rand.r, col: rand.c};
    }
    
    renderBoard();
}

// Start game
function startGame() {
    startBanner.classList.add('hidden');
    shuffle();
    isPlaying = true;
    gameStartTime = Date.now();
    startTimer();
}

// Timer
function startTimer() {
    stopTimer();
    timerInterval = setInterval(() => {
        seconds++;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        timerEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }, 1000);
}

function stopTimer() {
    if(timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Calculează XP pentru puzzle
function calculateXP() {
    // Verifică dacă utilizatorul este logat
    if (!window.getIsUserLoggedIn || !window.getIsUserLoggedIn()) {
        return 0;
    }
    
    let xp = 0;
    
    // XP bazat pe timp: 10 XP per minut
    const minutesPlayed = Math.max(1, Math.floor(seconds / 60));
    xp += minutesPlayed * 10;
    
    // Bonus pentru dificultate:
    if (size === 3) {
        xp += 50; // 3x3 puzzle
    } else if (size === 4) {
        xp += 75; // 4x4 puzzle
    } else if (size === 5) {
        xp += 100; // 5x5 puzzle
    }
    
    // Bonus pentru eficiență (mai puține mutări = mai mult XP)
    const baseMoves = size * size * 10; // Număr estimat de mutări
    if (moves < baseMoves) {
        const efficiencyBonus = Math.floor((baseMoves - moves) / 10) * 5;
        xp += efficiencyBonus;
    }
    
    return Math.max(10, xp); // Minimum 10 XP
}

// Afișează notificare XP
function showXPEarnedNotification(xpAmount) {
    if (!xpAmount || xpAmount <= 0) return;
    
    const notification = document.createElement('div');
    notification.className = 'xp-notification';
    notification.innerHTML = `
        <div class="xp-notification-content">
            <span class="xp-icon">🔢</span>
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

// Win
function winGame() {
    stopTimer();
    isPlaying = false;
    
    finalMovesEl.textContent = moves;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    finalTimeEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    
    const currentRecord = records[size];
    if(currentRecord === null || moves < currentRecord) {
        records[size] = moves;
        localStorage.setItem(`puzzle${size}x${size}`, moves);
        newRecordEl.classList.remove('hidden');
        updateBestMoves();
    } else {
        newRecordEl.classList.add('hidden');
    }
    
    // Calculează XP și afișează
    const xpEarned = calculateXP();
    if (xpEarned > 0) {
        xpEarnedText.textContent = `⭐ XP Earned: +${xpEarned}`;
        xpEarnedText.classList.remove('hidden');
        xpEarnedText.style.cssText = `
            color: #ff6b9d;
            font-weight: bold;
            margin-top: 10px;
            font-size: 1.1em;
        `;
        
        // Afișează notificare
        showXPEarnedNotification(xpEarned);
        
        // Salvează în Firebase
        if (window.savePuzzleProgress) {
            window.savePuzzleProgress(size, moves, seconds, xpEarned);
        }
    }
    
    winOverlay.classList.remove('hidden');
}

// Update best
function updateBestMoves() {
    const record = records[size];
    bestMovesEl.textContent = record !== null ? record : '-';
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
`;
document.head.appendChild(style);

// Events
startBtn.addEventListener('click', startGame);
shuffleBtn.addEventListener('click', () => {
    if(isPlaying) {
        moves = 0;
        movesEl.textContent = 0;
        shuffle();
    }
});
resetBtn.addEventListener('click', initGame);
playAgainBtn.addEventListener('click', () => {
    winOverlay.classList.add('hidden');
    initGame();
});

window.addEventListener('resize', () => {
    if(board.children.length > 0) {
        const boardRect = board.getBoundingClientRect();
        tileSize = (boardRect.width - gap * (size + 1)) / size;
        renderBoard();
    }
});