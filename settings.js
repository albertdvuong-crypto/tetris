// settings.js

const NES_SPEEDS = {
    0: 800, 1: 717, 2: 633, 3: 550, 4: 467, 5: 383, 6: 300, 7: 217, 8: 133, 9: 100,
    10: 83, 11: 83, 12: 83, 13: 67, 14: 67, 15: 67, 16: 50, 17: 50, 18: 50,
    19: 33, 20: 33, 21: 33, 22: 33, 23: 33, 24: 33, 25: 33, 26: 33, 27: 33, 28: 33,
    29: 17
};

const musicTracks = {
    cyberpunk: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    classic: "https://ia800504.us.archive.org/33/items/TetrisThemeMusic/Tetris.mp3" 
};

document.addEventListener('DOMContentLoaded', () => {
    // --- UI Element References ---
    const overlay = document.getElementById('overlay');
    const menu = document.querySelector('.menu');
    const levelScreen = document.getElementById('level-screen');
    const levelGrid = document.getElementById('level-grid');
    const hsList = document.getElementById('high-scores-list');
    
    // Modals
    const pauseModal = document.getElementById('pause-modal');
    const settingsModal = document.getElementById('settings-modal');
    const gameOverModal = document.getElementById('game-over-modal');
    
    // Buttons
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-trigger');
    const settingsBtn = document.getElementById('settings-trigger');
    const resumeBtn = document.getElementById('resume-btn');
    const saveSettingsBtn = document.getElementById('save-settings');
    const restartBtns = [document.getElementById('restart-btn'), document.getElementById('retry-btn')];
    const quitBtn = document.getElementById('quit-btn');

    // Audio
    const bgm = document.getElementById('bgm');
    const clearSound = document.getElementById('clear-sound');
    const volumeSlider = document.getElementById('volume-slider');
    const musicToggle = document.getElementById('music-toggle');
    const trackSelect = document.getElementById('track-select');

    // --- Data Persistence (JSON Storage Logic) ---

    // Levels: Defaults to 0 if no data exists
    const getUnlockedLevel = () => parseInt(localStorage.getItem('neon_tetris_level')) || 0;
    
    const unlockLevel = (lvl) => {
        if (lvl > getUnlockedLevel()) {
            localStorage.setItem('neon_tetris_level', lvl);
        }
    };

    // High Scores
    const getHighScores = () => {
        const data = localStorage.getItem('neon_tetris_scores');
        return data ? JSON.parse(data) : [0, 0, 0];
    };

    const saveHighScore = (newScore) => {
        let scores = getHighScores();
        scores.push(newScore);
        scores.sort((a, b) => b - a); // Sort descending
        scores = scores.slice(0, 3);   // Keep top 3
        localStorage.setItem('neon_tetris_scores', JSON.stringify(scores));
        renderHighScores();
    };

    const renderHighScores = () => {
        const scores = getHighScores();
        hsList.innerHTML = scores.map((s, i) => `<div>${i + 1}. ${s.toString().padStart(6, '0')}</div>`).join('');
    };

    // Settings
    const defaultSettings = { volume: 0.5, muted: false, track: 'cyberpunk' };
    
    const loadSettings = () => {
        const saved = JSON.parse(localStorage.getItem('neon_tetris_settings')) || defaultSettings;
        
        volumeSlider.value = saved.volume;
        bgm.volume = saved.volume;
        clearSound.volume = saved.volume;

        bgm.muted = saved.muted;
        updateMuteButtonUI();

        trackSelect.value = saved.track;
        bgm.src = musicTracks[saved.track];
    };

    const saveCurrentSettings = () => {
        const currentSettings = {
            volume: parseFloat(volumeSlider.value),
            muted: bgm.muted,
            track: trackSelect.value
        };
        localStorage.setItem('neon_tetris_settings', JSON.stringify(currentSettings));
    };

    const updateMuteButtonUI = () => {
        musicToggle.innerText = bgm.muted ? "UNMUTE" : "MUTE";
        musicToggle.style.color = bgm.muted ? "var(--neon-teal, #00ffff)" : "var(--neon-pink, #ff00ff)";
    };

    // --- Level Selection UI ---
    const renderLevelGrid = () => {
        levelGrid.innerHTML = '';
        const maxUnlocked = getUnlockedLevel();
        
        for (let i = 0; i <= 29; i++) {
            const btn = document.createElement('button');
            btn.classList.add('level-btn');
            if (i > maxUnlocked) btn.classList.add('locked');
            
            btn.innerText = i;
            btn.onclick = () => {
                if (i <= maxUnlocked) startGameAtLevel(i);
            };
            levelGrid.appendChild(btn);
        }
    };

    // --- Game Navigation & Pause Logic ---
    function togglePause(shouldPause) {
        document.dispatchEvent(new CustomEvent('tetrisPause', { detail: shouldPause }));
    }

    startBtn.onclick = () => {
        menu.classList.add('hidden');
        levelScreen.classList.remove('hidden');
        renderLevelGrid();
    };

    function startGameAtLevel(level) {
        overlay.classList.add('hidden');
        const dropInterval = NES_SPEEDS[level] || 17;
        
        document.dispatchEvent(new CustomEvent('tetrisStart', { 
            detail: { level: level, speed: dropInterval } 
        }));
        
        bgm.play().catch(e => console.log("Audio waiting for interaction"));
    }

    // Pause Control
    pauseBtn.onclick = () => {
        pauseModal.classList.remove('modal-hidden');
        togglePause(true);
    };

    resumeBtn.onclick = () => {
        pauseModal.classList.add('modal-hidden');
        togglePause(false);
    };

    // Settings Control
    settingsBtn.onclick = () => {
        settingsModal.classList.remove('modal-hidden');
        togglePause(true);
    };

    saveSettingsBtn.onclick = () => {
        settingsModal.classList.add('modal-hidden');
        if (pauseModal.classList.contains('modal-hidden')) {
            togglePause(false);
        }
    };

    // Global Reset Actions
    const reloadGame = () => location.reload();
    restartBtns.forEach(btn => btn.onclick = reloadGame);
    quitBtn.onclick = reloadGame;

    // --- Event Listeners from game.js ---
    document.addEventListener('tetrisGameOver', (e) => {
        saveHighScore(e.detail.score);
        document.getElementById('final-score').innerText = e.detail.score.toString().padStart(6, '0');
        gameOverModal.classList.remove('modal-hidden');
    });

    document.addEventListener('tetrisLevelUp', (e) => {
        unlockLevel(e.detail.level);
    });

    // --- Audio Controls ---
    volumeSlider.oninput = (e) => {
        bgm.volume = e.target.value;
        clearSound.volume = e.target.value;
        saveCurrentSettings();
    };

    musicToggle.onclick = () => {
        bgm.muted = !bgm.muted;
        updateMuteButtonUI();
        saveCurrentSettings();
    };

    trackSelect.onchange = (e) => {
        bgm.src = musicTracks[e.target.value];
        bgm.play();
        saveCurrentSettings();
    };

    // Initial load
    loadSettings();
    renderHighScores();
});