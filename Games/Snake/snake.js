const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Elements
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const speedEl = document.getElementById('speed');
const startOverlay = document.getElementById('startOverlay');
const gameOverScreen = document.getElementById('gameOverScreen');
const pauseOverlay = document.getElementById('pauseOverlay');
const finalScoreEl = document.getElementById('finalScore');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const pauseBtn = document.getElementById('pauseBtn');
const newGameBtn = document.getElementById('newGameBtn');

// Settings
const gridSize = 20;
const tileCount = 20;
canvas.width = canvas.height = gridSize * tileCount;

// State
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

// Effects
let particles = [];
let foodPulse = 0;
let eatAnimation = 0;

// Audio context pentru sunete
let audioContext;
let soundEnabled = true;

// Initialize high score
highScoreEl.textContent = highScore;

// Initialize audio
function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        // Încarcă preferința de sunet
        const savedSound = localStorage.getItem('snakeSoundEnabled');
        if (savedSound !== null) {
            soundEnabled = savedSound === 'true';
        }
    } catch (e) {
        console.log('Audio not supported');
        soundEnabled = false;
    }
}

// Sunet simplu și rapid
function playSound(type) {
    if (!soundEnabled || !audioContext) return;
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        switch(type) {
            case 'eat':
                // Sunet scurt și plăcut pentru mâncare
                oscillator.frequency.value = 523.25; // C5
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.15);
                break;
                
            case 'move':
                // Sunet foarte scurt pentru mișcare
                oscillator.frequency.value = 220; // A3
                oscillator.type = 'triangle';
                gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.08);
                break;
                
            case 'gameOver':
                // Sunet de game over
                oscillator.frequency.value = 174.61; // F3
                oscillator.type = 'sawtooth';
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
                break;
                
            case 'level':
                // Sunet scurt de nivel
                oscillator.frequency.value = 659.25; // E5
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.2);
                break;
        }
    } catch (e) {
        console.log('Sound error:', e);
    }
}

// Particle System rapid
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 3 + 2;
        this.speedX = Math.random() * 6 - 3;
        this.speedY = Math.random() * 6 - 3;
        this.life = 1;
        this.decay = 0.15; // Foarte rapidă
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
    // Particule rapide și puține
    for (let i = 0; i < 8; i++) {
        particles.push(new Particle(
            x * gridSize + gridSize/2,
            y * gridSize + gridSize/2,
            '#ff6b9d'
        ));
    }
    eatAnimation = 1; // Start rapid eat animation
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

// Draw functions
function drawRect(x, y, color, isHead = false) {
    ctx.fillStyle = color;
    
    if (isHead) {
        // Cap cu ochi
        ctx.fillRect(x * gridSize + 2, y * gridSize + 2, gridSize - 4, gridSize - 4);
        
        // Ochi
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
        // Corp simplu
        ctx.fillRect(x * gridSize + 2, y * gridSize + 2, gridSize - 4, gridSize - 4);
        
        // Highlight interior
        ctx.fillStyle = '#6BCF7F';
        ctx.fillRect(x * gridSize + 4, y * gridSize + 4, gridSize - 8, gridSize - 8);
    }
}

