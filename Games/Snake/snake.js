// snake.js - VERSIUNE OPTIMIZATĂ PENTRU MOBIL CU LAYOUT VERTICAL
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Elements
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const speedEl = document.getElementById('speed');
const timerEl = document.getElementById('timer');
const startOverlay = document.getElementById('startOverlay');
const gameOverScreen = document.getElementById('gameOverScreen');
const pauseOverlay = document.getElementById('pauseOverlay');
const finalScoreEl = document.getElementById('finalScore');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const pauseBtn = document.getElementById('pauseBtn');
const newGameBtn = document.getElementById('newGameBtn');

// Touch controls elements
const upBtn = document.getElementById('upBtn');
const downBtn = document.getElementById('downBtn');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const pauseTouchBtn = document.getElementById('pauseTouchBtn');
const restartTouchBtn = document.getElementById('restartTouchBtn');

// Game settings
let gridSize;
const tileCount = 20;

// Game state
let snake = [{x: 10, y: 10}];
let dx = 0;
let dy = 0;
let nextDx = 0;
let nextDy = 0;
let food = {x: 15, y: 15};
let score = 0;
let highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
let gameLoop = null;
let speed = 150;
let isPaused = false;
let isGameOver = false;
let isPlaying = false;
let gameLevel = 1;
let gameStartTime = null;
let gameTimer = null;
let elapsedSeconds = 0;

// Effects
let particles = [];
let foodPulse = 0;
let eatAnimation = 0;

// Audio
let audioContext;
let soundEnabled = true;

// Initialize high score
highScoreEl.textContent = highScore;

// Initialize audio
function initAudio() {
    try {
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const savedSound = localStorage.getItem('snakeSoundEnabled');
            soundEnabled = savedSound !== null ? savedSound === 'true' : true;
        } else {
            soundEnabled = false;
        }
    } catch (e) {
        soundEnabled = false;
    }
}

// Play sound
function playSound(type) {
    if (!soundEnabled || !audioContext) return;
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        switch(type) {
            case 'eat':
                oscillator.frequency.value = 523.25;
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.15);
                break;
                
            case 'move':
                oscillator.frequency.value = 220;
                oscillator.type = 'triangle';
                gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.08);
                break;
                
            case 'gameOver':
                oscillator.frequency.value = 174.61;
                oscillator.type = 'sawtooth';
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
                break;
        }
    } catch (e) {
        soundEnabled = false;
    }
}

