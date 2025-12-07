// Elements
const cardsGrid = document.getElementById('cardsGrid');
const levelEl = document.getElementById('level');
const timerEl = document.getElementById('timer');
const pairsEl = document.getElementById('pairs');
const levelCompleteOverlay = document.getElementById('levelCompleteOverlay');
const timeUpOverlay = document.getElementById('timeUpOverlay');
const winOverlay = document.getElementById('winOverlay');
const nextLevelEl = document.getElementById('nextLevel');
const finalLevelEl = document.getElementById('finalLevel');
const bestLevelEl = document.getElementById('bestLevel');
const timeBonusEl = document.getElementById('timeBonus');
const recordLevelEl = document.getElementById('recordLevel');
const resetLevelBtn = document.getElementById('resetLevelBtn');
const newGameBtn = document.getElementById('newGameBtn');
const continueBtn = document.getElementById('continueBtn');
const tryAgainBtn = document.getElementById('tryAgainBtn');
const playAgainBtn = document.getElementById('playAgainBtn');
const startBanner = document.getElementById('startBanner');
const startBtn = document.getElementById('startBtn');

// Game state
let currentLevel = 1;
let timeLeft = 0;
let timerInterval = null;
let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let canFlip = false;
let bestLevel = parseInt(localStorage.getItem('memoryBestLevel')) || 0;
let levelStartTime = null;
let gameStartTime = null;
let isGameActive = false;

// Level configurations (time in seconds)
const levels = [
    { pairs: 8, time: 180, emojis: ['🎮', '🎯', '🎨', '🎭', '🎪', '🎸', '🎺', '🎻'] }, // 3 min
    { pairs: 10, time: 210, emojis: ['🎮', '🎯', '🎨', '🎭', '🎪', '🎸', '🎺', '🎻', '🎲', '🎰'] }, // 3.5 min
    { pairs: 12, time: 240, emojis: ['🎮', '🎯', '🎨', '🎭', '🎪', '🎸', '🎺', '🎻', '🎲', '🎰', '🎳', '🏀'] }, // 4 min
    { pairs: 14, time: 270, emojis: ['🎮', '🎯', '🎨', '🎭', '🎪', '🎸', '🎺', '🎻', '🎲', '🎰', '🎳', '🏀', '⚽', '🏈'] }, // 4.5 min
    { pairs: 16, time: 300, emojis: ['🎮', '🎯', '🎨', '🎭', '🎪', '🎸', '🎺', '🎻', '🎲', '🎰', '🎳', '🏀', '⚽', '🏈', '🎾', '🏐'] } // 5 min
];

// Initialize game
function initGame() {
    currentLevel = 1;
    isGameActive = false;
    gameStartTime = Date.now();
    recordLevelEl.textContent = bestLevel;
    initLevel();
}

// Initialize level
function initLevel() {
    cards = [];
    flippedCards = [];
    matchedPairs = 0;
    canFlip = false; // Blocat până apasă Start
    
    const levelConfig = levels[currentLevel - 1];
    timeLeft = levelConfig.time;
    
    const cardPairs = [...levelConfig.emojis, ...levelConfig.emojis];
    cards = shuffle(cardPairs);
    
    updateUI();
    updateLevelDots();
    renderCards();
    updateGridColumns();
    
    // Show start banner
    startBanner.classList.remove('hidden');
}

// Reset current level
function resetLevel() {
    stopTimer();
    initLevel();
}

// Start timer
function startTimer() {
    stopTimer();
    levelStartTime = Date.now();
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        updateTimerWarning();
        
        if(timeLeft <= 0) {
            timeUp();
        }
    }, 1000);
}

