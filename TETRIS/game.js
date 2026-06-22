const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level-display');
const clearSound = document.getElementById('clear-sound');

// Next Piece Setup
const nextCanvas = document.getElementById('next-piece');
const nextContext = nextCanvas.getContext('2d');

context.scale(20, 20);
nextContext.scale(20, 20); 

// --- Core Game Variables ---
let arena = createMatrix(12, 20);
let player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    score: 0,
    level: 0
};

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let paused = false;
let gameLoopStarted = false;
let hasCrashed = false; // System crash flag

// Randomizer Bag
let pieceBag = [];
let nextPieceMatrix = null;

// --- Randomizer Logic (3 of each piece) ---
function fillBag() {
    const pieces = 'TJLOSZI';
    for (let i = 0; i < 3; i++) {
        for (let p of pieces) {
            pieceBag.push(TETROMINOES[p]);
        }
    }
    for (let i = pieceBag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pieceBag[i], pieceBag[j]] = [pieceBag[j], pieceBag[i]];
    }
}

function getNextPiece() {
    if (pieceBag.length === 0) fillBag();
    return pieceBag.pop();
}

function drawNextPiece() {
    nextContext.fillStyle = '#000';
    nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if (!nextPieceMatrix) return;

    const offset = {
        x: (4 - nextPieceMatrix[0].length) / 2,
        y: (4 - nextPieceMatrix.length) / 2
    };

    const currentColors = getLevelColors(player.level);

    nextPieceMatrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                nextContext.fillStyle = currentColors[value];
                nextContext.fillRect(x + offset.x, y + offset.y, 1, 1);
                
                if (player.level < 138 || player.level >= 255) {
                    nextContext.strokeStyle = 'rgba(255,255,255,0.5)';
                    nextContext.lineWidth = 0.05;
                    nextContext.strokeRect(x + offset.x + 0.1, y + offset.y + 0.1, 0.8, 0.8);
                }
            }
        });
    });
}

// --- Event Listeners from Settings/UI ---
document.addEventListener('tetrisStart', (e) => {
    player.level = e.detail.level;
    dropInterval = e.detail.speed;
    
    arena.forEach(row => row.fill(0));
    player.score = 0;
    pieceBag = []; 
    nextPieceMatrix = null;
    hasCrashed = false;

    updateScore();
    updateLevelDisplay();
    playerReset();
    
    paused = false;
    if (!gameLoopStarted) {
        gameLoopStarted = true;
        update(); 
    }
});

document.addEventListener('tetrisPause', (e) => {
    paused = e.detail; 
    const statusText = document.getElementById('status-text');
    if (statusText) {
        statusText.innerText = paused ? "PAUSED" : "ONLINE";
    }
});

// --- Game Logic Functions ---
function createMatrix(w, h) {
    const matrix = [];
    while (h--) { matrix.push(new Array(w).fill(0)); }
    return matrix;
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
               (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function arenaSweep() {
    let rowCount = 1;
    let cleared = false;
    outer: for (let y = arena.length - 1; y >= 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) continue outer;
        }
        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;
        
        player.score += Math.pow(rowCount, 2) * 10;
        rowCount *= 2;
        cleared = true;
    }

    if (cleared) {
        clearSound.currentTime = 0;
        clearSound.play();
        scoreElement.classList.remove('score-up');
        void scoreElement.offsetWidth; 
        scoreElement.classList.add('score-up');
        
        checkLevelUp();
        updateScore();
    }
}

function checkLevelUp() {
    let targetLevel = Math.floor((player.score - 100) / 110);
    
    if (targetLevel > player.level && targetLevel > 0) {
        player.level = targetLevel;
        
        // The Rebirth
        if (player.level >= 255) {
            player.level = 0;
        }
        
        updateLevelDisplay();
        
        // Speed scaling & Kill Screen (1 block per frame)
        if (player.level >= 29) {
            dropInterval = 17; // ~60fps
        } else {
            dropInterval = Math.max(50, 1000 * Math.pow(0.85, player.level));
        }

        document.dispatchEvent(new CustomEvent('tetrisLevelUp', { 
            detail: { level: player.level } 
        }));
    }
}