// Particle System
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 3 + 2;
        this.speedX = Math.random() * 6 - 3;
        this.speedY = Math.random() * 6 - 3;
        this.life = 1;
        this.decay = 0.15;
    }
    
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= this.decay;
        this.size *= 0.9;
    }
    
    draw() {
        if (this.life <= 0) return;
        
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function createEatParticles(x, y) {
    for (let i = 0; i < 8; i++) {
        particles.push(new Particle(
            x * gridSize + gridSize/2,
            y * gridSize + gridSize/2,
            '#ff6b9d'
        ));
    }
    eatAnimation = 1;
    playSound('eat');
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    particles.forEach(particle => particle.draw());
}

// Drawing functions
function drawRect(x, y, color, isHead = false) {
    ctx.fillStyle = color;
    
    if (isHead) {
        ctx.fillRect(x * gridSize + 2, y * gridSize + 2, gridSize - 4, gridSize - 4);
        
        // Eyes
        ctx.fillStyle = '#fff';
        const eyeSize = gridSize / 8;
        ctx.beginPath();
        ctx.arc(x * gridSize + gridSize/3, y * gridSize + gridSize/3, eyeSize, 0, Math.PI * 2);
        ctx.arc(x * gridSize + 2*gridSize/3, y * gridSize + gridSize/3, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(x * gridSize + gridSize/3, y * gridSize + gridSize/3, eyeSize/2, 0, Math.PI * 2);
        ctx.arc(x * gridSize + 2*gridSize/3, y * gridSize + gridSize/3, eyeSize/2, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.fillRect(x * gridSize + 2, y * gridSize + 2, gridSize - 4, gridSize - 4);
        ctx.fillStyle = '#6BCF7F';
        ctx.fillRect(x * gridSize + 4, y * gridSize + 4, gridSize - 8, gridSize - 8);
    }
}

function drawFood() {
    foodPulse += 0.25;
    const pulseSize = Math.sin(foodPulse) * 1.5 + 1;
    
    const gradient = ctx.createRadialGradient(
        food.x * gridSize + gridSize/2,
        food.y * gridSize + gridSize/2,
        0,
        food.x * gridSize + gridSize/2,
        food.y * gridSize + gridSize/2,
        gridSize/2
    );
    gradient.addColorStop(0, '#ff6b9d');
    gradient.addColorStop(1, '#ff4757');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(
        food.x * gridSize + gridSize/2,
        food.y * gridSize + gridSize/2,
        gridSize/2 - pulseSize,
        0,
        Math.PI * 2
    );
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(
        food.x * gridSize + gridSize/2 - 3,
        food.y * gridSize + gridSize/2 - 3,
        gridSize/6,
        0,
        Math.PI * 2
    );
    ctx.fill();
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(122, 93, 74, 0.05)';
    ctx.lineWidth = 1;
    for(let i = 0; i <= tileCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(canvas.width, i * gridSize);
        ctx.stroke();
    }
}

function drawSnake() {
    snake.forEach((seg, i) => {
        drawRect(seg.x, seg.y, i === 0 ? '#2d7a2f' : '#4CAF50', i === 0);
    });
    
    if (eatAnimation > 0) {
        const head = snake[0];
        ctx.fillStyle = `rgba(255, 107, 157, ${eatAnimation})`;
        ctx.beginPath();
        ctx.arc(
            head.x * gridSize + gridSize/2,
            head.y * gridSize + gridSize/2,
            gridSize/2 + eatAnimation * 5,
            0,
            Math.PI * 2
        );
        ctx.fill();
        eatAnimation -= 0.4;
    }
}

function drawBackground() {
    ctx.fillStyle = '#fffbf5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function generateFood() {
    food.x = Math.floor(Math.random() * tileCount);
    food.y = Math.floor(Math.random() * tileCount);
    
    if(snake.some(seg => seg.x === food.x && seg.y === food.y)) {
        generateFood();
    }
}

// Timer functions
function startTimer() {
    elapsedSeconds = 0;
    updateTimer();
    clearInterval(gameTimer);
    gameTimer = setInterval(updateTimer, 1000);
}

function updateTimer() {
    elapsedSeconds++;
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    timerEl.textContent = minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${seconds}s`;
}

function stopTimer() {
    clearInterval(gameTimer);
}

// Level calculation
function calculateLevel() {
    const newLevel = Math.floor(score / 5) + 1;
    
    if (newLevel > gameLevel) {
        gameLevel = newLevel;
        speedEl.textContent = gameLevel;
        speed = Math.max(80, 150 - (gameLevel - 1) * 20);
        clearInterval(gameLoop);
        gameLoop = setInterval(update, speed);
    }
    
    return gameLevel;
}

// XP calculation
function calculateXP(score, level, durationSeconds) {
    if (score === 0) return 0;
    if (!window.currentUserId || !window.isUserLoggedIn) return 0;
    
    const foodXP = score * 2;
    const timeXP = Math.floor(durationSeconds / 60 * 10);
    const levelBonus = level * 3;
    
    return Math.max(10, foodXP + timeXP + levelBonus);
}

// XP Notification
function showXPEarnedNotification(xpAmount) {
    if (!xpAmount || xpAmount <= 0 || !window.isUserLoggedIn) return;
    
    const notification = document.createElement('div');
    notification.className = 'xp-notification';
    notification.innerHTML = `
        <div class="xp-notification-content">
            <span class="xp-icon">⚡</span>
            <span class="xp-text">+${xpAmount} XP Earned!</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Game logic
function update() {
    if(isPaused || !isPlaying) return;
    
    dx = nextDx;
    dy = nextDy;
    
    if(dx === 0 && dy === 0) return;
    
    if (Math.random() > 0.7) {
        playSound('move');
    }
    
    const head = {x: snake[0].x + dx, y: snake[0].y + dy};
    
    // Check collisions
    if(head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        endGame();
        return;
    }
    
    if(snake.some(seg => seg.x === head.x && seg.y === head.y)) {
        endGame();
        return;
    }
    
    snake.unshift(head);
    
    // Check food
    if(head.x === food.x && head.y === food.y) {
        score++;
        scoreEl.textContent = score;
        createEatParticles(food.x, food.y);
        generateFood();
        calculateLevel();
    } else {
        snake.pop();
    }
    
    draw();
}

function draw() {
    drawBackground();
    drawGrid();
    drawFood();
    drawSnake();
    drawParticles();
    updateParticles();
}

function startGame() {
    // Initialize audio
    if (!audioContext) {
        initAudio();
    }
    
    // Reset game state
    snake = [{x: 10, y: 10}];
    dx = 1;
    dy = 0;
    nextDx = 1;
    nextDy = 0;
    score = 0;
    speed = 150;
    gameLevel = 1;
    isPaused = false;
    isGameOver = false;
    isPlaying = true;
    gameStartTime = Date.now();
    particles = [];
    eatAnimation = 0;
    
    // Update UI
    scoreEl.textContent = score;
    speedEl.textContent = gameLevel;
    
    // Hide overlays
    startOverlay.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    
    // Resize canvas
    resizeCanvas();
    
    // Generate food
    generateFood();
    
    // Start game loop
    if(gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(update, speed);
    
    // Start timer
    startTimer();
    
    // Draw initial state
    draw();
}

async function endGame() {
    isPlaying = false;
    isGameOver = true;
    clearInterval(gameLoop);
    stopTimer();
    
    playSound('gameOver');
    
    finalScoreEl.textContent = score;
    gameOverScreen.classList.remove('hidden');
    
    // Save high score
    if(score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        highScoreEl.textContent = highScore;
    }
    
    // Calculate and save XP
    if (gameStartTime && score > 0) {
        const gameDuration = Math.floor((Date.now() - gameStartTime) / 1000);
        const xpEarned = calculateXP(score, gameLevel, gameDuration);
        
        if (xpEarned > 0) {
            showXPEarnedNotification(xpEarned);
            
            // Save to Firebase
            if (window.saveGameToFirebase) {
                await window.saveGameToFirebase(score, xpEarned, gameDuration, gameLevel);
            }
        }
    }
}

function togglePause() {
    if(!isPlaying || isGameOver) return;
    
    isPaused = !isPaused;
    
    if(isPaused) {
        pauseOverlay.classList.remove('hidden');
        pauseBtn.innerHTML = '<span class="btn-icon">▶</span><span class="btn-text">Resume</span>';
        pauseTouchBtn.textContent = '▶';
        stopTimer();
    } else {
        pauseOverlay.classList.add('hidden');
        pauseBtn.innerHTML = '<span class="btn-icon">⏸</span><span class="btn-text">Pause</span>';
        pauseTouchBtn.textContent = '⏸';
        startTimer();
    }
}

// Resize canvas for responsive design
function resizeCanvas() {
    const container = canvas.parentElement;
    const size = Math.min(container.clientWidth - 32, 500);
    
    canvas.width = size;
    canvas.height = size;
    gridSize = Math.floor(size / tileCount);
}

// Touch controls setup
function setupTouchControls() {
    // Direction buttons
    upBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if(dy === 0) { nextDx = 0; nextDy = -1; }
    });
    
    downBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if(dy === 0) { nextDx = 0; nextDy = 1; }
    });
    
    leftBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if(dx === 0) { nextDx = -1; nextDy = 0; }
    });
    
    rightBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if(dx === 0) { nextDx = 1; nextDy = 0; }
    });
    
    // Mouse support for desktop
    upBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if(dy === 0) { nextDx = 0; nextDy = -1; }
    });
    
    downBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if(dy === 0) { nextDx = 0; nextDy = 1; }
    });
    
    leftBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if(dx === 0) { nextDx = -1; nextDy = 0; }
    });
    
    rightBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if(dx === 0) { nextDx = 1; nextDy = 0; }
    });
    
    // Control buttons
    pauseTouchBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        togglePause();
    });
    
    restartTouchBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startGame();
    });
    
    pauseTouchBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        togglePause();
    });
    
    restartTouchBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startGame();
    });
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    
    if(!isPlaying && ['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(key)) {
        startGame();
        return;
    }
    
    if(!isPlaying) return;
    
    if(key === ' ') {
        togglePause();
        return;
    }
    
    if(key === 'arrowup' || key === 'w') {
        if(dy === 0) { nextDx = 0; nextDy = -1; }
    } else if(key === 'arrowdown' || key === 's') {
        if(dy === 0) { nextDx = 0; nextDy = 1; }
    } else if(key === 'arrowleft' || key === 'a') {
        if(dx === 0) { nextDx = -1; nextDy = 0; }
    } else if(key === 'arrowright' || key === 'd') {
        if(dx === 0) { nextDx = 1; nextDy = 0; }
    }
});

