// Elements
const board = document.getElementById('board');
const cells = document.querySelectorAll('.cell');
const gameStatus = document.getElementById('gameStatus');
const currentTurnIcon = document.querySelector('.current-turn');
const statusText = document.querySelector('.status-text');
const scoreXEl = document.getElementById('scoreX');
const scoreOEl = document.getElementById('scoreO');
const scoreDrawsEl = document.getElementById('scoreDraws');
const playerXLabel = document.getElementById('playerXLabel');
const playerOLabel = document.getElementById('playerOLabel');
const winOverlay = document.getElementById('winOverlay');
const winIcon = document.getElementById('winIcon');
const winTitle = document.getElementById('winTitle');
const winMessage = document.getElementById('winMessage');
const winLine = document.getElementById('winLine');
const resetBtn = document.getElementById('resetBtn');
const resetScoreBtn = document.getElementById('resetScoreBtn');
const playAgainBtn = document.getElementById('playAgainBtn');
const modeButtons = document.querySelectorAll('.mode-btn');
const difficultyButtons = document.querySelectorAll('.diff-btn');
const difficultySelector = document.getElementById('difficultySelector');
const confirmOverlay = document.getElementById('confirmOverlay');
const confirmYes = document.getElementById('confirmYes');
const confirmNo = document.getElementById('confirmNo');

// Game state
let boardState = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X';
let gameActive = true;
let gameMode = 'bot'; // 'bot' or 'player'
let difficulty = 'medium'; // 'easy', 'medium', 'hard'
let scores = {
    X: parseInt(localStorage.getItem('tttScoreX')) || 0,
    O: parseInt(localStorage.getItem('tttScoreO')) || 0,
    draws: parseInt(localStorage.getItem('tttDraws')) || 0
};

// Winning combinations
const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
];

// Line coordinates for animations
const lineCoords = {
    '0,1,2': { x1: 50, y1: 50, x2: 250, y2: 50 },
    '3,4,5': { x1: 50, y1: 150, x2: 250, y2: 150 },
    '6,7,8': { x1: 50, y1: 250, x2: 250, y2: 250 },
    '0,3,6': { x1: 50, y1: 50, x2: 50, y2: 250 },
    '1,4,7': { x1: 150, y1: 50, x2: 150, y2: 250 },
    '2,5,8': { x1: 250, y1: 50, x2: 250, y2: 250 },
    '0,4,8': { x1: 50, y1: 50, x2: 250, y2: 250 },
    '2,4,6': { x1: 250, y1: 50, x2: 50, y2: 250 }
};

// Initialize
updateScoreboard();
updateLabels();
updateStatus();

// Mode selection
modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameMode = btn.dataset.mode;
        
        if(gameMode === 'bot') {
            difficultySelector.classList.remove('hidden');
        } else {
            difficultySelector.classList.add('hidden');
        }
        
        updateLabels();
        resetGame();
    });
});

// Difficulty selection
difficultyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        difficultyButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.dataset.difficulty;
        resetGame();
    });
});

// Cell click
cells.forEach(cell => {
    cell.addEventListener('click', () => handleCellClick(cell));
});

// Handle cell click
function handleCellClick(cell) {
    const index = parseInt(cell.dataset.index);
    
    if(boardState[index] !== '' || !gameActive) return;
    
    makeMove(index, currentPlayer);
    
    if(gameActive && gameMode === 'bot' && currentPlayer === 'O') {
        setTimeout(botMove, 500);
    }
}

// Make move
function makeMove(index, player) {
    boardState[index] = player;
    cells[index].textContent = player === 'X' ? '❌' : '⭕';
    cells[index].classList.add('taken', player.toLowerCase());
    
    if(checkWin()) {
        endGame('win', player);
    } else if(checkDraw()) {
        endGame('draw');
    } else {
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        updateStatus();
    }
}

// Bot move
function botMove() {
    if(!gameActive) return;
    
    let move;
    
    if(difficulty === 'easy') {
        move = getRandomMove();
    } else if(difficulty === 'medium') {
        // 50% smart, 50% random
        move = Math.random() < 0.5 ? getBestMove() : getRandomMove();
    } else {
        move = getBestMove();
    }
    
    if(move !== -1) {
        makeMove(move, 'O');
    }
}

// Get random move
function getRandomMove() {
    const availableMoves = boardState
        .map((val, idx) => val === '' ? idx : null)
        .filter(val => val !== null);
    
    return availableMoves.length > 0 
        ? availableMoves[Math.floor(Math.random() * availableMoves.length)]
        : -1;
}

// Get best move (Minimax algorithm)
function getBestMove() {
    // Try to win
    for(let i = 0; i < 9; i++) {
        if(boardState[i] === '') {
            boardState[i] = 'O';
            if(checkWinForPlayer('O')) {
                boardState[i] = '';
                return i;
            }
            boardState[i] = '';
        }
    }
    
    // Block player from winning
    for(let i = 0; i < 9; i++) {
        if(boardState[i] === '') {
            boardState[i] = 'X';
            if(checkWinForPlayer('X')) {
                boardState[i] = '';
                return i;
            }
            boardState[i] = '';
        }
    }
    
    // Take center if available
    if(boardState[4] === '') return 4;
    
    // Take corners
    const corners = [0, 2, 6, 8];
    const availableCorners = corners.filter(i => boardState[i] === '');
    if(availableCorners.length > 0) {
        return availableCorners[Math.floor(Math.random() * availableCorners.length)];
    }
    
    // Take any available
    return getRandomMove();
}

