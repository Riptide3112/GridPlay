const gameBoard = document.getElementById('gameBoard');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const timerEl = document.getElementById('timer');
const startOverlay = document.getElementById('startOverlay');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreEl = document.getElementById('finalScore');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const resetBtn = document.getElementById('resetBtn');
const newGameBtn = document.getElementById('newGameBtn');

// Game state
let score = 0;
let highScore = parseInt(localStorage.getItem('colormatchHighScore')) || 0;
let timeLeft = 60;
let gameTimer = null;
let isPlaying = false;
let isGameOver = false;
let gameStartTime = null;
let currentLevel = 1;
let totalBalls = 0;
let matchedBalls = 0;
let levelXP = 0; // XP acumulat în nivelul curent
let maxBallsPerContainer = 0; // Se calculează dinamic

// Colors
const colors = {
    red: '#ff6b6b',
    blue: '#4d96ff',
    green: '#6bcf7f',
    yellow: '#ffd93d',
    purple: '#9d65c9'
};

// Game configuration
let gameConfig = {
    containers: [],
    ballsPerColor: 3, // Start with 3 balls per color
    timePerLevel: 60, // 60 seconds per level
    totalColors: 5    // 5 colors: red, blue, green, yellow, purple
};

// Initialize high score
highScoreEl.textContent = highScore;

// Calculate maximum balls that can fit in a container
function calculateMaxBallsPerContainer() {
    // Un container are aproximativ 120px înălțime (din CSS)
    // O bilă în container are 40px + 5px margin = 45px pe rând
    // În container încap maxim 2 bile pe rând (120px / 45px ≈ 2.66)
    
    // Container width aproximativ 180px
    // Bilele pe lățime: 180px / 45px ≈ 4 bile
    
    // Total maxim: 2 rânduri × 4 bile = 8 bile pe container
    return 8; // Max 8 bile per container fără overflow
}

// Initialize game board
function createGameBoard() {
    gameBoard.innerHTML = '';
    gameConfig.containers = [];
    matchedBalls = 0;
    levelXP = 0; // Reset XP pentru noul nivel
    
    // Calculate total balls for current level
    totalBalls = gameConfig.ballsPerColor * gameConfig.totalColors;
    
    // Create containers for each color
    Object.keys(colors).forEach((color, index) => {
        const containerEl = document.createElement('div');
        containerEl.className = 'color-container';
        containerEl.dataset.color = color;
        containerEl.dataset.id = index;
        containerEl.style.borderColor = colors[color];
        
        const header = document.createElement('div');
        header.className = 'container-header';
        header.innerHTML = `
            <span class="container-color" style="background-color: ${colors[color]}"></span>
            <span class="container-count">0/${gameConfig.ballsPerColor}</span>
        `;
        
        const ballsContainer = document.createElement('div');
        ballsContainer.className = 'balls-container';
        ballsContainer.dataset.containerId = index;
        
        containerEl.appendChild(header);
        containerEl.appendChild(ballsContainer);
        gameBoard.appendChild(containerEl);
        
        gameConfig.containers.push({
            id: index,
            color: color,
            correctBalls: gameConfig.ballsPerColor,
            currentBalls: 0,
            element: containerEl,
            ballsContainer: ballsContainer
        });
    });
}

// Create draggable balls
function createBalls() {
    // Clear existing balls
    document.querySelectorAll('.draggable-ball').forEach(ball => ball.remove());
    
    // Create balls for each color
    Object.keys(colors).forEach(color => {
        for (let i = 0; i < gameConfig.ballsPerColor; i++) {
            createDraggableBall(color);
        }
    });
}

function createDraggableBall(color) {
    const ball = document.createElement('div');
    ball.className = 'draggable-ball';
    ball.dataset.color = color;
    ball.style.backgroundColor = colors[color];
    
    // Random position on the game board
    const containerWidth = gameBoard.offsetWidth;
    const containerHeight = gameBoard.offsetHeight;
    const ballSize = 60; // Approximate ball size
    
    let x, y;
    let attempts = 0;
    
    do {
        x = Math.random() * (containerWidth - ballSize);
        y = Math.random() * (containerHeight - ballSize);
        attempts++;
    } while (isOverlapping(x, y, ballSize) && attempts < 100);
    
    ball.style.left = `${x}px`;
    ball.style.top = `${y}px`;
    
    // Make draggable
    ball.draggable = true;
    
    ball.addEventListener('dragstart', handleDragStart);
    
    gameBoard.appendChild(ball);
    return ball;
}

