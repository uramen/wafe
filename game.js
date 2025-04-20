// DOM Elements
let canvas, ctx, playerNameInput, playButton, entryScreen, gameContainer, playerElementSpan, playerSizeSpan;
let scoreboardDiv, restartBtn;

// Game world and camera
let worldWidth = 3000;
let worldHeight = 3000;
let camera = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    
    // Initialize camera dimensions
    init: function(width, height) {
        this.width = width;
        this.height = height;
    },
    
    // Follow target with simple positioning (no smoothing)
    follow: function(target) {
        if (!target) return;
        
        // Center camera on target
        this.x = target.x - (canvas.width / 2);
        this.y = target.y - (canvas.height / 2);
        
        // Keep camera within world bounds
        this.x = Math.max(0, Math.min(worldWidth - canvas.width, this.x));
        this.y = Math.max(0, Math.min(worldHeight - canvas.height, this.y));
    }
};

// Game variables
let player = {
    name: '',
    element: '',
    size: 1,
    x: 0,
    y: 0,
    speed: 2,
    color: '',
    targetX: 0,
    targetY: 0,
    moving: false,
    score: 0,
    invulnerable: false,
    invulnerableTime: 0,
    botsDefeated: 0,
    elementStats: {
        defeated: { Water: 0, Fire: 0, Earth: 0, Air: 0 },
        defeatedBy: { Water: 0, Fire: 0, Earth: 0, Air: 0 }
    }
};

// Bot entities
let bots = [];
const BOT_COUNT = 5;
const BOT_NAMES = ['Aqua', 'Blaze', 'Storm', 'Terra', 'Spark', 'Frost', 'Gust', 'Ember', 'Quake', 'Dew'];
const BOT_MOVE_INTERVAL = 3000; // Bots change direction every 3 seconds

// Animation frame ID
let animationFrameId = null;

// Constants
const ELEMENTS = {
    FIRE: 'fire',
    WATER: 'water',
    EARTH: 'earth',
    AIR: 'air'
};

const ELEMENT_COLORS = {
    [ELEMENTS.FIRE]: '#FF5733',
    [ELEMENTS.WATER]: '#3498DB',
    [ELEMENTS.EARTH]: '#8B4513',
    [ELEMENTS.AIR]: '#F0F0F0'
};

const ELEMENT_ICONS = {
    [ELEMENTS.FIRE]: '🔥',
    [ELEMENTS.WATER]: '💧',
    [ELEMENTS.EARTH]: '🌍',
    [ELEMENTS.AIR]: '💨'
};

// Element interactions - each element is strong against the next one in the cycle
const ELEMENT_STRENGTHS = {
    [ELEMENTS.FIRE]: ELEMENTS.AIR,     // Fire beats Air
    [ELEMENTS.WATER]: ELEMENTS.FIRE,   // Water beats Fire
    [ELEMENTS.EARTH]: ELEMENTS.WATER,  // Earth beats Water
    [ELEMENTS.AIR]: ELEMENTS.EARTH     // Air beats Earth
};

// Animation entities
let animations = [];

// Mouse position
let mouseX = 0;
let mouseY = 0;

// Game state
let gameStarted = false;
let gameOver = false;
let highScores = [];
let gameStartTime = 0;

// Force a browser reflow to ensure elements are properly rendered
function forceReflow() {
    document.body.offsetHeight; // This line forces a reflow
}

// Initialize DOM elements after page load
function initDOMElements() {
    // Force a reflow before accessing elements
    forceReflow();
    
    // Get DOM elements
    canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('gameCanvas'));
    ctx = canvas ? canvas.getContext('2d') : null;
    playerNameInput = /** @type {HTMLInputElement} */ (document.getElementById('playerName'));
    playButton = document.getElementById('playBtn');
    entryScreen = document.getElementById('entry-screen');
    gameContainer = document.getElementById('game-container');
    playerElementSpan = document.getElementById('playerElement');
    playerSizeSpan = document.getElementById('playerSize');
    
    // Create scoreboard element if it doesn't exist
    if (!document.getElementById('scoreboard')) {
        const scoreboardElement = document.createElement('div');
        scoreboardElement.id = 'scoreboard';
        scoreboardElement.style.display = 'none';
        scoreboardElement.innerHTML = `
            <h2>Game Over!</h2>
            <div id="final-score"></div>
            <div id="high-scores"></div>
        `;
        
        // Add restart button
        const restartButton = document.createElement('button');
        restartButton.id = 'restartBtn';
        restartButton.textContent = 'Play Again';
        
        scoreboardElement.appendChild(restartButton);
        
        // Add scoreboard to container
        const container = document.querySelector('.container');
        if (container) {
            container.appendChild(scoreboardElement);
        }
    }
    
    // Get scoreboard elements
    scoreboardDiv = document.getElementById('scoreboard');
    restartBtn = document.getElementById('restartBtn');
    
    if (restartBtn) {
        restartBtn.addEventListener('click', restartGame);
    }
    
    // Ensure the canvas takes up the full viewport with proper aspect ratio
    if (canvas) {
        // Set a fixed width-to-height ratio (16:9 for widescreen)
        const aspectRatio = 16 / 9;
        
        // Calculate dimensions based on available space
        const maxWidth = window.innerWidth - 40; // Full width minus margins
        const maxHeight = window.innerHeight - 100; // Full height minus margins
        
        // Determine if width or height is the limiting factor
        let canvasWidth, canvasHeight;
        
        if (maxWidth / aspectRatio <= maxHeight) {
            // Width is the limiting factor
            canvasWidth = maxWidth;
            canvasHeight = canvasWidth / aspectRatio;
        } else {
            // Height is the limiting factor
            canvasHeight = maxHeight;
            canvasWidth = canvasHeight * aspectRatio;
        }
        
        // Apply the calculated dimensions
        canvas.style.width = canvasWidth + 'px';
        canvas.style.height = canvasHeight + 'px';
        canvas.style.display = 'block';
        canvas.style.margin = '20px auto';
        
        forceReflow(); // Force reflow after style changes
        resizeCanvas();
        
        // Initialize camera dimensions based on canvas
        camera.init(canvas.width, canvas.height);
        
        // Add mouse move event listener
        canvas.addEventListener('mousemove', handleMouseMove);
    }
    
    // Add event listeners
    if (playButton) {
        playButton.addEventListener('click', startGame);
    }

    if (playerNameInput) {
        playerNameInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                startGame();
            }
        });
    }
    
    // Test drawing on canvas
    if (ctx && canvas) {
        // Clear first
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw test rectangle
        ctx.fillStyle = 'red';
        ctx.fillRect(10, 10, 50, 50);
        ctx.font = '20px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText('Canvas initialized', 100, 30);
    }
}

// Resize canvas to fit window
function resizeCanvas() {
    if (!canvas) return;
    
    // Get the current display dimensions of the canvas
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    
    // Only resize if dimensions have actually changed
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        // Set canvas internal dimensions to match its display size exactly
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        
        // Initialize camera with new dimensions
        camera.init(canvas.width, canvas.height);
        
        // If player exists, center camera on player
        if (player) {
            // Center camera on player immediately
            camera.x = player.x - canvas.width / 2;
            camera.y = player.y - canvas.height / 2;
            
            // Keep camera within world bounds
            camera.x = Math.max(0, Math.min(worldWidth - canvas.width, camera.x));
            camera.y = Math.max(0, Math.min(worldHeight - canvas.height, camera.y));
        }
    }
}

// Create a bot entity in the larger world
function createBotInWorld() {
    const randomName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const randomElement = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
    const randomSize = 0.8 + Math.random() * 1.5; // Random size between 0.8 and 2.3
    
    // Calculate radius for collision purposes
    const entityRadius = 20 + (randomSize * 5);
    
    // Set safe margins from the edge of the world
    const margin = entityRadius + 50;
    
    // Initialize positions with safe defaults
    let x = margin + Math.random() * (worldWidth - 2 * margin);
    let y = margin + Math.random() * (worldHeight - 2 * margin);
    let safePosition = false;
    let attempts = 0;
    const maxAttempts = 20;
    
    // Calculate the minimum safe distance from the player
    const minDistanceFromPlayer = 500; // Minimum 500px from player
    
    while (!safePosition && attempts < maxAttempts) {
        // Generate random position in the world
        x = margin + Math.random() * (worldWidth - 2 * margin);
        y = margin + Math.random() * (worldHeight - 2 * margin);
        
        // Check distance from player
        const distToPlayer = distanceBetween(x, y, player.x, player.y);
        if (distToPlayer > minDistanceFromPlayer) {
            // Check distance from other bots
            let tooCloseToOtherBot = false;
            for (const bot of bots) {
                const distToBot = distanceBetween(x, y, bot.x, bot.y);
                if (distToBot < entityRadius * 4) { // Ensure bots are well-spaced
                    tooCloseToOtherBot = true;
                    break;
                }
            }
            
            if (!tooCloseToOtherBot) {
                safePosition = true;
            }
        }
        
        attempts++;
    }
    
    return {
        name: randomName,
        element: randomElement,
        size: randomSize,
        x: x,
        y: y,
        speed: 1 + Math.random() * 1.5,
        color: ELEMENT_COLORS[randomElement],
        targetX: x + (Math.random() * 400 - 200), // Random initial target nearby
        targetY: y + (Math.random() * 400 - 200),
        moving: true,
        lastMoveTime: Date.now(),
        score: 0 // Initialize score to 0
    };
}