function drawFood() {
    // Animatie pulsare rapidă
    foodPulse += 0.25;
    const pulseSize = Math.sin(foodPulse) * 1.5 + 1;
    
    // Mâncare cu gradient
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
    
    // Highlight
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
    
    // Eat animation - rapidă și subtilă
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
        eatAnimation -= 0.4; // Decădere foarte rapidă
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

// Calculează nivelul pe baza scorului
function calculateLevel() {
    const newLevel = Math.floor(score / 5) + 1;
    
    if (newLevel > gameLevel) {
        gameLevel = newLevel;
        speedEl.textContent = gameLevel;
        
        // Mărește viteza (mai rapid la fiecare nivel)
        speed = Math.max(80, 150 - (gameLevel - 1) * 20);
        
        // Sunet scurt de nivel
        playSound('level');
        
        // Doar update UI, fără pop-up
        clearInterval(gameLoop);
        gameLoop = setInterval(update, speed);
    }
    
    return gameLevel;
}

// Calculează XP (doar dacă e logat și scor > 0)
function calculateXP(score, level, durationSeconds) {
    // Dacă scorul este 0, nu primește XP
    if (score === 0) {
        return 0;
    }
    
    if (!window.currentUserId || !window.isUserLoggedIn) {
        return 0;
    }
    
    // XP simplu: 2 XP per mâncare + 10 XP pe minut
    const foodXP = score * 2;
    const timeXP = Math.floor(durationSeconds / 60 * 10);
    const levelBonus = level * 3;
    
    return Math.max(10, foodXP + timeXP + levelBonus);
}

// Creează o notificare temporară pe ecran
function showXPEarnedNotification(xpAmount) {
    // Afișează notificarea doar dacă există XP și utilizatorul e conectat
    if (!xpAmount || xpAmount <= 0 || !window.isUserLoggedIn) return;
    
    const notification = document.createElement('div');
    notification.className = 'xp-notification';
    notification.innerHTML = `
        <div class="xp-notification-content">
            <span class="xp-icon">⚡</span>
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

function update() {
    if(isPaused || !isPlaying) return;
    
    dx = nextDx;
    dy = nextDy;
    
    if(dx === 0 && dy === 0) return;
    
    // Sunet de mișcare (mai rar pentru a nu fi enervant)
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
        
        // Animație rapidă de mâncare
        createEatParticles(food.x, food.y);
        
        generateFood();
        calculateLevel(); // Doar update UI, fără pop-up
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
    // Initializează audio la prima rulare
    if (!audioContext) {
        initAudio();
    }
    
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
    
    scoreEl.textContent = score;
    speedEl.textContent = gameLevel;
    
    startOverlay.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    
    generateFood();
    
    if(gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(update, speed);
    draw();
}

async function endGame() {
    isPlaying = false;
    isGameOver = true;
    clearInterval(gameLoop);
    
    // Sunet de game over
    playSound('gameOver');
    
    finalScoreEl.textContent = score;
    gameOverScreen.classList.remove('hidden');
    
    // Salvează high score pentru toți
    if(score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        highScoreEl.textContent = highScore;
    }
    
    // Calculează și salvează XP doar pentru cei logați și doar dacă scorul > 0
    if (gameStartTime && score > 0) {
        const gameDuration = Math.floor((Date.now() - gameStartTime) / 1000);
        const xpEarned = calculateXP(score, gameLevel, gameDuration);
        
        if (xpEarned > 0) {
            showXPEarnedNotification(xpEarned);
            
            // Salvează în Firebase
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
    } else {
        pauseOverlay.classList.add('hidden');
        pauseBtn.innerHTML = '<span class="btn-icon">⏸</span><span class="btn-text">Pause</span>';
    }
}

// Controls
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

// Buttons
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
newGameBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);
pauseOverlay.addEventListener('click', togglePause);

// Initial draw și audio init
initAudio();
draw();

// Adaugă animațiile CSS
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

// Auto-save doar pentru cei logați și doar dacă scorul > 0
window.addEventListener('beforeunload', async (e) => {
    if (isPlaying && score > 0 && gameStartTime && window.saveGameToFirebase && window.isUserLoggedIn) {
        const gameDuration = Math.floor((Date.now() - gameStartTime) / 1000);
        const xpEarned = calculateXP(score, gameLevel, gameDuration);
        
        if (xpEarned > 0) {
            await window.saveGameToFirebase(score, xpEarned, gameDuration, gameLevel);
        }
    }
});

// Blochează scrolling-ul pentru tastele jocului
document.addEventListener('keydown', function(e) {
    const gameControlKeys = [
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'w', 'W', 'a', 'A', 's', 'S', 'd', 'D'
    ];
    
    if (gameControlKeys.includes(e.key)) {
        e.preventDefault();
    }
}, false);