// Check if ball position overlaps with other balls
function isOverlapping(x, y, size) {
    const balls = document.querySelectorAll('.draggable-ball');
    for (const ball of balls) {
        const rect = ball.getBoundingClientRect();
        const ballX = parseInt(ball.style.left) || 0;
        const ballY = parseInt(ball.style.top) || 0;
        
        // Check if circles overlap (simplified)
        const distance = Math.sqrt(Math.pow(x - ballX, 2) + Math.pow(y - ballY, 2));
        if (distance < size) {
            return true;
        }
    }
    return false;
}

// Check if containers can hold more balls
function canContainersHoldMoreBalls() {
    // Calculate max balls per container based on container size
    maxBallsPerContainer = calculateMaxBallsPerContainer();
    
    // Check if next level would exceed container capacity
    if (gameConfig.ballsPerColor + 1 > maxBallsPerContainer) {
        return false;
    }
    
    return true;
}

// Drag and drop functions
let draggedBall = null;

function handleDragStart(e) {
    if (!isPlaying) return;
    draggedBall = this;
    e.dataTransfer.setData('text/plain', this.dataset.color);
    this.classList.add('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    if (!draggedBall) return;
    
    const container = e.target.closest('.color-container');
    if (container) {
        container.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    const container = e.target.closest('.color-container');
    if (container) {
        container.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    if (!draggedBall || !isPlaying) return;
    
    const container = e.target.closest('.color-container');
    if (container) {
        container.classList.remove('drag-over');
        
        const containerId = parseInt(container.dataset.id);
        const containerColor = container.dataset.color;
        const ballColor = draggedBall.dataset.color;
        
        const containerObj = gameConfig.containers.find(c => c.id === containerId);
        
        if (ballColor === containerColor && containerObj.currentBalls < containerObj.correctBalls) {
            // Correct match
            addBallToContainer(container, draggedBall);
            containerObj.currentBalls++;
            updateContainerCount(container, containerObj);
            
            // Update score (2 XP per ball)
            score += 2;
            levelXP += 2; // Adaugă XP pentru nivel
            scoreEl.textContent = score;
            
            matchedBalls++;
            
            // Check if level is complete
            if (matchedBalls === totalBalls) {
                completeLevel();
            }
            
            // Play success sound
            playSuccessSound();
        } else {
            // Wrong match
            playErrorSound();
            draggedBall.classList.add('shake');
            setTimeout(() => {
                draggedBall.classList.remove('shake');
            }, 500);
        }
    }
    
    draggedBall.classList.remove('dragging');
    draggedBall = null;
}

function addBallToContainer(container, ball) {
    const ballsContainer = container.querySelector('.balls-container');
    const ballClone = ball.cloneNode(true);
    ballClone.className = 'container-ball';
    ballClone.style.position = 'relative';
    ballClone.style.left = '0';
    ballClone.style.top = '0';
    ballClone.style.width = '40px';
    ballClone.style.height = '40px';
    ballClone.style.margin = '2px';
    ballClone.draggable = false;
    ballsContainer.appendChild(ballClone);
    
    // Animate the ball into container
    ballClone.style.animation = 'dropIn 0.3s ease';
    
    ball.remove();
}

function updateContainerCount(container, containerObj) {
    const countEl = container.querySelector('.container-count');
    countEl.textContent = `${containerObj.currentBalls}/${containerObj.correctBalls}`;
    
    // Visual feedback when container is full
    if (containerObj.currentBalls === containerObj.correctBalls) {
        container.classList.add('completed');
    }
}

// Game functions
function startGame() {
    // Reset game state
    score = 0;
    currentLevel = 1;
    gameConfig.ballsPerColor = 3; // Start with 3 balls
    gameConfig.timePerLevel = 60; // Reset to 60 seconds
    timeLeft = gameConfig.timePerLevel;
    
    isPlaying = true;
    isGameOver = false;
    gameStartTime = Date.now();
    
    scoreEl.textContent = score;
    timerEl.textContent = timeLeft;
    timerEl.style.color = '#7a5d4a';
    timerEl.classList.remove('pulse');
    
    startOverlay.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    
    // Create game elements
    createGameBoard();
    createBalls();
    
    // Set up drag and drop events
    gameBoard.addEventListener('dragover', handleDragOver);
    gameBoard.addEventListener('dragleave', handleDragLeave);
    gameBoard.addEventListener('drop', handleDrop);
    
    // Start timer
    clearInterval(gameTimer);
    gameTimer = setInterval(updateTimer, 1000);
}

function updateTimer() {
    if (!isPlaying) return;
    
    timeLeft--;
    timerEl.textContent = timeLeft;
    
    // Visual feedback for low time
    if (timeLeft <= 10) {
        timerEl.style.color = '#ff6b6b';
        timerEl.classList.add('pulse');
        
        if (timeLeft <= 5) {
            playTickSound();
        }
    }
    
    // Game over if time runs out
    if (timeLeft <= 0) {
        endGame();
    }
}

function completeLevel() {
    // Calculate time bonus points for completing level
    const timeBonusPoints = Math.floor(timeLeft * 0.5);
    score += timeBonusPoints;
    scoreEl.textContent = score;
    
    // Check if containers can hold more balls for next level
    if (!canContainersHoldMoreBalls()) {
        // Game completed - show congratulations (ultimul nivel)
        gameCompleted();
        return;
    }
    
    // Calculate XP for this level (doar pentru cei conectați)
    let levelTotalXP = 0;
    if (window.isUserLoggedIn) {
        const timeXP = Math.floor((gameConfig.timePerLevel - timeLeft) / 60 * 10); // 10 XP pe minut jucat
        levelTotalXP = levelXP + timeXP;
    }
    
    // Show level complete notification (cu XP doar dacă e conectat)
    showLevelCompleteNotification(currentLevel, levelTotalXP, timeBonusPoints);
    
    // Save XP acumulat pentru acest nivel (doar dacă e conectat)
    if (window.isUserLoggedIn && levelTotalXP > 0) {
        saveLevelXP(levelTotalXP);
    }
    
    // Move to next level
    currentLevel++;
    
    // Add 1 more ball per color
    gameConfig.ballsPerColor++;
    
    // Add 5 more seconds for next level
    gameConfig.timePerLevel += 5;
    timeLeft = gameConfig.timePerLevel;
    timerEl.textContent = timeLeft;
    timerEl.style.color = '#7a5d4a';
    timerEl.classList.remove('pulse');
    
    // Reset containers and create new balls
    createGameBoard();
    createBalls();
    
    // Reset drag events
    gameBoard.removeEventListener('dragover', handleDragOver);
    gameBoard.removeEventListener('dragleave', handleDragLeave);
    gameBoard.removeEventListener('drop', handleDrop);
    
    gameBoard.addEventListener('dragover', handleDragOver);
    gameBoard.addEventListener('dragleave', handleDragLeave);
    gameBoard.addEventListener('drop', handleDrop);
}

function gameCompleted() {
    isPlaying = false;
    clearInterval(gameTimer);
    
    // Calculate final XP (doar pentru cei conectați)
    let finalXP = 0;
    let bonusXP = 0;
    
    if (window.isUserLoggedIn) {
        // XP din bilele potrivite + XP din timp + 100 XP bonus
        const gameDuration = Math.floor((Date.now() - gameStartTime) / 1000);
        const minutesPlayed = gameDuration / 60;
        const xpFromBalls = matchedBalls * 2;
        const xpFromTime = Math.floor(minutesPlayed * 10);
        bonusXP = 100; // Bonus pentru completarea jocului
        finalXP = xpFromBalls + xpFromTime + bonusXP;
    }
    
    // Show game completed congratulations
    showGameCompletedNotification(score, finalXP, bonusXP);
    
    // Save final XP (doar dacă e conectat)
    if (window.isUserLoggedIn && finalXP > 0) {
        saveGameCompletedXP(finalXP, bonusXP);
    }
    
    // Set game over pentru a putea începe un joc nou
    setTimeout(() => {
        isGameOver = true;
        gameOverScreen.classList.remove('hidden');
        finalScoreEl.textContent = score;
    }, 4000); // După ce dispare notificarea de congratulations
}

function showLevelCompleteNotification(level, xpEarned, timeBonus) {
    const notification = document.createElement('div');
    
    // Construim conținutul notificării în funcție de login
    let xpContent = '';
    if (window.isUserLoggedIn && xpEarned > 0) {
        xpContent = `
            <div class="xp-earned">
                <span class="xp-icon">⚡</span>
                <span class="xp-text">+${xpEarned} XP Earned!</span>
            </div>
        `;
    }
    
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">🎉</div>
            <h3>Level ${level} Complete!</h3>
            <p>Time Bonus: +${timeBonus} points</p>
            ${xpContent}
            <p class="next-level">Next level: ${gameConfig.ballsPerColor + 1} balls per color</p>
            <p class="extra-time">Extra time: +5 seconds</p>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #fff9f0 0%, #f5e8dc 100%);
        color: #5a4a3a;
        padding: 2rem;
        border-radius: 20px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        z-index: 2000;
        animation: fadeIn 0.5s ease-out;
        min-width: 300px;
        max-width: 400px;
        border: 4px solid #ff9a76;
    `;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'fadeOut 0.5s ease-out forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }
    }, 3000);
}

function showGameCompletedNotification(finalScore, finalXP, bonusXP) {
    const notification = document.createElement('div');
    
    // Construim conținutul în funcție de login
    let xpContent = '';
    if (window.isUserLoggedIn && finalXP > 0) {
        xpContent = `
            <div class="xp-earned">
                <span class="xp-icon">🏆</span>
                <span class="xp-text">Game Completed!</span>
            </div>
            <div class="xp-details">
                <p>Total XP Earned: <strong>${finalXP}</strong></p>
                <p>Completion Bonus: <strong>+${bonusXP} XP</strong></p>
            </div>
        `;
    } else {
        xpContent = `
            <div class="xp-earned">
                <span class="xp-icon">🏆</span>
                <span class="xp-text">Game Completed!</span>
            </div>
            <p>Log in to earn XP and track your progress!</p>
        `;
    }
    
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">🎊</div>
            <h3>Congratulations!</h3>
            <p>You've reached the maximum level!</p>
            <p>Containers are now full with ${gameConfig.ballsPerColor} balls each.</p>
            <p class="final-score">Final Score: <strong>${finalScore}</strong></p>
            ${xpContent}
            <div class="celebration-text">
                <p>🎉 Amazing job! 🎉</p>
            </div>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #fff9f0 0%, #f5e8dc 100%);
        color: #5a4a3a;
        padding: 2.5rem;
        border-radius: 20px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        z-index: 2000;
        animation: fadeIn 0.5s ease-out;
        min-width: 350px;
        max-width: 450px;
        border: 4px solid #FFD700;
        text-align: center;
    `;
    
    document.body.appendChild(notification);
    
    // Add confetti effect for celebration
    createConfetti();
    
    // Remove notification after 4 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'fadeOut 0.5s ease-out forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }
    }, 4000);
}

function createConfetti() {
    const colors = ['#ff6b6b', '#4d96ff', '#6bcf7f', '#ffd93d', '#9d65c9'];
    
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.width = `${10 + Math.random() * 10}px`;
            confetti.style.height = `${10 + Math.random() * 10}px`;
            confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
            confetti.style.position = 'fixed';
            confetti.style.top = '-20px';
            confetti.style.zIndex = '1999';
            confetti.style.animation = `confettiFall ${1 + Math.random() * 2}s linear forwards`;
            
            document.body.appendChild(confetti);
            
            // Remove confetti after animation
            setTimeout(() => {
                if (confetti.parentNode) {
                    confetti.parentNode.removeChild(confetti);
                }
            }, 3000);
        }, i * 30);
    }
}

