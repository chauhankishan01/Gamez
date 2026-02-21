const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameActive = false;
let score = 0;
let bossMode = false;
let spawnTimer = 0; // Fixed spawn logic
const keys = {};

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const player = {
    x: 0, y: 0, size: 22, hp: 100, bullets: [],
    init() {
        this.x = canvas.width / 2;
        this.y = canvas.height - 100;
        this.hp = 100;
        this.bullets = [];
    },
    update() {
        if (keys['KeyW'] || keys['ArrowUp']) this.y -= 7;
        if (keys['KeyS'] || keys['ArrowDown']) this.y += 7;
        if (keys['KeyA'] || keys['ArrowLeft']) this.x -= 7;
        if (keys['KeyD'] || keys['ArrowRight']) this.x += 7;
        
        this.x = Math.max(this.size, Math.min(canvas.width - this.size, this.x));
        this.y = Math.max(this.size, Math.min(canvas.height - this.size, this.y));
    },
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.shadowBlur = 20; ctx.shadowColor = '#00f2ff';
        ctx.fillStyle = '#00f2ff';
        ctx.beginPath();
        ctx.moveTo(0, -25); ctx.lineTo(-20, 15); ctx.lineTo(20, 15);
        ctx.fill();
        ctx.restore();
    },
    shoot() { this.bullets.push({ x: this.x, y: this.y - 20 }); }
};

// --- MOBILE TOUCH HANDLING ---
let lastX, lastY;
canvas.addEventListener('touchstart', e => {
    if(!gameActive) return;
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
}, { passive: false });

canvas.addEventListener('touchmove', e => {
    if(!gameActive) return;
    e.preventDefault();
    const touch = e.touches[0];
    player.x += (touch.clientX - lastX) * 1.4;
    player.y += (touch.clientY - lastY) * 1.4;
    lastX = touch.clientX;
    lastY = touch.clientY;
}, { passive: false });

document.getElementById('mobile-fire-btn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    player.shoot();
});

// --- CORE GAME LOGIC ---
const enemies = [];
const stars = Array.from({length: 80}, () => ({
    x: Math.random() * canvas.width, 
    y: Math.random() * canvas.height, 
    s: Math.random() * 2
}));

function handleSpawning() {
    spawnTimer++;
    // Adjust spawn rate based on score
    let spawnRate = Math.max(20, 60 - Math.floor(score / 500));
    
    if (score >= 7000 && !bossMode) {
        bossMode = true;
        enemies.push({ x: canvas.width/2, y: -100, size: 75, hp: 80, isBoss: true, dir: 4 });
    } else if (!bossMode && spawnTimer >= spawnRate) {
        enemies.push({ x: Math.random() * canvas.width, y: -50, size: 22, hp: 1, isBoss: false });
        spawnTimer = 0;
    }
}

function update() {
    if (!gameActive) return;

    player.update();
    handleSpawning();
    
    stars.forEach(s => {
        s.y += s.s + 1;
        if(s.y > canvas.height) s.y = -5;
    });

    player.bullets.forEach((b, i) => {
        b.y -= 15;
        if (b.y < 0) player.bullets.splice(i, 1);
    });

    enemies.forEach((en, ei) => {
        if (en.isBoss) {
            en.y += (120 - en.y) * 0.05; // Boss enters smoothly
            en.x += en.dir;
            if (en.x > canvas.width - 75 || en.x < 75) en.dir *= -1;
        } else {
            en.y += 4.5;
        }

        player.bullets.forEach((b, bi) => {
            if (Math.hypot(b.x - en.x, b.y - en.y) < en.size + 15) {
                en.hp--;
                player.bullets.splice(bi, 1);
                if (en.hp <= 0) {
                    score += en.isBoss ? 3000 : 100;
                    enemies.splice(ei, 1);
                    if (en.isBoss) bossMode = false;
                }
            }
        });

        if (Math.hypot(player.x - en.x, player.y - en.y) < en.size + 20) {
            player.hp -= en.isBoss ? 1 : 10; // Taking heavy damage from enemies
            if (player.hp <= 0) endGame(false);
        }
        if (en.y > canvas.height + 150) enemies.splice(ei, 1);
    });

    if (score >= 10000) endGame(true);
}

function draw() {
    if (!gameActive) return;

    ctx.fillStyle = '#00050a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#fff';
    stars.forEach(s => ctx.fillRect(s.x, s.y, s.s, s.s));

    player.draw();
    
    player.bullets.forEach(b => {
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 10; ctx.shadowColor = 'yellow';
        ctx.fillRect(b.x - 2, b.y, 4, 18);
    });

    enemies.forEach(en => {
        ctx.shadowBlur = 20; ctx.shadowColor = en.isBoss ? '#ff0055' : '#ffa500';
        ctx.fillStyle = ctx.shadowColor;
        ctx.beginPath(); ctx.arc(en.x, en.y, en.size, 0, Math.PI*2); ctx.fill();
        // Boss HP bar
        if (en.isBoss) {
            ctx.fillStyle = 'white';
            ctx.fillRect(en.x - 40, en.y - 90, 80, 5);
            ctx.fillStyle = '#ff0055';
            ctx.fillRect(en.x - 40, en.y - 90, (en.hp / 80) * 80, 5);
        }
    });
    ctx.shadowBlur = 0;

    document.getElementById('score-val').innerText = score.toString().padStart(5, '0');
    document.getElementById('health-fill').style.width = player.hp + '%';

    update();
    requestAnimationFrame(draw);
}

function endGame(win) {
    gameActive = false;
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('status-screen').classList.remove('hidden');
    document.getElementById('status-title').innerText = win ? "MISSION COMPLETE" : "PILOT DOWN";
    document.getElementById('resume-btn').classList.add('hidden');
    document.getElementById('restart-btn').classList.remove('hidden');
}

window.addEventListener('keydown', e => { 
    keys[e.code] = true; 
    if(e.code === 'Space' && gameActive) player.shoot(); 
});
window.addEventListener('keyup', e => keys[e.code] = false);

document.getElementById('start-btn').onclick = () => {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    score = 0; bossMode = false; enemies.length = 0; spawnTimer = 0;
    player.init();
    gameActive = true;
    draw();
};

document.getElementById('pause-btn').onclick = () => {
    gameActive = false;
    document.getElementById('status-screen').classList.remove('hidden');
    document.getElementById('status-title').innerText = "SYSTEM PAUSED";
    document.getElementById('resume-btn').classList.remove('hidden');
};

document.getElementById('resume-btn').onclick = () => {
    gameActive = true;
    document.getElementById('status-screen').classList.add('hidden');
    draw(); // Restart the loop
};

document.getElementById('restart-btn').onclick = () => location.reload();