function drawMatrix(matrix, offset, alpha = 1) {
    const currentColors = getLevelColors(player.level);
    
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.globalAlpha = alpha;
                context.fillStyle = currentColors[value];
                context.fillRect(x + offset.x, y + offset.y, 1, 1);
                
                // Only draw white borders if the phase isn't invisible
                if (player.level < 138 || player.level >= 255) {
                    context.strokeStyle = 'rgba(255,255,255,0.5)';
                    context.lineWidth = 0.05;
                    context.strokeRect(x + offset.x + 0.1, y + offset.y + 0.1, 0.8, 0.8);
                }
                context.globalAlpha = 1;
            }
        });
    });
}

function getGhostPos() {
    const ghost = { matrix: player.matrix, pos: { x: player.pos.x, y: player.pos.y } };
    while (!collide(arena, ghost)) { ghost.pos.y++; }
    ghost.pos.y--;
    return ghost.pos;
}

function draw() {
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    drawMatrix(arena, { x: 0, y: 0 });
    if (player.matrix) {
        drawMatrix(player.matrix, getGhostPos(), 0.15);
        drawMatrix(player.matrix, player.pos);
    }
}

// Hard Drop command
function playerHardDrop() {
    while (!collide(arena, player)) {
        player.pos.y++;
    }
    player.pos.y--; // step back up out of the floor
    merge(arena, player);
    playerReset();
    arenaSweep();
    dropCounter = 0;
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
    }
    dropCounter = 0;
}

function playerMove(offset) {
    player.pos.x += offset;
    if (collide(arena, player)) { player.pos.x -= offset; }
}

function playerReset() {
    if (!nextPieceMatrix) {
        nextPieceMatrix = getNextPiece();
    }
    
    player.matrix = nextPieceMatrix;
    nextPieceMatrix = getNextPiece();
    
    // Check redraw so next box stays updated
    drawNextPiece();

    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
    
    if (collide(arena, player)) {
        paused = true;
        document.dispatchEvent(new CustomEvent('tetrisGameOver', { 
            detail: { score: player.score } 
        }));
    }
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    dir > 0 ? matrix.forEach(row => row.reverse()) : matrix.reverse();
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

function update(time = 0) {
    // CRASH POINT logic (155 - 157)
    if (player.level >= 155 && player.level <= 157) {
        hasCrashed = true;
        // Simulate hardware crash visual noise
        context.fillStyle = ['#ff0055', '#00ffcc', '#ffffff', '#000'][Math.random() * 4 | 0];
        context.fillRect(Math.random() * 12, Math.random() * 20, Math.random() * 4, Math.random() * 4);
        requestAnimationFrame(update);
        return; // Halt core gameplay updates
    }

    if (!paused && !hasCrashed) {
        const deltaTime = time - lastTime;
        lastTime = time;
        dropCounter += deltaTime;
        
        if (dropCounter > dropInterval) { 
            playerDrop(); 
        }
        draw();
    } else {
        lastTime = time; 
    }
    requestAnimationFrame(update);
}

function updateScore() {
    scoreElement.innerText = player.score.toString().padStart(6, '0');
}

function updateLevelDisplay() {
    if (!levelElement) return;

    // Glitch Phase (30 - 137)
    if (player.level >= 30 && player.level <= 137) {
        // Deterministic glitch generation based on level
        const chars = "0123456789ABCDEF!#%&?@";
        const c1 = chars[(player.level * 3) % chars.length];
        const c2 = chars[(player.level * 7) % chars.length];
        levelElement.innerText = c1 + c2;
    } else {
        levelElement.innerText = player.level.toString().padStart(2, '0');
    }
}

document.addEventListener('keydown', event => {
    if (paused || hasCrashed) return; 

    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].indexOf(event.key) > -1) {
        event.preventDefault();
    }

    if (event.key === 'ArrowLeft') {
        playerMove(-1);
    } else if (event.key === 'ArrowRight') {
        playerMove(1);
    } else if (event.key === 'ArrowDown') {
        playerDrop();
    } else if (event.key === ' ') {
        playerHardDrop();
    } else if (event.key.toLowerCase() === 'q') {
        playerRotate(-1);
    } else if (event.key.toLowerCase() === 'e' || event.key === 'ArrowUp') {
        playerRotate(1);
    }
});

// Initial Render
draw();
updateScore();
updateLevelDisplay();