async function endGame() {
    isPlaying = false;
    isGameOver = true;
    clearInterval(gameTimer);
    
    finalScoreEl.textContent = score;
    gameOverScreen.classList.remove('hidden');
    
    // Save high score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('colormatchHighScore', highScore);
        highScoreEl.textContent = highScore;
    }
    
    // Calculate and save final XP (doar pentru cei conectați)
    if (gameStartTime && window.isUserLoggedIn) {
        const gameDuration = Math.floor((Date.now() - gameStartTime) / 1000);
        const minutesPlayed = gameDuration / 60;
        
        // Calculate XP: 2 XP per ball + 10 XP per minute played
        const xpFromBalls = matchedBalls * 2;
        const xpFromTime = Math.floor(minutesPlayed * 10);
        const xpEarned = xpFromBalls + xpFromTime;
        
        if (xpEarned > 0) {
            showXPEarnedNotification(xpEarned);
            
            // Save to Firebase
            if (window.saveGameToFirebase) {
                await window.saveGameToFirebase(score, xpEarned, gameDuration);
            }
        }
    }
}

function resetColors() {
    if (!isPlaying) return;
    
    // Remove all draggable balls
    document.querySelectorAll('.draggable-ball').forEach(ball => ball.remove());
    
    // Reset containers
    gameConfig.containers.forEach(container => {
        container.currentBalls = 0;
        const containerEl = container.element;
        const ballsContainer = containerEl.querySelector('.balls-container');
        ballsContainer.innerHTML = '';
        updateContainerCount(containerEl, container);
        containerEl.classList.remove('completed');
    });
    
    // Reset matched balls count
    matchedBalls = 0;
    
    // Create new balls
    createBalls();
}