// Check win
function checkWin() {
    for(let pattern of winPatterns) {
        const [a, b, c] = pattern;
        if(boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
            highlightWinningCells(pattern);
            return true;
        }
    }
    return false;
}

// Check win for specific player
function checkWinForPlayer(player) {
    for(let pattern of winPatterns) {
        const [a, b, c] = pattern;
        if(boardState[a] === player && boardState[b] === player && boardState[c] === player) {
            return true;
        }
    }
    return false;
}

// Check draw
function checkDraw() {
    return boardState.every(cell => cell !== '');
}

// Highlight winning cells
function highlightWinningCells(pattern) {
    pattern.forEach(index => {
        cells[index].classList.add('winner');
    });
    
    drawWinLine(pattern);
}

// Draw win line
function drawWinLine(pattern) {
    const key = pattern.join(',');
    const coords = lineCoords[key];
    
    if(coords) {
        const line = winLine.querySelector('line');
        line.setAttribute('x1', coords.x1);
        line.setAttribute('y1', coords.y1);
        line.setAttribute('x2', coords.x2);
        line.setAttribute('y2', coords.y2);
        line.style.strokeDasharray = '500';
        line.style.strokeDashoffset = '500';
        
        winLine.classList.add('show');
    }
}

// End game
function endGame(result, winner = null) {
    gameActive = false;
    
    setTimeout(() => {
        if(result === 'win') {
            scores[winner]++;
            saveScores();
            updateScoreboard();
            
            const winnerName = getPlayerName(winner);
            winIcon.textContent = winner === 'X' ? '❌' : '⭕';
            winTitle.textContent = `${winnerName} Wins!`;
            winMessage.textContent = winner === 'X' ? 'Congratulations!' : (gameMode === 'bot' ? 'Better luck next time!' : 'Congratulations!');
        } else {
            scores.draws++;
            saveScores();
            updateScoreboard();
            
            winIcon.textContent = '🤝';
            winTitle.textContent = "It's a Draw!";
            winMessage.textContent = 'Well played by both!';
        }
        
        winOverlay.classList.remove('hidden');
    }, 800);
}

// Get player name
function getPlayerName(player) {
    if(gameMode === 'bot') {
        return player === 'X' ? 'You' : 'Bot';
    }
    return `Player ${player}`;
}

// Update labels
function updateLabels() {
    if(gameMode === 'bot') {
        playerXLabel.textContent = 'You (X)';
        playerOLabel.textContent = 'Bot (O)';
    } else {
        playerXLabel.textContent = 'Player X';
        playerOLabel.textContent = 'Player O';
    }
}

// Update status
function updateStatus() {
    currentTurnIcon.textContent = currentPlayer === 'X' ? '❌' : '⭕';
    
    if(gameMode === 'bot') {
        statusText.textContent = currentPlayer === 'X' ? "Your Turn" : "Bot's Turn";
    } else {
        statusText.textContent = `Player ${currentPlayer}'s Turn`;
    }
    
    // Highlight active player
    const scoreCards = document.querySelectorAll('.score-card');
    scoreCards[0].classList.toggle('active', currentPlayer === 'X');
    scoreCards[2].classList.toggle('active', currentPlayer === 'O');
}

// Update scoreboard
function updateScoreboard() {
    scoreXEl.textContent = scores.X;
    scoreOEl.textContent = scores.O;
    scoreDrawsEl.textContent = scores.draws;
}

// Save scores
function saveScores() {
    localStorage.setItem('tttScoreX', scores.X);
    localStorage.setItem('tttScoreO', scores.O);
    localStorage.setItem('tttDraws', scores.draws);
}

// Reset game
function resetGame() {
    boardState = ['', '', '', '', '', '', '', '', ''];
    currentPlayer = 'X';
    gameActive = true;
    
    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('taken', 'x', 'o', 'winner');
    });
    
    winLine.classList.remove('show');
    winOverlay.classList.add('hidden');
    updateStatus();
}

// Reset scores
function resetScores() {
    scores = { X: 0, O: 0, draws: 0 };
    saveScores();
    updateScoreboard();
}

// Event listeners
resetBtn.addEventListener('click', resetGame);
resetScoreBtn.addEventListener('click', () => {
    confirmOverlay.classList.remove('hidden');
});
playAgainBtn.addEventListener('click', resetGame);

// Confirm dialog
confirmYes.addEventListener('click', () => {
    resetScores();
    confirmOverlay.classList.add('hidden');
});

confirmNo.addEventListener('click', () => {
    confirmOverlay.classList.add('hidden');
});
playAgainBtn.addEventListener('click', resetGame);