// Sudoku Game State
let board = [];
let solution = [];
let selectedCell = null;
let mistakes = 0;
let maxMistakes = 3;
let timer = 0;
let timerInterval = null;
let notesMode = false;
let moveHistory = [];
let difficulty = 'medium';
let gameStarted = false;

// Difficulty settings (cells to remove)
const difficultyLevels = {
    easy: 35,
    medium: 45,
    hard: 55
};

// Initialize game
document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
    setupEventListeners();
});

// Setup all event listeners
function setupEventListeners() {
    // Start button
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            document.getElementById('startBanner').classList.add('hidden');
            gameStarted = true;
            startTimer();
        });
    }

    // Difficulty buttons
    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            difficulty = btn.dataset.difficulty;
            document.getElementById('difficultyLabel').textContent = 
                difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
            initializeGame();
        });
    });

    // Number pad buttons
    document.querySelectorAll('.num-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const num = parseInt(btn.dataset.num);
            if (selectedCell && !selectedCell.classList.contains('given')) {
                if (num === 0) {
                    clearCell(selectedCell);
                } else {
                    placeNumber(selectedCell, num);
                }
            }
        });
    });

    // Control buttons
    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('hintBtn').addEventListener('click', giveHint);
    document.getElementById('notesBtn').addEventListener('click', toggleNotesMode);
    document.getElementById('newGameBtn').addEventListener('click', initializeGame);
    document.getElementById('playAgainBtn').addEventListener('click', () => {
        document.getElementById('winOverlay').classList.add('hidden');
        initializeGame();
    });
    document.getElementById('tryAgainBtn').addEventListener('click', () => {
        document.getElementById('gameOverOverlay').classList.add('hidden');
        initializeGame();
    });
}

// Initialize a new game
function initializeGame() {
    // Reset state
    mistakes = 0;
    timer = 0;
    notesMode = false;
    moveHistory = [];
    selectedCell = null;
    gameStarted = false;
    
    // Clear timer
    if (timerInterval) clearInterval(timerInterval);
    
    // Generate puzzle
    solution = generateCompleteSudoku();
    board = JSON.parse(JSON.stringify(solution)); // Deep copy
    removeNumbers(difficultyLevels[difficulty]);
    
    // Render board
    renderBoard();
    updateStats();
    
    // Show start banner
    const startBanner = document.getElementById('startBanner');
    if (startBanner) {
        startBanner.classList.remove('hidden');
    }
    
    // Update notes button
    document.getElementById('notesBtn').classList.remove('active');
}

// Start timer
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        timer++;
        updateTimer();
    }, 1000);
}

// Generate a complete valid Sudoku solution
function generateCompleteSudoku() {
    const grid = Array(9).fill(0).map(() => Array(9).fill(0));
    fillGrid(grid);
    return grid;
}