// Helper function to calculate distance between two points
function distanceBetween(x1, y1, x2, y2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
}

// Bot movement AI for the larger world
function updateBotMovement(bot) {
    const currentTime = Date.now();
    
    // Change direction periodically or when close to target
    const dx = bot.targetX - bot.x;
    const dy = bot.targetY - bot.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (currentTime - bot.lastMoveTime > BOT_MOVE_INTERVAL || distance < 10) {
        // Set a new random target within reasonable distance
        const maxRange = 1000; // Maximum distance for new target
        bot.targetX = Math.max(0, Math.min(worldWidth, bot.x + (Math.random() * maxRange * 2 - maxRange)));
        bot.targetY = Math.max(0, Math.min(worldHeight, bot.y + (Math.random() * maxRange * 2 - maxRange)));
        bot.lastMoveTime = currentTime;
    }
    
    // Calculate movement direction
    const angle = Math.atan2(dy, dx);
    
    // Move bot with constant speed
    bot.x += Math.cos(angle) * bot.speed;
    bot.y += Math.sin(angle) * bot.speed;
    
    // Keep bot within world bounds
    keepEntityInBounds(bot);
}

// Keep any entity within game world boundaries
function keepEntityInBounds(entity) {
    const entityRadius = 20 + (entity.size * 5);
    
    // Check world boundaries, not canvas boundaries
    if (entity.x < entityRadius) {
        entity.x = entityRadius;
    }
    if (entity.x > worldWidth - entityRadius) {
        entity.x = worldWidth - entityRadius;
    }
    if (entity.y < entityRadius) {
        entity.y = entityRadius;
    }
    if (entity.y > worldHeight - entityRadius) {
        entity.y = worldHeight - entityRadius;
    }
}

// Convert screen coordinates to world coordinates
function screenToWorld(screenX, screenY) {
    return {
        x: screenX + camera.x,
        y: screenY + camera.y
    };
}

// Handle mouse movement
function handleMouseMove(e) {
    if (!canvas) return;
    
    // Calculate the scaling factor between the canvas displayed size and its actual size
    const scaleX = canvas.width / canvas.clientWidth;
    const scaleY = canvas.height / canvas.clientHeight;
    
    // Get mouse position relative to the canvas
    const rect = canvas.getBoundingClientRect();
    const mouseScreenX = (e.clientX - rect.left) * scaleX;
    const mouseScreenY = (e.clientY - rect.top) * scaleY;
    
    // Convert to world coordinates
    const worldPos = screenToWorld(mouseScreenX, mouseScreenY);
    mouseX = worldPos.x;
    mouseY = worldPos.y;
    
    // Update player target if game is active
    if (gameStarted && player) {
        player.targetX = mouseX;
        player.targetY = mouseY;
    }
}

// Start game function
function startGame() {
    try {
        if (!playerNameInput || !canvas || !ctx) {
            alert("Game initialization failed. Please refresh the page.");
            return;
        }
        
        // Force canvas resize to ensure proper dimensions
        resizeCanvas();
        
        const playerName = playerNameInput.value?.trim() || "Player";
        
        if (!playerName) {
            // Animate the input field to indicate it's required
            playerNameInput.classList.add('shake');
            setTimeout(() => {
                playerNameInput.classList.remove('shake');
            }, 500);
            return;
        }
        
        // Hide scoreboard if visible
        const scoreboard = document.getElementById('scoreboard');
        if (scoreboard) {
            scoreboard.style.display = 'none';
        }
        
        // Set player properties first, before bot creation
        player.name = playerName;
        player.size = 1;
        player.score = 0;
        gameOver = false;
        gameStartTime = Date.now();
        
        // Make player invulnerable for 3 seconds to give time to get used to controls
        player.invulnerable = true;
        player.invulnerableTime = Date.now() + 3000; // 3 seconds of invulnerability
        
        // Position player in the center of the world
        player.x = worldWidth / 2;
        player.y = worldHeight / 2;
        player.targetX = player.x;
        player.targetY = player.y;
        
        // Initialize camera to center on player
        camera.x = player.x - camera.width / 2;
        camera.y = player.y - camera.height / 2;
        
        // Randomly assign an element - ensure we get a valid element
        const elementKeys = Object.keys(ELEMENTS);
        if (elementKeys.length > 0) {
            const randomElementKey = elementKeys[Math.floor(Math.random() * elementKeys.length)];
            player.element = ELEMENTS[randomElementKey];
            player.color = ELEMENT_COLORS[player.element];
            
            // Update the UI
            if (playerElementSpan) {
                playerElementSpan.textContent = `Element: ${player.element}`;
                if (player.element && typeof player.element === 'string') {
                    playerElementSpan.className = player.element.toLowerCase();
                }
            }
        } else {
            // Fallback if no elements are defined
            player.element = 'none';
            player.color = '#CCCCCC';
            
            if (playerElementSpan) {
                playerElementSpan.textContent = 'Element: None';
                playerElementSpan.className = '';
            }
        }

        if (playerSizeSpan) {
            playerSizeSpan.textContent = `Size: ${player.size.toFixed(1)}`;
        }
        
        // Initialize empty bots array
        bots = [];
        
        // Create bots spread throughout the world, not just near the player
        for (let i = 0; i < BOT_COUNT; i++) {
            const bot = createBotInWorld();
            if (bot) bots.push(bot);
        }
        
        // Add mouse move event listener to the canvas
        canvas.addEventListener('mousemove', handleMouseMove);
        
        // Hide the entry screen and show the game
        if (entryScreen) {
            entryScreen.style.display = 'none';
        }
        
        if (gameContainer) {
            gameContainer.style.display = 'block';
            // Force reflow to ensure the game container is shown
            forceReflow();
        }
        
        // Set game as started
        gameStarted = true;
        
        // Force an immediate render
        drawGame();
        
        // Start the game loop with a small delay to ensure everything is ready
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        
        // Start game loop with a tiny delay to ensure DOM updates are complete
        setTimeout(() => {
            animationFrameId = requestAnimationFrame(gameLoop);
        }, 50);
    } catch (error) {
        alert("Error starting game: " + error.message);
    }
}

// Create a bot with a guaranteed minimum distance from player
function createBotWithMinDistance(minDistanceFromPlayer) {
    if (!canvas) return null;
    
    const randomName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const randomElement = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
    const randomSize = 0.8 + Math.random() * 1.5; // Random size between 0.8 and 2.3
    
    // Calculate radius for collision purposes
    const entityRadius = 20 + (randomSize * 5);
    
    // Set very safe default position far from player
    const margin = entityRadius + 20;
    
    // We'll try to position bots in corners away from player (center)
    const quadrants = [
        { x: margin, y: margin }, // top-left
        { x: canvas.width - margin, y: margin }, // top-right
        { x: margin, y: canvas.height - margin }, // bottom-left
        { x: canvas.width - margin, y: canvas.height - margin } // bottom-right
    ];
    
    // Add random offset to each quadrant position
    const positions = quadrants.map(pos => {
        return {
            x: pos.x + (Math.random() * 100 - 50),
            y: pos.y + (Math.random() * 100 - 50)
        };
    });
    
    // Sort positions by distance from player (farthest first)
    positions.sort((a, b) => {
        const distA = distanceBetween(a.x, a.y, player.x, player.y);
        const distB = distanceBetween(b.x, b.y, player.x, player.y);
        return distB - distA; // Descending order
    });
    
    // Start with position farthest from player
    let x = positions[0].x;
    let y = positions[0].y;
    
    // Ensure position is within canvas bounds
    x = Math.max(margin, Math.min(canvas.width - margin, x));
    y = Math.max(margin, Math.min(canvas.height - margin, y));
    
    // Check if this position is also safe from other bots
    let safeFromOtherBots = true;
    for (const bot of bots) {
        const distance = distanceBetween(x, y, bot.x, bot.y);
        if (distance < entityRadius * 3) { // 3 times the radius for bot-bot safety
            safeFromOtherBots = false;
            break;
        }
    }
    
    // If not safe from other bots, try alternative positions
    if (!safeFromOtherBots) {
        for (let i = 1; i < positions.length; i++) {
            x = positions[i].x;
            y = positions[i].y;
            
            // Ensure position is within canvas bounds
            x = Math.max(margin, Math.min(canvas.width - margin, x));
            y = Math.max(margin, Math.min(canvas.height - margin, y));
            
            safeFromOtherBots = true;
            for (const bot of bots) {
                const distance = distanceBetween(x, y, bot.x, bot.y);
                if (distance < entityRadius * 3) {
                    safeFromOtherBots = false;
                    break;
                }
            }
            
            if (safeFromOtherBots) break;
        }
    }
    
    // Create bot with the chosen position
    return {
        name: randomName,
        element: randomElement,
        size: randomSize,
        x: x,
        y: y,
        speed: 1 + Math.random() * 1.5,
        color: ELEMENT_COLORS[randomElement],
        targetX: x + (Math.random() * 200 - 100), // Random initial target nearby
        targetY: y + (Math.random() * 200 - 100),
        moving: true,
        lastMoveTime: Date.now(),
        score: 0 // Initialize score to 0
    };
}