// Salvează XP pentru nivelul curent (doar pentru cei conectați)
async function saveLevelXP(xpAmount) {
    if (!window.currentUserId || !window.isUserLoggedIn || xpAmount <= 0) {
        return;
    }
    
    try {
        // Salvează XP-ul pentru nivelul curent în Firebase
        const updates = {};
        const playerRef = ref(window.database, `playerStats/${window.currentUserId}`);
        const playerSnapshot = await get(playerRef);
        
        if (!playerSnapshot.exists()) return;
        
        const playerData = playerSnapshot.val();
        const currentXp = playerData.currentXp || 0;
        
        updates[`playerStats/${window.currentUserId}/currentXp`] = currentXp + xpAmount;
        
        // Salvează și detaliile nivelului
        const levelData = {
            level: currentLevel,
            xpEarned: xpAmount,
            timestamp: new Date().toISOString()
        };
        
        await push(ref(window.database, `gameSessions/${window.currentUserId}/colormatch/levels`), levelData);
        
        // Aplică update-urile
        await update(ref(window.database), updates);
        
    } catch (error) {
        console.error("Error saving level XP:", error);
        // Dacă nu reușește să salveze, salvează local pentru a încerca mai târziu
        const pendingXP = JSON.parse(localStorage.getItem('pendingXP') || '[]');
        pendingXP.push({
            xp: xpAmount,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('pendingXP', JSON.stringify(pendingXP));
    }
}

// Salvează XP pentru joc completat (cu bonus)
async function saveGameCompletedXP(totalXP, bonusXP) {
    if (!window.currentUserId || !window.isUserLoggedIn || totalXP <= 0) {
        return;
    }
    
    try {
        const updates = {};
        const playerRef = ref(window.database, `playerStats/${window.currentUserId}`);
        const playerSnapshot = await get(playerRef);
        
        if (!playerSnapshot.exists()) return;
        
        const playerData = playerSnapshot.val();
        const currentXp = playerData.currentXp || 0;
        
        updates[`playerStats/${window.currentUserId}/currentXp`] = currentXp + totalXP;
        
        // Salvează detaliile jocului completat
        const gameCompleteData = {
            levelReached: currentLevel,
            ballsPerContainer: gameConfig.ballsPerColor,
            totalXP: totalXP,
            bonusXP: bonusXP,
            finalScore: score,
            timestamp: new Date().toISOString()
        };
        
        await push(ref(window.database, `gameSessions/${window.currentUserId}/colormatch/completedGames`), gameCompleteData);
        
        // Aplică update-urile
        await update(ref(window.database), updates);
        
    } catch (error) {
        console.error("Error saving completed game XP:", error);
        const pendingXP = JSON.parse(localStorage.getItem('pendingXP') || '[]');
        pendingXP.push({
            xp: totalXP,
            isGameCompleted: true,
            bonusXP: bonusXP,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('pendingXP', JSON.stringify(pendingXP));
    }
}

// Sound effects
function playSuccessSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 523.25; // C5
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
        console.log('Audio not supported');
    }
}

function playErrorSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 349.23; // F4
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
        console.log('Audio not supported');
    }
}

function playTickSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 392; // G4
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        console.log('Audio not supported');
    }
}

// XP Notification
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

// Add CSS animations
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
    
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translate(-50%, -40%);
        }
        to {
            opacity: 1;
            transform: translate(-50%, -50%);
        }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    
    @keyframes dropIn {
        0% {
            transform: scale(0.5);
            opacity: 0;
        }
        70% {
            transform: scale(1.1);
        }
        100% {
            transform: scale(1);
            opacity: 1;
        }
    }
    
    @keyframes confettiFall {
        0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
        }
        100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
        }
    }
    
    @keyframes xpPulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
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
    
    .dragging {
        opacity: 0.7;
        transform: scale(1.1);
        z-index: 100;
    }
    
    .drag-over {
        background-color: rgba(76, 175, 80, 0.1) !important;
        border-color: #4CAF50 !important;
        transform: scale(1.02);
        transition: all 0.2s ease;
    }
    
    .completed {
        border-color: #4CAF50 !important;
        background-color: rgba(76, 175, 80, 0.05);
    }
    
    .shake {
        animation: shake 0.5s ease;
    }
    
    .container-ball {
        animation: dropIn 0.3s ease;
    }
    
    .level-notification .notification-content {
        text-align: center;
    }
    
    .level-notification .notification-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
    }
    
    .level-notification h3 {
        color: #7a5d4a;
        margin-bottom: 0.5rem;
    }
    
    .level-notification .xp-earned {
        background: linear-gradient(135deg, #ff9a76 0%, #ff6b9d 100%);
        color: white;
        padding: 10px 20px;
        border-radius: 10px;
        margin: 1rem 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        font-weight: bold;
    }
    
    .level-notification .xp-details {
        margin: 1rem 0;
        padding: 10px;
        background: rgba(255, 154, 118, 0.1);
        border-radius: 10px;
    }
    
    .level-notification .next-level,
    .level-notification .extra-time {
        color: #5a4a3a;
        margin: 0.5rem 0;
    }
    
    .celebration-text {
        margin-top: 1rem;
        font-size: 1.2em;
        color: #ff6b9d;
        animation: pulse 1s infinite;
    }
`;
document.head.appendChild(style);

// Event listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
newGameBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', resetColors);

// Prevent scrolling with arrow keys
document.addEventListener('keydown', function(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
    }
}, false);

// Prevent default drag behavior
document.addEventListener('dragover', function(e) {
    e.preventDefault();
});

document.addEventListener('drop', function(e) {
    e.preventDefault();
});

// Initialize
createGameBoard();

// Auto-save on exit
window.addEventListener('beforeunload', async (e) => {
    if (isPlaying && score > 0 && gameStartTime && window.saveGameToFirebase && window.isUserLoggedIn) {
        const gameDuration = Math.floor((Date.now() - gameStartTime) / 1000);
        const minutesPlayed = gameDuration / 60;
        const xpFromBalls = matchedBalls * 2;
        const xpFromTime = Math.floor(minutesPlayed * 10);
        const xpEarned = xpFromBalls + xpFromTime;
        
        if (xpEarned > 0) {
            await window.saveGameToFirebase(score, xpEarned, gameDuration);
        }
    }
});