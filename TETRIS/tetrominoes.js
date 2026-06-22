// NES-inspired Tetris Palettes (Cycles every 10 levels)
// Format: [Primary, Secondary, Accent/White]
const NES_PALETTES = [
    ['#0058F8', '#3CBCFC', '#FFFFFF'], // 0: Blue / Light Blue
    ['#00A800', '#B8F818', '#FFFFFF'], // 1: Green / Chartreuse
    ['#D800CC', '#F878F8', '#FFFFFF'], // 2: Pink / Light Pink
    ['#0058F8', '#58D854', '#FFFFFF'], // 3: Blue / Green
    ['#E40058', '#58FF54', '#FFFFFF'], // 4: Pink / Green
    ['#58F898', '#6888FC', '#FFFFFF'], // 5: Light Cyan / Light Purple
    ['#F83800', '#7C7C7C', '#FFFFFF'], // 6: Red / Gray
    ['#6844FC', '#A80020', '#FFFFFF'], // 7: Purple / Dark Red
    ['#0058F8', '#F83800', '#FFFFFF'], // 8: Blue / Red
    ['#F83800', '#FFA044', '#FFFFFF']  // 9: Red / Orange
];

const randint = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

function randomizeList(Listin) {
    let inputList = Listin;
    // We loop backwards through the list
    for (let i = inputList.length - 1; i > 0; i--) {
        // Use your randint to pick an index from 0 to i
        const j = randint(0, i);
        
        // Swap elements at i and j
        [inputList[i], inputList[j]] = [inputList[j], inputList[i]];
    }
    return inputList;
}

const listOfColorIndexes = randomizeList([0, 0, 0, 1, 1, 1, 2])

// Returns the color array based on the current level phase
function getLevelColors(level) {
    // Phase: Invisible Levels (138+)
    if (level >= 138 && level < 255) {
        // Barely visible ghosts of blocks
        return Array(8).fill('rgba(20, 20, 30, 0.15)'); 
    }

    const palette = NES_PALETTES[level % 10];

    const numbers = listOfColorIndexes;
    
    // Map the 3-color palette to the 7 Tetris pieces
    return [
        null,
        palette[numbers[0]], // T
        palette[numbers[1]], // O
        palette[numbers[2]], // L
        palette[numbers[3]], // J
        palette[numbers[4]], // I
        palette[numbers[5]], // S
        palette[numbers[6]]  // Z
    ];
}

// The shapes represented as 2D arrays
const TETROMINOES = {
    'T': [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    'O': [
        [2, 2],
        [2, 2]
    ],
    'L': [
        [0, 3, 0],
        [0, 3, 0],
        [0, 3, 3]
    ],
    'J': [
        [0, 4, 0],
        [0, 4, 0],
        [4, 4, 0]
    ],
    'I': [
        [0, 5, 0, 0],
        [0, 5, 0, 0],
        [0, 5, 0, 0],
        [0, 5, 0, 0]
    ],
    'S': [
        [0, 6, 6],
        [6, 6, 0],
        [0, 0, 0]
    ],
    'Z': [
        [7, 7, 0],
        [0, 7, 7],
        [0, 0, 0]
    ]
};