// Update bot scores based on their size
function updateEntityScores() {
    if (player) {
        player.score = Math.floor(player.size * 500);
    }
    
    bots.forEach(bot => {
        bot.score = Math.floor(bot.size * 500);
    });
}

// Game loop
function gameLoop() {
    try {
        if (!canvas || !ctx) return;
        
        // Check if canvas needs resizing (handles window resize)
        resizeCanvas();
        
        // Always update bots and their interactions, even after game over
        const botsToRemove = [];
            
        // Update bots and check bot-bot collisions
        for (let i = 0; i < bots.length; i++) {
            updateBotMovement(bots[i]);
            
            // Check for collisions with other bots
            for (let j = i + 1; j < bots.length; j++) {
                if (checkElementalCollision(bots[i], bots[j])) {
                    // One bot defeated another
                    const result = handleElementalInteraction(bots[i], bots[j]);
                    if (result.defeated) {
                        botsToRemove.push(result.defeated);
                        createExplosionAnimation(result.defeated);
                    }
                }
            }
            
            // Only check player collisions if game is not over
            if (!gameOver && !player.invulnerable && checkElementalCollision(player, bots[i])) {
                const result = handleElementalInteraction(player, bots[i]);
                if (result.defeated === player) {
                    // Player was defeated - end game
                    endGame(false);
                    // Continue processing other bots this frame
                    continue;
                } else if (result.defeated) {
                    // Player defeated a bot
                    botsToRemove.push(result.defeated);
                    createExplosionAnimation(result.defeated);
                    // Track bots defeated
                    player.botsDefeated = (player.botsDefeated || 0) + 1;
                    createGrowthAnimation(player);
                }
            }
        }
        
        // Remove defeated bots and spawn new ones (even after game over)
        if (botsToRemove.length > 0) {
            bots = bots.filter(bot => !botsToRemove.includes(bot));
            
            // Spawn new bots to replace the defeated ones
            while (bots.length < BOT_COUNT) {
                const newBot = createBotInWorld();
                if (newBot) bots.push(newBot);
            }
        }
        
        // Only update player if game is not over
        if (!gameOver) {
            // Update win condition
            const gameZoneArea = worldWidth * worldHeight;
            const playerRadius = 20 + (player.size * 5);
            const playerArea = Math.PI * playerRadius * playerRadius;
            
            // Player wins when they occupy about 1% of the game world (adjusted for larger world)
            if (playerArea > gameZoneArea * 0.01) {
                endGame(true);
            } else {
                // Check if player invulnerability has expired
                if (player.invulnerable && Date.now() > player.invulnerableTime) {
                    player.invulnerable = false;
                }
                
                // Update player position
                updatePlayerPosition();
                
                // Update camera to follow player
                camera.follow(player);
                
                // Update the player size display
                if (playerSizeSpan) {
                    playerSizeSpan.textContent = `Size: ${player.size.toFixed(1)} | Score: ${player.score}`;
                }
            }
        }
        
        // Update all scores based on size
        updateEntityScores();
        
        // Always update animations
        updateAnimations();
        
        // Always draw the game
        drawGame();
        
        // Continue the game loop
        animationFrameId = requestAnimationFrame(gameLoop);
    } catch (error) {
        console.error("Game loop error:", error);
        // If there's an error in the game loop, try to restart it
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

// Check if two entities are colliding based on their position and size
function checkElementalCollision(entity1, entity2) {
    const radius1 = 20 + (entity1.size * 5);
    const radius2 = 20 + (entity2.size * 5);
    
    const dx = entity1.x - entity2.x;
    const dy = entity1.y - entity2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance < radius1 + radius2;
}

// Handle interaction between two entities based on their elements
function handleElementalInteraction(entity1, entity2) {
    // If elements are the same, no interaction
    if (entity1.element === entity2.element) {
        return { defeated: null };
    }
    
    // Check which entity wins based on elemental strengths
    if (ELEMENT_STRENGTHS[entity1.element] === entity2.element) {
        // Entity 1 is strong against entity 2
        entity1.size += entity2.size * 0.2; // Absorb 20% of defeated entity's size
        
        // Update winner's score immediately after size change
        entity1.score = Math.floor(entity1.size * 500);
        
        return { defeated: entity2, winner: entity1 };
    } else if (ELEMENT_STRENGTHS[entity2.element] === entity1.element) {
        // Entity 2 is strong against entity 1
        entity2.size += entity1.size * 0.2; // Absorb 20% of defeated entity's size
        
        // Update winner's score immediately after size change
        entity2.score = Math.floor(entity2.size * 500);
        
        return { defeated: entity1, winner: entity2 };
    }
    
    // If no direct strength relationship, the larger entity wins
    if (entity1.size > entity2.size * 1.5) {
        entity1.size += entity2.size * 0.1; // Absorb 10% of defeated entity's size
        
        // Update winner's score immediately after size change
        entity1.score = Math.floor(entity1.size * 500);
        
        return { defeated: entity2, winner: entity1 };
    } else if (entity2.size > entity1.size * 1.5) {
        entity2.size += entity1.size * 0.1; // Absorb 10% of defeated entity's size
        
        // Update winner's score immediately after size change
        entity2.score = Math.floor(entity2.size * 500);
        
        return { defeated: entity1, winner: entity2 };
    }
    
    // If neither has a clear advantage, they bounce off each other
    return { defeated: null };
}

// Create explosion animation
function createExplosionAnimation(entity) {
    const explosionColor = entity.color;
    const explosionSize = 20 + (entity.size * 5);
    const explosionParticles = [];
    
    // Create 20 particles for the explosion
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        const size = 2 + Math.random() * 5;
        
        explosionParticles.push({
            x: entity.x,
            y: entity.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: size,
            alpha: 1,
            color: explosionColor
        });
    }
    
    // Add absorption ring animation
    animations.push({
        type: 'explosion',
        x: entity.x,
        y: entity.y,
        radius: explosionSize,
        maxRadius: explosionSize * 2,
        color: explosionColor,
        particles: explosionParticles,
        duration: 30,
        elapsed: 0
    });
    
    // Add text animation to show the element that was defeated
    animations.push({
        type: 'text',
        text: `${entity.element} defeated!`,
        x: entity.x,
        y: entity.y - 50,
        color: explosionColor,
        duration: 60,
        elapsed: 0,
        fontSize: 16
    });
}

// Create a more dramatic death animation for the player
function createPlayerDeathAnimation(player) {
    const baseColor = player.color;
    const playerPos = { x: player.x, y: player.y };
    const playerSize = 20 + (player.size * 5);
    
    // Large initial explosion
    const initialParticles = [];
    for (let i = 0; i < 50; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 6;
        const size = 4 + Math.random() * 8;
        
        initialParticles.push({
            x: playerPos.x,
            y: playerPos.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: size,
            alpha: 1,
            color: baseColor
        });
    }
    
    // Add bright white flash
    animations.push({
        type: 'flash',
        x: playerPos.x,
        y: playerPos.y,
        radius: playerSize * 5,
        color: '#FFFFFF',
        duration: 15,
        elapsed: 0
    });
    
    // Add initial big explosion
    animations.push({
        type: 'explosion',
        x: playerPos.x,
        y: playerPos.y,
        radius: playerSize * 1.5,
        maxRadius: playerSize * 6,
        color: baseColor,
        particles: initialParticles,
        duration: 90,
        elapsed: 0
    });
    
    // Create multiple delayed wave explosions
    for (let wave = 0; wave < 4; wave++) {
        // Delayed waves
        setTimeout(() => {
            // Create particles for this wave
            const waveParticles = [];
            const particleCount = 40;
            
            for (let i = 0; i < particleCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 5;
                const size = 3 + Math.random() * 7;
                
                waveParticles.push({
                    x: playerPos.x,
                    y: playerPos.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: size,
                    alpha: 1,
                    color: wave % 2 === 0 ? baseColor : '#FFFFFF'
                });
            }
            
            // Add explosion animation for this wave
            animations.push({
                type: 'explosion',
                x: playerPos.x,
                y: playerPos.y,
                radius: playerSize * (wave + 1) * 0.8,
                maxRadius: playerSize * (wave + 1) * 2,
                color: wave % 2 === 0 ? baseColor : '#FFFFFF',
                particles: waveParticles,
                duration: 80,
                elapsed: 0
            });
            
        }, wave * 200); // Each wave 200ms apart
    }
    
    // Add shock wave rings
    for (let ring = 0; ring < 3; ring++) {
        setTimeout(() => {
            animations.push({
                type: 'ring',
                x: playerPos.x,
                y: playerPos.y,
                radius: 10,
                maxRadius: canvas.width / 2,
                lineWidth: 8 - (ring * 2),
                color: ring % 2 === 0 ? baseColor : '#FFFFFF',
                duration: 90,
                elapsed: 0
            });
        }, ring * 300);
    }
    
    // Add dramatic text animation
    setTimeout(() => {
        animations.push({
            type: 'text',
            text: 'YOU DIED',
            x: playerPos.x,
            y: playerPos.y - 80,
            color: '#ff0000',
            duration: 180,
            elapsed: 0,
            fontSize: 48,
            bold: true
        });
        
        // Add element-specific defeat message
        animations.push({
            type: 'text',
            text: `${player.element} has been extinguished!`,
            x: playerPos.x,
            y: playerPos.y + 50,
            color: baseColor,
            duration: 180,
            elapsed: 0,
            fontSize: 24
        });
    }, 500); // Delay text appearance for dramatic effect
}

// Create growth animation
function createGrowthAnimation(entity) {
    animations.push({
        type: 'growth',
        x: entity.x,
        y: entity.y,
        radius: 20 + (entity.size * 5),
        color: entity.color,
        duration: 20,
        elapsed: 0
    });
}

// Update all active animations
function updateAnimations() {
    for (let i = animations.length - 1; i >= 0; i--) {
        const anim = animations[i];
        anim.elapsed++;
        
        // Remove animation if it's finished
        if (anim.elapsed >= anim.duration) {
            animations.splice(i, 1);
            continue;
        }
        
        // Update particles for explosion animations
        if (anim.type === 'explosion' && anim.particles) {
            for (const particle of anim.particles) {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.alpha = 1 - (anim.elapsed / anim.duration);
            }
        }
    }
}

// Single render of the game state with camera offset
function drawGame() {
    if (!canvas || !ctx) return;
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Save context state before applying camera transform
    ctx.save();
    
    // Apply camera translation - everything drawn after this will be offset by camera position
    ctx.translate(-camera.x, -camera.y);
    
    // Draw game boundary and grid
    drawGameZone();
    
    // Draw animations that should appear behind entities
    drawBackgroundAnimations();
    
    // Draw all bots
    bots.forEach(bot => {
        drawEntity(bot);
    });
    
    // Only draw player if game is not over
    if (!gameOver && player) {
        drawEntity(player);
    }
    
    // Draw animations that should appear in front of entities
    drawForegroundAnimations();
    
    // Draw mouse cursor if within canvas
    drawCursor();
    
    // Restore context state (remove camera transform)
    ctx.restore();
    
    // Draw UI elements that should be in screen space, not world space
    drawUI();
}

// Check if an entity is visible in the current viewport (with margin)
function isEntityVisible(entity) {
    const entityRadius = 20 + (entity.size * 5);
    const margin = 100; // Extra margin to ensure smooth appearance/disappearance
    
    return (
        entity.x + entityRadius + margin >= camera.x &&
        entity.x - entityRadius - margin <= camera.x + camera.width &&
        entity.y + entityRadius + margin >= camera.y &&
        entity.y - entityRadius - margin <= camera.y + camera.height
    );
}

// Draw the game zone with grid
function drawGameZone() {
    if (!ctx) return;
    
    // Draw a grid to help visualize the game area
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)';
    ctx.lineWidth = 1;
    
    // Only draw grid lines that are visible in the viewport
    const gridSize = 100; // Larger grid for the bigger world
    
    // Calculate grid start and end positions based on camera view
    const startX = Math.floor(camera.x / gridSize) * gridSize;
    const endX = Math.ceil((camera.x + camera.width) / gridSize) * gridSize;
    const startY = Math.floor(camera.y / gridSize) * gridSize;
    const endY = Math.ceil((camera.y + camera.height) / gridSize) * gridSize;
    
    // Draw vertical grid lines
    for (let x = startX; x <= endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
    }
    
    // Draw horizontal grid lines
    for (let y = startY; y <= endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
    }
    
    // Draw the world boundary
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, worldWidth, worldHeight);
    
    // Draw corner markers for orientation
    const markerSize = 50;
    drawCornerMarker(0, 0, markerSize, 'top-left');
    drawCornerMarker(worldWidth, 0, markerSize, 'top-right');
    drawCornerMarker(0, worldHeight, markerSize, 'bottom-left');
    drawCornerMarker(worldWidth, worldHeight, markerSize, 'bottom-right');
}

