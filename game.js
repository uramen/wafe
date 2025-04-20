// Get DOM elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

// Set canvas dimensions
canvas.width = 640;
canvas.height = 480;

// Game variables
let score = 0;
let lives = 3;
let gameRunning = false;
let animationId;

// Ball properties
const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 10,
    dx: 4,
    dy: -4,
    color: '#FFFFFF'
};

// Paddle properties
const paddle = {
    x: canvas.width / 2 - 50,
    y: canvas.height - 30,
    width: 100,
    height: 10,
    dx: 8,
    color: '#4CAF50'
};

// Controls
let rightPressed = false;
let leftPressed = false;

// Bricks properties
const brickRowCount = 5;
const brickColumnCount = 9;
const brickWidth = 60;
const brickHeight = 20;
const brickPadding = 10;
const brickOffsetTop = 60;
const brickOffsetLeft = 30;

// Create bricks array
const bricks = [];
for (let c = 0; c < brickColumnCount; c++) {
    bricks[c] = [];
    for (let r = 0; r < brickRowCount; r++) {
        // Set different colors for each row
        let brickColor;
        switch (r) {
            case 0: brickColor = '#FF5252'; break; // Red
            case 1: brickColor = '#FFD740'; break; // Amber
            case 2: brickColor = '#69F0AE'; break; // Green
            case 3: brickColor = '#40C4FF'; break; // Light Blue
            case 4: brickColor = '#7C4DFF'; break; // Purple
            default: brickColor = '#FFFFFF';
        }
        
        bricks[c][r] = {
            x: 0,
            y: 0,
            status: 1,
            color: brickColor
        };
    }
}

// Event listeners
document.addEventListener('keydown', keyDownHandler);
document.addEventListener('keyup', keyUpHandler);
document.addEventListener('mousemove', mouseMoveHandler);
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', restartGame);

// Handle key press
function keyDownHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = true;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = true;
    }
}

// Handle key release
function keyUpHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = false;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = false;
    }
}

// Handle mouse movement
function mouseMoveHandler(e) {
    if (!gameRunning) return;
    
    const relativeX = e.clientX - canvas.getBoundingClientRect().left;
    if (relativeX > 0 && relativeX < canvas.width) {
        paddle.x = relativeX - paddle.width / 2;
    }
}

// Draw ball
function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
    ctx.closePath();
}

// Draw paddle
function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.fillStyle = paddle.color;
    ctx.fill();
    ctx.closePath();
}

// Draw bricks
function drawBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status === 1) {
                const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
                const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;
                
                ctx.beginPath();
                ctx.rect(brickX, brickY, brickWidth, brickHeight);
                ctx.fillStyle = bricks[c][r].color;
                ctx.fill();
                ctx.closePath();
            }
        }
    }
}

// Draw score and lives
function drawScore() {
    scoreElement.textContent = `Score: ${score}`;
    livesElement.textContent = `Lives: ${lives}`;
}

// Check for collisions with bricks
function collisionDetection() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            const b = bricks[c][r];
            if (b.status === 1) {
                if (
                    ball.x > b.x &&
                    ball.x < b.x + brickWidth &&
                    ball.y > b.y &&
                    ball.y < b.y + brickHeight
                ) {
                    ball.dy = -ball.dy;
                    b.status = 0;
                    score++;
                    
                    // Create particle effect on collision
                    createParticles(b.x + brickWidth/2, b.y + brickHeight/2, b.color);
                    
                    // Check for win condition
                    if (score === brickRowCount * brickColumnCount) {
                        showMessage('YOU WIN!', '#4CAF50');
                        gameRunning = false;
                        restartBtn.style.display = 'inline-block';
                        cancelAnimationFrame(animationId);
                    }
                }
            }
        }
    }
}

// Particles system
const particles = [];

function createParticles(x, y, color) {
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: x,
            y: y,
            dx: (Math.random() - 0.5) * 4,
            dy: (Math.random() - 0.5) * 4,
            radius: Math.random() * 3 + 1,
            color: color,
            alpha: 1
        });
    }
}