// Swipe controls for mobile
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', (e) => {
    if (!isPlaying) {
        startGame();
        return;
    }
    
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
});

canvas.addEventListener('touchmove', (e) => {
    if (!isPlaying) return;
    e.preventDefault();
});

canvas.addEventListener('touchend', (e) => {
    if (!isPlaying) return;
    
    const touch = e.changedTouches[0];
    const touchEndX = touch.clientX;
    const touchEndY = touch.clientY;
    
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    if (Math.abs(diffX) < 30 && Math.abs(diffY) < 30) return;
    
    if (Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal swipe
        if (diffX > 0 && dx === 0) {
            nextDx = 1; nextDy = 0;
        } else if (diffX < 0 && dx === 0) {
            nextDx = -1; nextDy = 0;
        }
    } else {
        // Vertical swipe
        if (diffY > 0 && dy === 0) {
            nextDx = 0; nextDy = 1;
        } else if (diffY < 0 && dy === 0) {
            nextDx = 0; nextDy = -1;
        }
    }
});

// Button event listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
newGameBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);
pauseOverlay.addEventListener('click', togglePause);

// Prevent default touch behavior
document.addEventListener('touchmove', function(e) {
    if(e.target.classList.contains('touch-btn') || e.target === canvas) {
        e.preventDefault();
    }
}, { passive: false });

// Initialize game
initAudio();
setupTouchControls();
resizeCanvas();
draw();

// Handle window resize
window.addEventListener('resize', () => {
    resizeCanvas();
    if (isPlaying) {
        draw();
    }
});

// Auto-save on exit
window.addEventListener('beforeunload', async (e) => {
    if (isPlaying && score > 0 && gameStartTime && window.saveGameToFirebase && window.isUserLoggedIn) {
        const gameDuration = Math.floor((Date.now() - gameStartTime) / 1000);
        const xpEarned = calculateXP(score, gameLevel, gameDuration);
        
        if (xpEarned > 0) {
            await window.saveGameToFirebase(score, xpEarned, gameDuration, gameLevel);
        }
    }
});

// Prevent scrolling with arrow keys
document.addEventListener('keydown', function(e) {
    const gameControlKeys = [
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'w', 'W', 'a', 'A', 's', 'S', 'd', 'D'
    ];
    
    if (gameControlKeys.includes(e.key)) {
        e.preventDefault();
    }
}, false);