// Draw UI elements in screen space
function drawUI() {
    // Only draw game UI if playing
    if (gameStarted && !gameOver) {
        // Draw game stats
        const padding = 15;
        const lineHeight = 20;
        
        // Draw semi-transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(padding, padding, 150, 80);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.strokeRect(padding, padding, 150, 80);
        
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        // Calculate game time
        const elapsedTime = Date.now() - gameStartTime;
        const seconds = Math.floor(elapsedTime / 1000);
        const minutes = Math.floor(seconds / 60);
        const displaySeconds = seconds % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}`;
        
        // Draw time
        ctx.fillText(`Time: ${timeString}`, padding + 10, padding + 10);
        
        // Draw player element
        if (player && player.element) {
            ctx.fillText(`Element: ${player.element}`, padding + 10, padding + 10 + lineHeight);
        }
        
        // Draw score
        if (player) {
            ctx.fillText(`Score: ${player.score}`, padding + 10, padding + 10 + lineHeight * 2);
        }
        
        // Draw remaining bots
        ctx.fillText(`Bots: ${bots.length}`, padding + 10, padding + 10 + lineHeight * 3);
    }
}

// Draw a minimap in the corner of the screen
function drawMinimap() {
    // Minimap settings
    const mapSize = 150;
    const mapPadding = 10;
    const mapX = canvas.width - mapSize - mapPadding;
    const mapY = mapPadding;
    const mapScale = mapSize / worldWidth;
    
    // Draw minimap background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(mapX, mapY, mapSize, mapSize);
    
    // Draw minimap border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mapX, mapY, mapSize, mapSize);
    
    // Draw minimap title
    ctx.fillStyle = 'white';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('WORLD MAP', mapX + mapSize / 2, mapY - 3);
    
    // Draw world dimensions
    ctx.font = '8px Arial';
    ctx.fillText(`${worldWidth}x${worldHeight}`, mapX + mapSize / 2, mapY + mapSize + 10);
    
    // Draw camera viewport on minimap
    const viewX = mapX + camera.x * mapScale;
    const viewY = mapY + camera.y * mapScale;
    const viewWidth = camera.width * mapScale;
    const viewHeight = camera.height * mapScale;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(viewX, viewY, viewWidth, viewHeight);
    
    // Draw player on minimap
    if (player) {
        const playerMapX = mapX + player.x * mapScale;
        const playerMapY = mapY + player.y * mapScale;
        
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(playerMapX, playerMapY, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw bots on minimap
    bots.forEach(bot => {
        const botMapX = mapX + bot.x * mapScale;
        const botMapY = mapY + bot.y * mapScale;
        
        ctx.fillStyle = bot.color;
        ctx.beginPath();
        ctx.arc(botMapX, botMapY, 2, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw compass on minimap
    const compassRadius = 8;
    const compassX = mapX + mapSize - compassRadius - 5;
    const compassY = mapY + compassRadius + 5;
    
    // Draw compass circle
    ctx.beginPath();
    ctx.arc(compassX, compassY, compassRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Draw compass directions
    ctx.fillStyle = 'white';
    ctx.font = '8px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // North
    ctx.fillText('N', compassX, compassY - compassRadius + 3);
    
    // East
    ctx.fillText('E', compassX + compassRadius - 3, compassY);
    
    // South
    ctx.fillText('S', compassX, compassY + compassRadius - 3);
    
    // West
    ctx.fillText('W', compassX - compassRadius + 3, compassY);
}

// End game function
function endGame(isWin) {
    // For player death, create death animation BEFORE setting gameOver flag
    if (!isWin && !gameOver) {
        createPlayerDeathAnimation(player);
        
        // Store player position so we can continue showing it for animations
        const deadPlayerPos = {
            x: player.x,
            y: player.y,
            size: player.size,
            color: player.color,
            element: player.element
        };
        
        // Add a special "deadPlayer" to animations list to keep rendering it
        animations.push({
            type: 'deadPlayer',
            x: deadPlayerPos.x,
            y: deadPlayerPos.y,
            size: deadPlayerPos.size,
            color: deadPlayerPos.color,
            element: deadPlayerPos.element,
            elapsed: 0,
            duration: 5000 // Keep for 5 seconds until scoreboard shows
        });
    }
    
    // Now set gameOver flag
    gameOver = true;
    
    // Update high scores
    updateHighScores();
    
    // Show scoreboard immediately after death
    showScoreboard(isWin);
}

// Update high scores list
function updateHighScores() {
    // Retrieve existing scores from localStorage if available
    let storedScores = localStorage.getItem('wafeHighScores');
    highScores = storedScores ? JSON.parse(storedScores) : [];
    
    // Add current score
    highScores.push({
        name: player.name,
        element: player.element,
        score: player.score,
        size: player.size,
        timestamp: Date.now()
    });
    
    // Sort by score, descending
    highScores.sort((a, b) => b.score - a.score);
    
    // Keep only top 10
    highScores = highScores.slice(0, 10);
    
    // Save back to localStorage
    localStorage.setItem('wafeHighScores', JSON.stringify(highScores));
}

// Show scoreboard with translucent background to see game behind it
function showScoreboard(isWin) {
    // Get scoreboard element
    const scoreboard = document.getElementById('scoreboard');
    if (!scoreboard) return;
    
    // Calculate game stats
    const botsDefeated = player.botsDefeated || 0;
    const timeSurvived = Math.floor((Date.now() - gameStartTime) / 1000); // in seconds
    
    // Create current game ranking section
    const rankingDiv = document.getElementById('current-ranking') || document.createElement('div');
    rankingDiv.id = 'current-ranking';
    
    // Get all entities (player and bots) for ranking
    const allEntities = [player, ...bots];
    
    // Sort by score (descending)
    allEntities.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    // Find player's rank
    const playerRank = allEntities.findIndex(entity => entity === player) + 1;
    
    // Create ranking header with player position highlighted
    let rankingHTML = `
        <h3>Match Results</h3>
        <div class="rank-summary">
            <div class="rank-badge ${playerRank === 1 ? 'rank-first' : playerRank === 2 ? 'rank-second' : playerRank === 3 ? 'rank-third' : ''}">
                #${playerRank}
            </div>
            <div class="rank-info">
                <p>Your rank: ${playerRank} of ${allEntities.length}</p>
                <p>Points: ${player.score}</p>
                <p>Size: ${player.size.toFixed(1)}</p>
            </div>
        </div>
        <table>
            <tr>
                <th>Rank</th>
                <th>Entity</th>
                <th>Element</th>
                <th>Score <span class="sub-label">(pts)</span></th>
            </tr>
    `;
    
    // Add all entities to ranking table
    allEntities.forEach((entity, index) => {
        const isPlayer = entity === player;
        // Ensure score is always a number, default to 0 if undefined
        const score = entity.score || 0;
        
        rankingHTML += `
            <tr class="${isPlayer ? 'current-player' : index % 2 === 0 ? 'row-even' : 'row-odd'}">
                <td>${index + 1}</td>
                <td>${entity.name}${isPlayer ? ' (YOU)' : ''}</td>
                <td class="${entity.element.toLowerCase()}">${getElementSymbol(entity.element)} ${entity.element}</td>
                <td>${score}</td>
            </tr>
        `;
    });
    
    rankingHTML += '</table>';
    rankingDiv.innerHTML = rankingHTML;
    
    // Set player summary content
    const finalScoreDiv = document.getElementById('final-score') || document.createElement('div');
    finalScoreDiv.id = 'final-score';
    
    finalScoreDiv.innerHTML = `
        <h3>${isWin ? 'YOU WIN!' : 'GAME OVER'}</h3>
        <div class="player-summary">
            <div class="player-avatar ${player.element.toLowerCase()}">
                ${getElementSymbol(player.element)}
            </div>
            <div class="player-info">
                <h4>${player.name}</h4>
                <p class="${player.element.toLowerCase()}">${player.element} Element</p>
            </div>
        </div>
        
        <div class="score-breakdown">
            <div class="score-item">
                <span class="score-label">Final Score</span>
                <span class="score-value">${player.score}</span>
            </div>
            <div class="score-item">
                <span class="score-label">Final Size</span>
                <span class="score-value">${player.size.toFixed(1)}</span>
            </div>
            <div class="score-item">
                <span class="score-label">Bots Defeated</span>
                <span class="score-value">${botsDefeated}</span>
            </div>
            <div class="score-item">
                <span class="score-label">Time Survived</span>
                <span class="score-value">${Math.floor(timeSurvived/60)}m ${timeSurvived%60}s</span>
            </div>
        </div>
    `;
    
    // Assemble sections in order
    scoreboard.innerHTML = ''; // Clear existing content
    
    // Add ranking section first (at the top)
    scoreboard.appendChild(rankingDiv);
    
    // Add player summary section
    scoreboard.appendChild(finalScoreDiv);
    
    // Add restart button
    const restartButton = document.getElementById('restartBtn') || document.createElement('button');
    restartButton.id = 'restartBtn';
    restartButton.textContent = 'Play Again';
    restartButton.onclick = restartGame;
    scoreboard.appendChild(restartButton);
    
    // Position scoreboard absolutely over the game area
    scoreboard.style.position = 'absolute';
    scoreboard.style.left = '50%';
    scoreboard.style.top = '50%';
    scoreboard.style.transform = 'translate(-50%, -50%)';
    
    // Show scoreboard with fade-in animation
    scoreboard.style.opacity = '0';
    scoreboard.style.display = 'block';
    
    // Force reflow to ensure styles are applied
    forceReflow();
    
    // Fade in the scoreboard
    let opacity = 0;
    const fadeIn = setInterval(() => {
        opacity += 0.05;
        scoreboard.style.opacity = opacity.toString();
        
        if (opacity >= 0.95) {
            clearInterval(fadeIn);
            scoreboard.style.opacity = '0.95'; // Keep slightly transparent to see game
        }
    }, 30);
}

// Helper function to get element symbol
function getElementSymbol(element) {
    switch (element) {
        case 'Water': return '💧';
        case 'Air': return '💨';
        case 'Fire': return '🔥';
        case 'Earth': return '🌱';
        default: return '⚪';
    }
}

// Restart the game
function restartGame() {
    // Hide scoreboard
    const scoreboard = document.getElementById('scoreboard');
    if (scoreboard) {
        scoreboard.style.display = 'none';
        scoreboard.style.opacity = '1'; // Reset opacity for next time
    }
    
    // Reset player state but keep the name
    const playerName = player.name;
    
    // Clear all animations, including the dead player
    animations = [];
    
    // Start new game with the same player name
    startGame();
}

// CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    
    .shake {
        animation: shake 0.3s ease-in-out;
    }
    
    #gameCanvas {
        cursor: default;
    }
    
    #scoreboard {
        background-color: rgba(32, 35, 42, 0.9);
        padding: 30px;
        border-radius: 15px;
        text-align: center;
        width: 80%;
        max-width: 800px;
        margin: 0 auto;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        box-shadow: 0 0 50px rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(8px);
        transition: opacity 0.3s ease;
        z-index: 1000;
        color: white;
        max-height: 90vh;
        overflow-y: auto;
    }
    
    #scoreboard h3 {
        font-size: 28px;
        margin-bottom: 15px;
        text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
    }
    
    #scoreboard h4 {
        font-size: 20px;
        margin: 10px 0;
    }
    
    #final-score {
        margin-bottom: 25px;
    }
    
    .player-summary {
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 20px 0;
    }
    
    .player-avatar {
        width: 70px;
        height: 70px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 30px;
        margin-right: 15px;
        box-shadow: 0 0 15px rgba(255, 255, 255, 0.3);
    }
    
    .player-info {
        text-align: left;
    }
    
    .player-info p {
        margin: 5px 0;
        font-size: 16px;
    }
    
    .score-breakdown {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 20px;
        margin: 20px 0;
    }
    
    .score-item {
        display: flex;
        flex-direction: column;
        background-color: rgba(50, 55, 65, 0.5);
        padding: 10px 15px;
        border-radius: 10px;
        min-width: 100px;
    }
    
    .score-label {
        font-size: 14px;
        color: #ddd;
        margin-bottom: 5px;
    }
    
    .score-value {
        font-size: 22px;
        font-weight: bold;
    }
    
    #current-ranking {
        margin: 20px 0;
        padding: 15px;
        background-color: rgba(40, 44, 52, 0.5);
        border-radius: 10px;
    }
    
    #current-ranking h3 {
        margin-top: 0;
        margin-bottom: 15px;
    }
    
    .rank-summary {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 20px;
        padding: 10px;
        background-color: rgba(60, 60, 70, 0.3);
        border-radius: 8px;
    }
    
    .rank-badge {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        font-size: 24px;
        font-weight: bold;
        margin-right: 20px;
        background-color: #555;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
        border: 2px solid rgba(255, 255, 255, 0.2);
    }
    
    .rank-first {
        background-color: gold;
        color: #222;
        border-color: rgba(255, 215, 0, 0.6);
    }
    
    .rank-second {
        background-color: silver;
        color: #222;
        border-color: rgba(192, 192, 192, 0.6);
    }
    
    .rank-third {
        background-color: #cd7f32; /* Bronze */
        color: #222;
        border-color: rgba(205, 127, 50, 0.6);
    }
    
    .rank-info {
        text-align: left;
    }
    
    .rank-info p {
        margin: 5px 0;
        font-size: 16px;
    }
    
    #current-ranking table {
        width: 100%;
        border-collapse: collapse;
        margin: 5px 0;
        font-size: 14px;
    }
    
    #current-ranking th, #current-ranking td {
        padding: 8px;
        text-align: center;
        border-bottom: 1px solid #555;
    }
    
    #current-ranking th {
        background-color: rgba(60, 60, 70, 0.5);
        font-size: 16px;
        position: relative;
    }
    
    .sub-label {
        font-size: 11px;
        opacity: 0.7;
        font-weight: normal;
    }
    
    #current-ranking .row-even {
        background-color: rgba(60, 65, 75, 0.2);
    }
    
    #current-ranking .row-odd {
        background-color: rgba(50, 55, 65, 0.2);
    }
    
    #current-ranking .current-player {
        background-color: rgba(97, 218, 251, 0.3);
        font-weight: bold;
    }
    
    .water {
        color: #4cc9f0;
        background-color: rgba(76, 201, 240, 0.2);
    }
    
    .fire {
        color: #e63946;
        background-color: rgba(230, 57, 70, 0.2);
    }
    
    .air {
        color: #f8f9fa;
        background-color: rgba(248, 249, 250, 0.2);
    }
    
    .earth {
        color: #70e000;
        background-color: rgba(112, 224, 0, 0.2);
    }
    
    #restartBtn {
        padding: 15px 30px;
        font-size: 20px;
        margin-top: 25px;
        background-color: #e63946;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    }
    
    #restartBtn:hover {
        background-color: #f25a67;
        transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
    }
`;
document.head.appendChild(style);

// Initialize everything when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize after a slight delay to ensure all resources are loaded
    setTimeout(() => {
        initDOMElements();
        
        // Reset the form
        if (playerNameInput) {
            playerNameInput.value = '';
            playerNameInput.focus();
        }
        
        // Ensure the game is initially hidden
        if (gameContainer) {
            gameContainer.style.display = 'none';
        }
        
        // Listen for window resize and adjust canvas
        window.addEventListener('resize', () => {
            if (canvas) {
                // Set a fixed width-to-height ratio (16:9 for widescreen)
                const aspectRatio = 16 / 9;
                
                // Calculate dimensions based on available space
                const maxWidth = window.innerWidth - 40; // Full width minus margins
                const maxHeight = window.innerHeight - 100; // Full height minus margins
                
                // Determine if width or height is the limiting factor
                let canvasWidth, canvasHeight;
                
                if (maxWidth / aspectRatio <= maxHeight) {
                    // Width is the limiting factor
                    canvasWidth = maxWidth;
                    canvasHeight = canvasWidth / aspectRatio;
                } else {
                    // Height is the limiting factor
                    canvasHeight = maxHeight;
                    canvasWidth = canvasHeight * aspectRatio;
                }
                
                // Apply the calculated dimensions
                canvas.style.width = canvasWidth + 'px';
                canvas.style.height = canvasHeight + 'px';
                
                // Force resize and redraw
                resizeCanvas();
                if (gameStarted) {
                    drawGame(); // Redraw after resize
                }
            }
        });
    }, 100);
});

