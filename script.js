let points = 0;
let lastHiddenTime = 0;
let visibleStartTime = Date.now();
let witherTimer = 0;
let currentTool = null;
let toolCost = 0;
let garden = Array(9).fill({type: null});
const WITHER_LIMIT_MS = 30000;
const PLANT_STATS = {
    flower: {cost: 10, growTime: 20, sellPrice: 40, emoji: '🌸'},
    tree: {cost: 50, growTime: 120, sellPrice: 200, emoji: '🌳'}
}
const DOM = {
    points: document.getElementById('focus-points'),
    status: document.getElementById('status-message'),
    garden: document.getElementById('garden-grid'),
    witherBar: document.getElementById('wither-bar'),
    body: document.body
};

function init() {
    const saved = localStorage.getItem('tabGardenSave_v2');
    if (saved) {
        const data = JSON.parse(saved);
        points = data.points || 0;
        garden = data.garden || Array(9).fill(null);
    }   
    updatePointsDisplay();
    renderGarden();
    requestAnimationFrame(gameLoop);
}
document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        lastHiddenTime = Date.now();
        DOM.status.innerText = "Growing resources...";
        document.title = "Growing...";
        resetWither();
    } else {
        if (lastHiddenTime > 0) {
            const now = Date.now();
            const secondsAway = Math.floor((now - lastHiddenTime) / 1000);
            if (secondsAway > 0) {
                processGrowth(secondsAway);
                points += secondsAway;
                DOM.status.innerText = `Welcome back, you gained ${secondsAway} focus points.`;
                saveGame();
            }
        }
        visibleStartTime = Date.now();
        document.title = "Tab Garden";
        updatePointsDisplay();
        renderGarden();
    }
});
function processGrowth(seconds) {
    garden = garden.map(plot => {
        if (plot && plot.stage === 'growing') {
            plot.growth += seconds;
            if (plot.growth >= plot.maxGrowth) {
                plot.growth = plot.maxGrowth;
                plot.stage = 'ripe';
            }
        }
        return plot;
    });
}
function gameLoop() {
    if (!document.hidden) {
        const now = Date.now();
        const visibleDuration = now - visibleStartTime;
        const percent = Math.min(100, (visibleDuration / WITHER_LIMIT_MS) * 100);
        DOM.witherBar.style.width = `${percent}%`;
        if (percent > 80) {
            DOM.body.style.backgroundColor = '#fff0f0';
            DOM.status.innerText = "Danger! Your plants are going to wither!";
        } else {
            DOM.body.style.backgroundColor = '#f4f9f4';
        }
        if (visibleDuration > WITHER_LIMIT_MS) {
            witherGarden();
            visibleStartTime = now;
        }
    }
    requestAnimationFrame(gameLoop);
}
function resetWither() {
    DOM.witherBar.style.width = '0%';
    DOM.body.style.backgroundColor = '#f4f9f4';
}
function witherGarden() {
    let changed = false;
    garden = garden.map(plot => {
        if (plot.type && plot.type !== 'withered') {
            changed = true;
            return {...plot, stage: 'withered'};
        }
        return plot;
    });
    if (changed) {
        DOM.status.innerText = "Oh no! You procrastinated for too long. The garden withered. :(";
        renderGarden();
        saveGame();
    }
}
window.selectTool = function(tool, cost) {
    if (currentTool === tool) {
        currentTool = null;
        toolCost = 0;
    } else {
        currentTool = tool;
        toolCost = cost;
    }
    updateShopUI();
};
window.useWater = function() {
    const cost = 5;
    if (points >= cost) {
        points -= cost;
        visibleStartTime = Date.now();
        DOM.witherBar.style.width = '0%';
        DOM.body.style.backgroundColor = '#f5f5f5';
        DOM.status.textContent = "Timer has been reset. It's time to get off this page";
        updatePointsDisplay();
        saveGame();
    } else {
        alert("Not enough points to water!");
    }
}
window.selectSeed = function(type, cost) {
    if (currentTool === type) {
        currentTool = null;
        toolCost = 0;
        updateShopUI();
        return;
    }
    currentTool = type;
    toolCost = cost;
    updateShopUI();
};
function updateShopUI() {
    document.querySelectorAll('.shop button').forEach(button => button.classList.remove('selected'));
    if (currentTool) {
        document.getElementById(`button-${currentTool}`).classList.add('selected');
    }
}
function handlePlotClick(index) {
    if (!currentTool) {
        DOM.status.innerText = "Select a tool first";
        return;
    }
    const plot = garden[index];
    if (currentTool === 'clear') {
        if (!plot) return;
        if (points >= toolCost) {
            points -= toolCost;
            garden[index] = null;
            finishAction("Plot cleared.");
        } else {
            alert("Not enough points to clear!");
        }
        return;
    }
    if (currentTool === 'harvest') {
        if (!plot) return;
        if (plot.stage === 'ripe') {
            const profit = PLANT_STATS[plot.type].sellPrice;
            points += profit;
            garden[index] = null;
            finishAction("Harvested! Earned ${profit} points!");
            triggerConfetti();
        } else if (plot.stage === 'growing') {
            DOM.status.innerText = "Not ready yet! Go do some work.";
        } else if (plot.stage === 'withered') {
            DOM.status.innerText = "It's dead. Use the Clear tool to remove it."
        }
        return;
    }
    if (!plot) {
        if (points >= toolCost) {
            points -= toolCost;
            const stats = PLANT_STATS[currentTool];
            garden[index] = {
                type: currentTool,
                stage: 'growing',
                growth: 0,
                maxGrowth: stats.growTime
            };
            finishAction('Planted ${currentTool}. Get back to work to make it grow!');
        } else {
            alert("Not enough points! Go do some work!");
        }
    } else {
        DOM.status.innerText = "That plot is taken! Use 'Clear' to remove unnecessary plants.";
    }
}
function finishAction(message) {
    DOM.status.innerText = message;
    updatePointsDisplay();
    renderGarden();
    saveGame();
}
function renderGarden() {
    DOM.garden.innerHTML = '';
    garden.forEach((plot, index) => {
        const div = document.createElement('div');
        div.className = 'plot';
        div.onclick = () => handlePlotClick(index);
        if (plot) {
            let content = '';
            let progress = 0;
            if (plot.stage === 'withered') {
                content = '🥀';
            } else if (plot.stage === 'growing') {
                content = '🌿';
                progress = (plot.growth / plot.maxGrowth) * 100;
            } else if (plot.stage === 'ripe') {
                content = PLANT_STATS[plot.type].emoji;
                div.classList.add('ripe');
            }
            div.textContent = content;
            
            if (plot.stage === 'growing') {
                const bar = document.createElement('div');
                bar.className = 'growth-ring';
                const fill = document.createElement('div');
                fill.className = 'growth-fill';
                fill.style.width = `${progress}`;
                bar.appendChild(fill);
                div.appendChild(bar);
            }
        }
        DOM.garden.appendChild(div);
    });
}
function updatePointsDisplay() {
    DOM.points.innerText = points;
}
function saveGame() {
    localStorage.setItem('tabGardenSave_v2', JSON.stringify(points, garden));
}
function triggerConfetti() {
    DOM.points.style.transform = "scale(1.05)";
    DOM.points.style.color = "#c5cbcb";
    setTimeout(() => {
        DOM.points.style.transform = "scale(1)";
        DOM.points.style.color = "";
    }, 200)
}
init();