function updateParticles() {
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.dx;
        p.y += p.dy;
        p.alpha -= 0.02;
        
        if (p.alpha <= 0) {
            particles.splice(i, 1);
            i--;
        } else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${hexToRgb(p.color)}, ${p.alpha})`;
            ctx.fill();
            ctx.closePath();
        }
    }
}

// Helper function to convert hex to rgb
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
        parseInt(result[1], 16) + ',' + 
        parseInt(result[2], 16) + ',' + 
        parseInt(result[3], 16)
        : '255,255,255';
}

// Show message on canvas
function showMessage(msg, color) {
    ctx.font = '36px Arial';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(msg, canvas.width / 2, canvas.height / 2);
}

// Game loop
function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw game elements
    drawBricks();
    drawBall();
    drawPaddle();
    drawScore();
    updateParticles();
    
    // Collision detection
    collisionDetection();
    
    // Ball hits the wall
    if (ball.x + ball.dx > canvas.width - ball.radius || ball.x + ball.dx < ball.radius) {
        ball.dx = -ball.dx;
    }
    
    // Ball hits the ceiling
    if (ball.y + ball.dy < ball.radius) {
        ball.dy = -ball.dy;
    }
    
    // Ball hits the paddle
    if (
        ball.y + ball.dy > paddle.y - ball.radius &&
        ball.x > paddle.x &&
        ball.x < paddle.x + paddle.width
    ) {
        // Calculate reflection angle based on where the ball hits the paddle
        const hitPosition = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
        const angle = hitPosition * Math.PI / 3; // Max angle: 60 degrees
        
        const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
        ball.dx = speed * Math.sin(angle);
        ball.dy = -speed * Math.cos(angle);
    }
    
    // Ball hits the bottom - lose a life
    else if (ball.y + ball.dy > canvas.height - ball.radius) {
        lives--;
        if (lives === 0) {
            showMessage('GAME OVER', '#f44336');
            gameRunning = false;
            restartBtn.style.display = 'inline-block';
            cancelAnimationFrame(animationId);
        } else {
            // Reset ball and paddle
            ball.x = canvas.width / 2;
            ball.y = canvas.height / 2;
            ball.dx = 4 * (Math.random() > 0.5 ? 1 : -1);
            ball.dy = -4;
            paddle.x = (canvas.width - paddle.width) / 2;
        }
    }
    
    // Move the paddle with keyboard
    if (rightPressed && paddle.x < canvas.width - paddle.width) {
        paddle.x += paddle.dx;
    } else if (leftPressed && paddle.x > 0) {
        paddle.x -= paddle.dx;
    }
    
    // Move the ball
    ball.x += ball.dx;
    ball.y += ball.dy;
    
    // Continue animation if game is running
    if (gameRunning) {
        animationId = requestAnimationFrame(draw);
    }
}

// Start game
function startGame() {
    if (!gameRunning) {
        gameRunning = true;
        startBtn.style.display = 'none';
        draw();
    }
}

// Restart game
function restartGame() {
    // Reset game state
    score = 0;
    lives = 3;
    
    // Reset ball
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.dx = 4 * (Math.random() > 0.5 ? 1 : -1);
    ball.dy = -4;
    
    // Reset paddle
    paddle.x = (canvas.width - paddle.width) / 2;
    
    // Reset bricks
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            bricks[c][r].status = 1;
        }
    }
    
    // Clear particles
    particles.length = 0;
    
    // Reset UI
    restartBtn.style.display = 'none';
    
    // Start game
    gameRunning = true;
    draw();
}

// Initial draw to show the game setup
function init() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBricks();
    drawBall();
    drawPaddle();
    drawScore();
    
    // Show start message
    ctx.font = '24px Arial';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.fillText('Press Start to play!', canvas.width / 2, canvas.height / 2);
}

// Initialize the game
window.onload = init; 