// Draw cursor with proper camera offset
function drawCursor() {
    if (!ctx || !canvas) return;
    
    // Draw cursor in screen space, not world space
    const cursorX = mouseX - camera.x;
    const cursorY = mouseY - camera.y;
    
    // Only draw if cursor is within canvas
    if (cursorX >= 0 && cursorX <= canvas.width && cursorY >= 0 && cursorY <= canvas.height) {
        // Draw a simple crosshair cursor
        ctx.beginPath();
        ctx.arc(cursorX, cursorY, 10, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw crosshair lines
        ctx.beginPath();
        ctx.moveTo(cursorX - 15, cursorY);
        ctx.lineTo(cursorX + 15, cursorY);
        ctx.moveTo(cursorX, cursorY - 15);
        ctx.lineTo(cursorX, cursorY + 15);
        ctx.stroke();
    }
}

// Draw background animations with camera offset
function drawBackgroundAnimations() {
    animations.forEach(anim => {
        // Only draw animations that are visible in the current viewport
        if (!isAnimationVisible(anim)) return;
        
        if (anim.type === 'explosion') {
            // Draw expanding ring
            const progress = anim.elapsed / anim.duration;
            const currentRadius = anim.radius + (anim.maxRadius - anim.radius) * progress;
            const alpha = 1 - progress;
            
            ctx.beginPath();
            ctx.arc(anim.x, anim.y, currentRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `${anim.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Draw particles
            if (anim.particles) {
                for (const particle of anim.particles) {
                    ctx.beginPath();
                    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                    ctx.fillStyle = `${particle.color}${Math.floor(particle.alpha * 255).toString(16).padStart(2, '0')}`;
                    ctx.fill();
                }
            }
        }
    });
}

// Draw foreground animations with camera offset
function drawForegroundAnimations() {
    animations.forEach(anim => {
        // Only draw animations that are visible in the current viewport
        if (!isAnimationVisible(anim)) return;
        
        if (anim.type === 'text') {
            const progress = anim.elapsed / anim.duration;
            const alpha = 1 - progress;
            const yOffset = progress * 30; // Text rises up
            
            ctx.font = `${anim.bold ? 'bold ' : ''}${anim.fontSize}px Arial`;
            ctx.textAlign = 'center';
            
            // Draw text shadow for better visibility
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillText(anim.text, anim.x + 2, anim.y - yOffset + 2);
            
            // Draw main text
            ctx.fillStyle = `${anim.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
            ctx.fillText(anim.text, anim.x, anim.y - yOffset);
        } else if (anim.type === 'growth') {
            const progress = anim.elapsed / anim.duration;
            const alpha = 1 - progress;
            
            ctx.beginPath();
            ctx.arc(anim.x, anim.y, anim.radius * (1 + progress * 0.3), 0, Math.PI * 2);
            ctx.strokeStyle = `${anim.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (anim.type === 'flash') {
            const progress = anim.elapsed / anim.duration;
            const alpha = 1 - progress;
            
            // Draw a big flash that fades quickly
            ctx.beginPath();
            ctx.arc(anim.x, anim.y, anim.radius, 0, Math.PI * 2);
            const gradient = ctx.createRadialGradient(
                anim.x, anim.y, 0,
                anim.x, anim.y, anim.radius
            );
            gradient.addColorStop(0, `${anim.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`);
            gradient.addColorStop(1, `${anim.color}00`);
            ctx.fillStyle = gradient;
            ctx.fill();
        } else if (anim.type === 'ring') {
            const progress = anim.elapsed / anim.duration;
            const currentRadius = anim.radius + (anim.maxRadius - anim.radius) * progress;
            const alpha = 1 - progress;
            
            ctx.beginPath();
            ctx.arc(anim.x, anim.y, currentRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `${anim.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
            ctx.lineWidth = anim.lineWidth || 3;
            ctx.stroke();
        } else if (anim.type === 'deadPlayer') {
            // Draw the dead player entity that persists during death animation
            // This ensures the player remains visible even after the game over state
            const entityRadius = 20 + (anim.size * 5);
            
            // Draw entity body with flickering effect
            ctx.beginPath();
            ctx.arc(anim.x, anim.y, entityRadius, 0, Math.PI * 2);
            
            // Create flickering/fading effect
            const flickerRate = 150; // ms
            const flicker = Math.sin(Date.now() / flickerRate) * 0.3 + 0.7; // Value between 0.4 and 1.0
            
            ctx.fillStyle = `${anim.color}${Math.floor(flicker * 255).toString(16).padStart(2, '0')}`;
            ctx.fill();
            
            // Draw disintegration particles around the dead player
            const particleCount = 5;
            for (let i = 0; i < particleCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = entityRadius * (0.7 + Math.random() * 0.3);
                const particleX = anim.x + Math.cos(angle) * distance;
                const particleY = anim.y + Math.sin(angle) * distance;
                const particleSize = 1 + Math.random() * 3;
                
                ctx.beginPath();
                ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
                ctx.fillStyle = `${anim.color}${Math.floor(Math.random() * 200 + 55).toString(16).padStart(2, '0')}`;
                ctx.fill();
            }
            
            // Draw element icon on the dead player
            drawElementIcon(anim.x, anim.y, anim.element, anim.size * 0.4 + 0.6);
        }
    });
}

// Check if an animation is visible in the current camera view
function isAnimationVisible(anim) {
    // For text, growth, flash, ring animations
    if (anim.x !== undefined && anim.y !== undefined) {
        const radius = anim.radius || anim.maxRadius || 100; // Use a default if not defined
        return (
            anim.x + radius >= camera.x &&
            anim.x - radius <= camera.x + camera.width &&
            anim.y + radius >= camera.y &&
            anim.y - radius <= camera.y + camera.height
        );
    }
    
    // For explosion animations with particles
    if (anim.particles && anim.particles.length > 0) {
        // Check if any particles are visible
        for (const particle of anim.particles) {
            if (
                particle.x >= camera.x &&
                particle.x <= camera.x + camera.width &&
                particle.y >= camera.y &&
                particle.y <= camera.y + camera.height
            ) {
                return true;
            }
        }
    }
    
    return false;
}

// Draw grid lines
function drawGridLines() {
    if (!ctx) return;
    
    const gridSize = 100;
    
    // Calculate grid start and end positions based on camera view
    const startX = Math.floor(camera.x / gridSize) * gridSize;
    const endX = Math.ceil((camera.x + camera.width) / gridSize) * gridSize;
    const startY = Math.floor(camera.y / gridSize) * gridSize;
    const endY = Math.ceil((camera.y + camera.height) / gridSize) * gridSize;
    
    // Draw vertical grid lines
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)';
    ctx.lineWidth = 1;
    
    for (let x = startX; x <= endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
    }
    
    // Draw horizontal grid lines
    for (let y = startY; y <= endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
    }
    
    // Draw major grid lines (every 500 pixels)
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.4)';
    ctx.lineWidth = 2;
    
    for (let x = Math.floor(startX / 500) * 500; x <= endX; x += 500) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
    }
    
    for (let y = Math.floor(startY / 500) * 500; y <= endY; y += 500) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
    }
}

// Draw world boundaries
function drawWorldBoundaries() {
    // Convert world bounds to screen coordinates
    const topLeft = worldToScreen(0, 0);
    const topRight = worldToScreen(worldWidth, 0);
    const bottomLeft = worldToScreen(0, worldHeight);
    const bottomRight = worldToScreen(worldWidth, worldHeight);
    
    // Draw world border
    ctx.beginPath();
    ctx.moveTo(topLeft.x, topLeft.y);
    ctx.lineTo(topRight.x, topRight.y);
    ctx.lineTo(bottomRight.x, bottomRight.y);
    ctx.lineTo(bottomLeft.x, bottomLeft.y);
    ctx.closePath();
    
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Draw corner markers
    const cornerSize = 15;
    
    // Top-left corner
    if (isPointVisible(0, 0)) {
        drawCornerMarker(topLeft.x, topLeft.y, cornerSize, 'top-left');
    }
    
    // Top-right corner
    if (isPointVisible(worldWidth, 0)) {
        drawCornerMarker(topRight.x, topRight.y, cornerSize, 'top-right');
    }
    
    // Bottom-left corner
    if (isPointVisible(0, worldHeight)) {
        drawCornerMarker(bottomLeft.x, bottomLeft.y, cornerSize, 'bottom-left');
    }
    
    // Bottom-right corner
    if (isPointVisible(worldWidth, worldHeight)) {
        drawCornerMarker(bottomRight.x, bottomRight.y, cornerSize, 'bottom-right');
    }
}

// Draw corner marker
function drawCornerMarker(x, y, size, position) {
    ctx.beginPath();
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    
    switch (position) {
        case 'top-left':
            ctx.moveTo(x, y + size);
            ctx.lineTo(x, y);
            ctx.lineTo(x + size, y);
            break;
        case 'top-right':
            ctx.moveTo(x - size, y);
            ctx.lineTo(x, y);
            ctx.lineTo(x, y + size);
            break;
        case 'bottom-left':
            ctx.moveTo(x, y - size);
            ctx.lineTo(x, y);
            ctx.lineTo(x + size, y);
            break;
        case 'bottom-right':
            ctx.moveTo(x - size, y);
            ctx.lineTo(x, y);
            ctx.lineTo(x, y - size);
            break;
    }
    
    ctx.stroke();
}

// Check if a point is visible on screen
function isPointVisible(worldX, worldY) {
    return (
        worldX >= camera.x - 50 &&
        worldX <= camera.x + camera.width + 50 &&
        worldY >= camera.y - 50 &&
        worldY <= camera.y + camera.height + 50
    );
}

// Draw minimap
function drawMinimap() {
    // Minimap settings
    const mapSize = 150;
    const mapPadding = 10;
    const mapX = canvas.width - mapSize - mapPadding;
    const mapY = mapPadding;
    const mapScale = mapSize / worldWidth;
    
    // Draw minimap background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(mapX, mapY, mapSize, mapSize);
    
    // Draw minimap border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mapX, mapY, mapSize, mapSize);
    
    // Draw minimap title
    ctx.fillStyle = 'white';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('WORLD MAP', mapX + mapSize / 2, mapY - 3);
    
    // Draw world dimensions
    ctx.font = '8px Arial';
    ctx.fillText(`${worldWidth}x${worldHeight}`, mapX + mapSize / 2, mapY + mapSize + 10);
    
    // Draw camera viewport on minimap
    const viewX = mapX + camera.x * mapScale;
    const viewY = mapY + camera.y * mapScale;
    const viewWidth = camera.width * mapScale;
    const viewHeight = camera.height * mapScale;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(viewX, viewY, viewWidth, viewHeight);
    
    // Draw player on minimap
    if (player) {
        const playerMapX = mapX + player.x * mapScale;
        const playerMapY = mapY + player.y * mapScale;
        
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(playerMapX, playerMapY, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw bots on minimap
    bots.forEach(bot => {
        const botMapX = mapX + bot.x * mapScale;
        const botMapY = mapY + bot.y * mapScale;
        
        ctx.fillStyle = bot.color;
        ctx.beginPath();
        ctx.arc(botMapX, botMapY, 2, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw compass on minimap
    const compassRadius = 8;
    const compassX = mapX + mapSize - compassRadius - 5;
    const compassY = mapY + compassRadius + 5;
    
    // Draw compass circle
    ctx.beginPath();
    ctx.arc(compassX, compassY, compassRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Draw compass directions
    ctx.fillStyle = 'white';
    ctx.font = '8px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // North
    ctx.fillText('N', compassX, compassY - compassRadius + 3);
    
    // East
    ctx.fillText('E', compassX + compassRadius - 3, compassY);
    
    // South
    ctx.fillText('S', compassX, compassY + compassRadius - 3);
    
    // West
    ctx.fillText('W', compassX - compassRadius + 3, compassY);
}

// Draw UI
function drawUI() {
    // Only draw game UI if playing
    if (gameStarted && !gameOver) {
        // Draw game stats
        const padding = 15;
        const lineHeight = 20;
        
        // Draw semi-transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(padding, padding, 150, 80);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.strokeRect(padding, padding, 150, 80);
        
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        // Calculate game time
        const elapsedTime = Date.now() - gameStartTime;
        const seconds = Math.floor(elapsedTime / 1000);
        const minutes = Math.floor(seconds / 60);
        const displaySeconds = seconds % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}`;
        
        // Draw time
        ctx.fillText(`Time: ${timeString}`, padding + 10, padding + 10);
        
        // Draw player element
        if (player && player.element) {
            ctx.fillText(`Element: ${player.element}`, padding + 10, padding + 10 + lineHeight);
        }
        
        // Draw score
        if (player) {
            ctx.fillText(`Score: ${player.score}`, padding + 10, padding + 10 + lineHeight * 2);
        }
        
        // Draw remaining bots
        ctx.fillText(`Bots: ${bots.length}`, padding + 10, padding + 10 + lineHeight * 3);
    }
}

// Handle key down
function handleKeyDown(event) {
    // Toggle fullscreen with F11
    if (event.key === 'F11') {
        event.preventDefault();
        
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    }
}

// Create player with given name and element
function createPlayer(name, element) {
    const size = 30;
    player = {
        name: name,
        element: element,
        size: size,
        x: worldWidth / 2,  // Center of world, not canvas
        y: worldHeight / 2, // Center of world, not canvas
        speed: 5,
        color: ELEMENT_COLORS[element] || '#CCCCCC',
        score: 0,
        invulnerable: true,
        invulnerableTime: Date.now() + 3000, // 3 seconds of invulnerability
        targetX: worldWidth / 2,
        targetY: worldHeight / 2,
        moving: false,
        botsDefeated: 0,
        elementStats: {
            defeated: { Water: 0, Fire: 0, Earth: 0, Air: 0 },
            defeatedBy: { Water: 0, Fire: 0, Earth: 0, Air: 0 }
        }
    };
    
    // Center camera on player immediately
    camera.x = player.x - camera.width / 2;
    camera.y = player.y - camera.height / 2;
    
    // Keep camera in bounds
    camera.x = Math.max(0, Math.min(worldWidth - camera.width, camera.x));
    camera.y = Math.max(0, Math.min(worldHeight - camera.height, camera.y));
    
    return player;
}

// Create a bot
function createBot() {
    const size = 15 + Math.random() * 25; // Random size between 15 and 40
    const elements = Object.values(ELEMENTS);
    const element = elements[Math.floor(Math.random() * elements.length)];
    
    // Initialize with default position
    let x = Math.random() * worldWidth;
    let y = Math.random() * worldHeight;
    let safePosition = false;
    let attempts = 0;
    
    // Try to find a position away from player and other bots
    while (!safePosition && attempts < 20) {
        // Try to position in one of the corners, far from player
        const cornerIndex = attempts % 4;
        const safeDistance = 200 + (attempts * 10); // Increase distance with each attempt
        
        switch (cornerIndex) {
            case 0: // Top-left
                x = Math.random() * (worldWidth / 4) + 50;
                y = Math.random() * (worldHeight / 4) + 50;
                break;
            case 1: // Top-right
                x = worldWidth - (Math.random() * (worldWidth / 4) + 50);
                y = Math.random() * (worldHeight / 4) + 50;
                break;
            case 2: // Bottom-left
                x = Math.random() * (worldWidth / 4) + 50;
                y = worldHeight - (Math.random() * (worldHeight / 4) + 50);
                break;
            case 3: // Bottom-right
                x = worldWidth - (Math.random() * (worldWidth / 4) + 50);
                y = worldHeight - (Math.random() * (worldHeight / 4) + 50);
                break;
        }
        
        // Check distance from player
        if (player) {
            const dx = x - player.x;
            const dy = y - player.y;
            const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
            
            // Check distance from other bots
            let minDistanceToBots = Infinity;
            for (const bot of bots) {
                const botDx = x - bot.x;
                const botDy = y - bot.y;
                const distanceToBot = Math.sqrt(botDx * botDx + botDy * botDy);
                minDistanceToBots = Math.min(minDistanceToBots, distanceToBot);
            }
            
            // Consider position safe if it's far enough from player and other bots
            safePosition = distanceToPlayer > safeDistance && 
                          (bots.length === 0 || minDistanceToBots > size * 3);
        } else {
            // If player doesn't exist yet, just check other bots
            let minDistanceToBots = Infinity;
            for (const bot of bots) {
                const botDx = x - bot.x;
                const botDy = y - bot.y;
                const distanceToBot = Math.sqrt(botDx * botDx + botDy * botDy);
                minDistanceToBots = Math.min(minDistanceToBots, distanceToBot);
            }
            
            safePosition = bots.length === 0 || minDistanceToBots > size * 3;
        }
        
        attempts++;
    }
    
    return {
        name: 'Bot ' + Math.floor(Math.random() * 1000),
        element: element,
        size: size,
        x: x,
        y: y,
        vx: Math.random() * 6 - 3, // Random velocity between -3 and 3
        vy: Math.random() * 6 - 3,
        speed: 2 + Math.random() * 2, // Random speed between 2 and 4
        color: ELEMENT_COLORS[element],
        directionChangeTime: Math.random() * 1000 + 500, // Random time between direction changes
        lastDirectionChange: 0
    };
}

// Update all bots
function updateBots(deltaTime) {
    for (let i = 0; i < bots.length; i++) {
        const bot = bots[i];
        
        // Randomly change direction
        if (bot.lastDirectionChange > bot.directionChangeTime) {
            bot.vx = Math.random() * 6 - 3;
            bot.vy = Math.random() * 6 - 3;
            bot.lastDirectionChange = 0;
            bot.directionChangeTime = Math.random() * 1000 + 500;
        } else {
            bot.lastDirectionChange += deltaTime;
        }
        
        // Update position
        bot.x += bot.vx * (bot.speed * deltaTime / 16);
        bot.y += bot.vy * (bot.speed * deltaTime / 16);
        
        // Keep in bounds
        keepEntityInBounds(bot);
    }
}

// Keep any entity within the game world boundaries
function keepEntityInBounds(entity) {
    if (entity.x - entity.size < 0) {
        entity.x = entity.size;
        if (entity !== player) entity.vx *= -1; // Bounce bots
    } else if (entity.x + entity.size > worldWidth) {
        entity.x = worldWidth - entity.size;
        if (entity !== player) entity.vx *= -1;
    }
    
    if (entity.y - entity.size < 0) {
        entity.y = entity.size;
        if (entity !== player) entity.vy *= -1;
    } else if (entity.y + entity.size > worldHeight) {
        entity.y = worldHeight - entity.size;
        if (entity !== player) entity.vy *= -1;
    }
}

// Update player position based on mouse
function updatePlayerPosition() {
    if (!player || gameOver) return;
    
    // Calculate distance and direction to target (mouse position)
    const dx = player.targetX - player.x;
    const dy = player.targetY - player.y;
    const distanceToTarget = Math.sqrt(dx * dx + dy * dy);
    
    // Initialize momentum properties if they don't exist
    if (player.vx === undefined) player.vx = 0;
    if (player.vy === undefined) player.vy = 0;
    
    // Define a deadzone where player doesn't move (smaller for better responsiveness)
    const deadzone = 5; // Reduced from 10 to 5 for even better responsiveness
    
    // Track if player is moving
    player.moving = distanceToTarget > deadzone;
    
    // Only move if target is outside deadzone
    if (player.moving) {
        // Normalize direction vector
        const dirX = dx / distanceToTarget;
        const dirY = dy / distanceToTarget;
        
        // Calculate speed factor based on size (larger players move slower, but not too slow)
        const speedFactor = Math.max(0.6, 1.3 / (0.8 + player.size * 0.2)); // Refined scaling formula
        
        // Calculate base move speed
        const baseSpeed = player.speed * speedFactor;
        
        // Calculate acceleration - faster when farther away
        const accelFactor = Math.min(1, distanceToTarget / 200); // Scales up to maximum at 200 pixels away
        const acceleration = 0.2 * accelFactor;
        
        // Apply momentum with acceleration toward target direction
        player.vx += (dirX * baseSpeed - player.vx) * acceleration;
        player.vy += (dirY * baseSpeed - player.vy) * acceleration;
        
        // Apply slight deceleration when close to target
        if (distanceToTarget < 50) {
            const decelerationFactor = 1 - (50 - distanceToTarget) / 50 * 0.5;
            player.vx *= decelerationFactor;
            player.vy *= decelerationFactor;
        }
        
        // Apply movement with velocity
        player.x += player.vx;
        player.y += player.vy;
        
        // Keep player in bounds
        keepEntityInBounds(player);
    } else {
        // Apply friction to slow down when in deadzone
        player.vx *= 0.8;
        player.vy *= 0.8;
        
        // If velocity is very small, stop completely
        if (Math.abs(player.vx) < 0.1 && Math.abs(player.vy) < 0.1) {
            player.vx = 0;
            player.vy = 0;
        } else {
            // Apply remaining velocity
            player.x += player.vx;
            player.y += player.vy;
            
            // Keep player in bounds
            keepEntityInBounds(player);
        }
    }
}

// Check if player invulnerability has expired
function updatePlayerInvulnerability() {
    if (player && player.invulnerable) {
        const currentTime = Date.now();
        if (currentTime - player.invulnerableStart > player.invulnerableTime) {
            player.invulnerable = false;
        }
    }
}

// Convert screen coordinates to world coordinates
function screenToWorld(screenX, screenY) {
    return {
        x: screenX + camera.x,
        y: screenY + camera.y
    };
}

// Convert world coordinates to screen coordinates
function worldToScreen(worldX, worldY) {
    return {
        x: worldX - camera.x,
        y: worldY - camera.y
    };
}

// Draw an entity (player or bot)
function drawEntity(entity) {
    if (!ctx) return;
    
    // Scale entity radius based on size
    const radius = 20 + (entity.size * 5);
    
    // Draw main entity circle
    ctx.beginPath();
    ctx.arc(entity.x, entity.y, radius, 0, Math.PI * 2);
    
    // Apply color based on entity type and state
    if (entity === player && player.invulnerable) {
        // Simple pulsing effect for invulnerability
        const pulseTime = Date.now() * 0.005;
        const pulseValue = 0.5 + Math.sin(pulseTime) * 0.3; // Value between 0.2 and 0.8
        ctx.fillStyle = entity.color + Math.floor(pulseValue * 255).toString(16).padStart(2, '0');
        
        // Draw simple invulnerability shield
        ctx.save();
        ctx.globalAlpha = 0.3 + Math.sin(pulseTime * 2) * 0.15;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    } else {
        ctx.fillStyle = entity.color;
    }
    
    ctx.fill();
    
    // Draw entity name above it
    ctx.font = '14px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(entity.name || 'Unknown', entity.x, entity.y - radius - 10);
    
    // Draw element icon in the middle
    if (entity.element) {
        drawElementIcon(entity.x, entity.y, entity.element, entity.size * 0.2 + 0.6);
    }
}

// Draw element icon for an entity
function drawElementIcon(x, y, element, scale) {
    if (!ctx || !element) return;
    
    const icon = ELEMENT_ICONS[element] || '❓';
    const fontSize = Math.max(10, 16 * scale);
    
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, x, y);
}

// Get element color from element name
function getElementColor(element) {
    if (!element) return '#CCCCCC';
    return ELEMENT_COLORS[element] || '#888888';
}

// ... existing code ... 