// Stop timer
function stopTimer() {
    if(timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Update timer display
function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Update timer warning colors
function updateTimerWarning() {
    const timerCard = document.querySelector('.timer-card');
    timerCard.classList.remove('warning', 'danger');
    
    if(timeLeft <= 30) {
        timerCard.classList.add('danger');
    } else if(timeLeft <= 60) {
        timerCard.classList.add('warning');
    }
}

// Update UI
function updateUI() {
    levelEl.textContent = currentLevel;
    const levelConfig = levels[currentLevel - 1];
    pairsEl.textContent = `${matchedPairs}/${levelConfig.pairs}`;
    updateTimerDisplay();
}

// Update level dots
function updateLevelDots() {
    const dots = document.querySelectorAll('.level-dot');
    dots.forEach((dot, index) => {
        dot.classList.remove('active', 'completed');
        if(index + 1 < currentLevel) {
            dot.classList.add('completed');
        } else if(index + 1 === currentLevel) {
            dot.classList.add('active');
        }
    });
}

// Update grid columns based on level
function updateGridColumns() {
    const levelConfig = levels[currentLevel - 1];
    if(levelConfig.pairs <= 8) {
        cardsGrid.style.gridTemplateColumns = 'repeat(4, 1fr)';
    } else if(levelConfig.pairs <= 12) {
        cardsGrid.style.gridTemplateColumns = 'repeat(5, 1fr)';
    } else {
        cardsGrid.style.gridTemplateColumns = 'repeat(6, 1fr)';
    }
}

// Shuffle array
function shuffle(array) {
    const shuffled = [...array];
    for(let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Render cards
function renderCards() {
    cardsGrid.innerHTML = '';
    cards.forEach((emoji, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.index = index;
        card.innerHTML = `
            <div class="card-content card-back">❓</div>
            <div class="card-content card-front">${emoji}</div>
        `;
        card.addEventListener('click', () => flipCard(card, index));
        cardsGrid.appendChild(card);
    });
}

// Flip card
function flipCard(card, index) {
    if(!canFlip || card.classList.contains('flipped') || card.classList.contains('matched')) {
        return;
    }
    
    card.classList.add('flipped');
    flippedCards.push({ card, index });
    
    if(flippedCards.length === 2) {
        canFlip = false;
        setTimeout(checkMatch, 600);
    }
}

// Check if cards match
function checkMatch() {
    const [first, second] = flippedCards;
    
    if(cards[first.index] === cards[second.index]) {
        // Match found
        first.card.classList.add('matched');
        second.card.classList.add('matched');
        matchedPairs++;
        updateUI();
        
        const levelConfig = levels[currentLevel - 1];
        if(matchedPairs === levelConfig.pairs) {
            setTimeout(levelComplete, 500);
        }
    } else {
        // No match
        first.card.classList.add('wrong');
        second.card.classList.add('wrong');
        
        setTimeout(() => {
            first.card.classList.remove('flipped', 'wrong');
            second.card.classList.remove('flipped', 'wrong');
        }, 500);
    }
    
    flippedCards = [];
    canFlip = true;
}

// Calculează XP pentru nivelul completat
function calculateXPForLevel(level, timeBonusSeconds) {
    // Verifică dacă utilizatorul este logat
    if (!window.currentUserId || !window.isUserLoggedIn) {
        return 0;
    }
    
    // XP per nivel: level * 15
    let xp = level * 15;
    
    // Bonus pentru perechi găsite rapid: +1 XP per 10 secunde rămase
    const timeBonusXP = Math.floor(timeBonusSeconds / 10);
    xp += timeBonusXP;
    
    // Bonus pentru level înalt: +5 XP extra pentru level 3+, +10 pentru level 5
    if (level >= 5) {
        xp += 10;
    } else if (level >= 3) {
        xp += 5;
    }
    
    return Math.max(10, xp); // Minimum 10 XP per nivel
}

// Calculează XP total pentru joc (time up sau win)
function calculateTotalXP(levelReached, totalTimeSeconds) {
    if (!window.currentUserId || !window.isUserLoggedIn) {
        return 0;
    }
    
    // XP pentru fiecare nivel completat
    let totalXP = 0;
    for (let i = 1; i <= levelReached; i++) {
        totalXP += (i * 15);
    }
    
    // Bonus pentru timp jucat: +1 XP per minut
    const timeBonusXP = Math.floor(totalTimeSeconds / 60);
    totalXP += timeBonusXP;
    
    return Math.max(10, totalXP);
}

// Afișează notificare XP
function showXPEarnedNotification(xpAmount) {
    if (!xpAmount || xpAmount <= 0) return;
    
    const notification = document.createElement('div');
    notification.className = 'xp-notification';
    notification.innerHTML = `
        <div class="xp-notification-content">
            <span class="xp-icon">⭐</span>
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

// Level complete
function levelComplete() {
    stopTimer();
    
    const levelTime = Math.floor((Date.now() - levelStartTime) / 1000);
    const xpEarned = calculateXPForLevel(currentLevel, timeLeft);
    
    // Update best record
    if(currentLevel > bestLevel) {
        bestLevel = currentLevel;
        localStorage.setItem('memoryBestLevel', bestLevel);
        recordLevelEl.textContent = bestLevel;
        bestLevelEl.textContent = bestLevel;
    }
    
    // Salvează în Firebase
    if (xpEarned > 0 && window.saveMemoryGameProgress) {
        const totalGameTime = Math.floor((Date.now() - gameStartTime) / 1000);
        window.saveMemoryGameProgress(currentLevel, xpEarned, totalGameTime);
        showXPEarnedNotification(xpEarned);
    }
    
    if(currentLevel === 5) {
        winGame();
    } else {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timeBonusEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        nextLevelEl.textContent = currentLevel + 1;
        levelCompleteOverlay.classList.remove('hidden');
    }
}

// Next level
function nextLevel() {
    currentLevel++;
    levelCompleteOverlay.classList.add('hidden');
    initLevel();
}

// Time's up
function timeUp() {
    stopTimer();
    
    // Calculează XP pentru jocul complet
    const totalGameTime = Math.floor((Date.now() - gameStartTime) / 1000);
    const totalXP = calculateTotalXP(currentLevel, totalGameTime);
    
    // Update best record
    if(currentLevel > bestLevel) {
        bestLevel = currentLevel;
        localStorage.setItem('memoryBestLevel', bestLevel);
        recordLevelEl.textContent = bestLevel;
    }
    
    // Salvează în Firebase
    if (totalXP > 0 && window.saveMemoryGameProgress) {
        window.saveMemoryGameProgress(currentLevel, totalXP, totalGameTime);
        showXPEarnedNotification(totalXP);
    }
    
    finalLevelEl.textContent = currentLevel;
    bestLevelEl.textContent = bestLevel;
    timeUpOverlay.classList.remove('hidden');
}

// Win game
function winGame() {
    const totalGameTime = Math.floor((Date.now() - gameStartTime) / 1000);
    const totalXP = calculateTotalXP(5, totalGameTime);
    
    // Update best to 5 if won
    if(bestLevel < 5) {
        bestLevel = 5;
        localStorage.setItem('memoryBestLevel', bestLevel);
        recordLevelEl.textContent = bestLevel;
    }
    
    // Salvează în Firebase
    if (totalXP > 0 && window.saveMemoryGameProgress) {
        window.saveMemoryGameProgress(5, totalXP, totalGameTime);
        showXPEarnedNotification(totalXP);
    }
    
    winOverlay.classList.remove('hidden');
}

// Event listeners
resetLevelBtn.addEventListener('click', resetLevel);
newGameBtn.addEventListener('click', () => {
    stopTimer();
    initGame();
});
continueBtn.addEventListener('click', nextLevel);
tryAgainBtn.addEventListener('click', () => {
    timeUpOverlay.classList.add('hidden');
    initGame();
});
playAgainBtn.addEventListener('click', () => {
    winOverlay.classList.add('hidden');
    initGame();
});

// Start button
startBtn.addEventListener('click', () => {
    startBanner.classList.add('hidden');
    canFlip = true;
    isGameActive = true;
    startTimer();
});

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

// Start game
initGame();