// Fill grid using backtracking
function fillGrid(grid) {
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (grid[row][col] === 0) {
                // Shuffle numbers for randomness
                shuffleArray(numbers);
                
                for (let num of numbers) {
                    if (isValidPlacement(grid, row, col, num)) {
                        grid[row][col] = num;
                        
                        if (fillGrid(grid)) {
                            return true;
                        }
                        
                        grid[row][col] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

// Check if number placement is valid
function isValidPlacement(grid, row, col, num) {
    // Check row
    for (let c = 0; c < 9; c++) {
        if (grid[row][c] === num) return false;
    }
    
    // Check column
    for (let r = 0; r < 9; r++) {
        if (grid[r][col] === num) return false;
    }
    
    // Check 3x3 box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
        for (let c = boxCol; c < boxCol + 3; c++) {
            if (grid[r][c] === num) return false;
        }
    }
    
    return true;
}

// Remove numbers from board based on difficulty
function removeNumbers(count) {
    let removed = 0;
    const attempts = [];
    
    while (removed < count) {
        const row = Math.floor(Math.random() * 9);
        const col = Math.floor(Math.random() * 9);
        const key = `${row}-${col}`;
        
        if (!attempts.includes(key) && board[row][col] !== 0) {
            board[row][col] = 0;
            attempts.push(key);
            removed++;
        }
    }
}

// Render the board
function renderBoard() {
    const grid = document.getElementById('sudokuGrid');
    grid.innerHTML = '';
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            const value = board[row][col];
            if (value !== 0) {
                cell.textContent = value;
                if (solution[row][col] === value && isOriginalCell(row, col)) {
                    cell.classList.add('given');
                }
            }
            
            cell.addEventListener('click', () => selectCell(cell));
            grid.appendChild(cell);
        }
    }
}

// Check if cell is original (given)
function isOriginalCell(row, col) {
    // A cell is original if it was filled from the start
    const cells = document.querySelectorAll('.cell');
    const index = row * 9 + col;
    return cells[index]?.classList.contains('given') || 
           (solution[row][col] !== 0 && board[row][col] === solution[row][col]);
}

// Select a cell
function selectCell(cell) {
    // Remove previous selection
    document.querySelectorAll('.cell').forEach(c => {
        c.classList.remove('selected', 'highlight');
    });
    
    if (cell.classList.contains('given')) return;
    
    selectedCell = cell;
    cell.classList.add('selected');
    
    // Highlight same numbers and related cells
    const value = cell.textContent;
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    
    document.querySelectorAll('.cell').forEach(c => {
        const cRow = parseInt(c.dataset.row);
        const cCol = parseInt(c.dataset.col);
        
        // Highlight same row, column, or box
        if (cRow === row || cCol === col || 
            (Math.floor(cRow / 3) === Math.floor(row / 3) && 
             Math.floor(cCol / 3) === Math.floor(col / 3))) {
            c.classList.add('highlight');
        }
        
        // Highlight same numbers
        if (value && c.textContent === value) {
            c.classList.add('highlight');
        }
    });
}

// Place a number in selected cell
function placeNumber(cell, num) {
    if (!gameStarted) return; // Don't allow placing numbers before game starts
    
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    const previousValue = board[row][col];
    
    if (notesMode) {
        // Toggle note
        toggleNote(cell, num);
        return;
    }
    
    // Save move for undo
    moveHistory.push({
        row,
        col,
        previousValue,
        newValue: num
    });
    
    // Clear notes if any
    const notesDiv = cell.querySelector('.notes');
    if (notesDiv) notesDiv.remove();
    
    // Update board
    board[row][col] = num;
    cell.textContent = num;
    
    // Check if correct
    if (solution[row][col] === num) {
        cell.classList.add('correct');
        setTimeout(() => cell.classList.remove('correct'), 300);
        
        // Check if puzzle is complete
        if (isPuzzleComplete()) {
            winGame();
        }
    } else {
        cell.classList.add('error');
        mistakes++;
        updateStats();
        
        setTimeout(() => {
            cell.classList.remove('error');
            cell.textContent = '';
            board[row][col] = 0;
        }, 500);
        
        if (mistakes >= maxMistakes) {
            gameOver();
        }
    }
}

// Clear a cell
function clearCell(cell) {
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    const previousValue = board[row][col];
    
    if (previousValue === 0 && !cell.querySelector('.notes')) return;
    
    moveHistory.push({
        row,
        col,
        previousValue,
        newValue: 0
    });
    
    board[row][col] = 0;
    cell.textContent = '';
    const notesDiv = cell.querySelector('.notes');
    if (notesDiv) notesDiv.remove();
}

// Toggle note in cell
function toggleNote(cell, num) {
    let notesDiv = cell.querySelector('.notes');
    
    if (!notesDiv) {
        notesDiv = document.createElement('div');
        notesDiv.className = 'notes';
        for (let i = 1; i <= 9; i++) {
            const span = document.createElement('span');
            span.dataset.note = i;
            notesDiv.appendChild(span);
        }
        cell.textContent = '';
        cell.appendChild(notesDiv);
    }
    
    const noteSpan = notesDiv.querySelector(`[data-note="${num}"]`);
    if (noteSpan.textContent) {
        noteSpan.textContent = '';
    } else {
        noteSpan.textContent = num;
    }
}

// Toggle notes mode
function toggleNotesMode() {
    notesMode = !notesMode;
    const btn = document.getElementById('notesBtn');
    btn.classList.toggle('active');
}

// Undo last move
function undo() {
    if (moveHistory.length === 0) return;
    
    const lastMove = moveHistory.pop();
    const { row, col, previousValue } = lastMove;
    
    board[row][col] = previousValue;
    const cells = document.querySelectorAll('.cell');
    const cell = cells[row * 9 + col];
    
    const notesDiv = cell.querySelector('.notes');
    if (notesDiv) notesDiv.remove();
    
    if (previousValue === 0) {
        cell.textContent = '';
    } else {
        cell.textContent = previousValue;
    }
}

// Give a hint
function giveHint() {
    const emptyCells = [];
    
    document.querySelectorAll('.cell').forEach(cell => {
        if (!cell.classList.contains('given') && 
            cell.textContent === '' && 
            !cell.querySelector('.notes')) {
            emptyCells.push(cell);
        }
    });
    
    if (emptyCells.length === 0) return;
    
    // Pick random empty cell
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const row = parseInt(randomCell.dataset.row);
    const col = parseInt(randomCell.dataset.col);
    
    // Fill with correct answer
    board[row][col] = solution[row][col];
    randomCell.textContent = solution[row][col];
    randomCell.classList.add('given');
    randomCell.classList.add('correct');
    
    setTimeout(() => randomCell.classList.remove('correct'), 500);
    
    if (isPuzzleComplete()) {
        winGame();
    }
}

// Check if puzzle is complete
function isPuzzleComplete() {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (board[row][col] === 0 || board[row][col] !== solution[row][col]) {
                return false;
            }
        }
    }
    return true;
}

// Win game
function winGame() {
    clearInterval(timerInterval);
    document.getElementById('finalTime').textContent = formatTime(timer);
    document.getElementById('finalMistakes').textContent = mistakes;
    document.getElementById('winOverlay').classList.remove('hidden');
}

// Game over
function gameOver() {
    clearInterval(timerInterval);
    document.getElementById('gameOverOverlay').classList.remove('hidden');
}

// Update statistics display
function updateStats() {
    document.getElementById('mistakes').textContent = `${mistakes}/${maxMistakes}`;
}

// Update timer display
function updateTimer() {
    document.getElementById('timer').textContent = formatTime(timer);
}

// Format time as M:SS
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Shuffle array utility
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}