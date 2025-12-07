// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add loading animation to game cards
const gameCards = document.querySelectorAll('.game-card');
gameCards.forEach((card, index) => {
    card.style.animation = `fadeInUp 0.6s ease ${index * 0.1}s both`;
});

// Navigate to game page when clicking on card or button
gameCards.forEach(card => {
    card.addEventListener('click', function(e) {
        const gameUrl = this.getAttribute('data-game');
        if (gameUrl) {
            window.location.href = gameUrl;
        }
    });
});

// Prevent button clicks from bubbling
document.querySelectorAll('.play-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const card = this.closest('.game-card');
        const gameUrl = card.getAttribute('data-game');
        if (gameUrl) {
            window.location.href = gameUrl;
        }
    });
});