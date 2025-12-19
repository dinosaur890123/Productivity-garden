let points = 0;
let lastHiddenTime = 0;
let visibleStartTime = Date.now();
let witherTimer = 0;
let currentTool = null;
let toolCost = 0;
let currentSelection = null;
let selectionCost = 0;
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
document.addEventListener("visbilitychange", () => {
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
    }
});
function gameLoop() {
    if (!document.hidden) {
        const now = Date.now();
        const visibleDuration = now - visibleStartTime;
        const percent = Math.min(100, (visibleDuration / WITHER_LIMIT_MS) * 100);
        DOM.witherBar.style.width = `${percent}%`;
        if (percent > 80) {
            DOM.body.style.backgroundColor = '#fff0f0';
            DOM.status.innerText = "Warning: Get back to work or plants will wither!"; // haha
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
            return {type: 'withered'};
        }
        return plot;
    });
    if (changed) {
        DOM.status.innerText = "Oh no! You procrastinated too long. The garden withered.";
        renderGarden();
        saveGame();
    }
}
window.selectSeed = function(type, cost) {
    if (currentSelection === type) {
        currentSelection = null;
        selectionCost = 0;
        updateShopUI();
        return;
    }
    currentSelection = type;
    selectionCost = cost;
    updateShopUI();
};
function updateShopUI() {
    document.querySelectorAll('.shop button').forEach(button => button.classList.remove('selected'));
    if (currentSelection) {
        document.getElementById(`button-${currentSelection}`).classList.add('selected');
    }
}
function handlePlotClick() {
    if (!currentSelection) return;
    const plot = garden[index];
    if (currentSelection === 'clear') {
        if (points >= selectionCost) {
            points -= selectionCost;
            garden[index] = {type: null};
            finishAction();
        } else {
            alert("Not enough points!");
        }
        return;
    }
    if (plot.type === null) {
        if (points >= selectionCost) {
            points -= selectionCost;
            garden[index] = {type: currentSelection};
            finishAction();
        } else {
            alert("Not enough points! Go do some work!");
        }
    } else {
        DOM.status.innerText = "That plot is taken! Use 'Clear' to remove plants.";
    }
}
function finishGarden() {
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
        let content = '';
        if (plot.type === 'flower') content = '🌸';
        else if (plot.type === 'tree') content = '🌳';
        else if (plot.type === 'withered') content = '🥀'; 
        div.textContent = content;
        DOM.garden.appendChild(div);
    });
}
function updatePointsDisplay() {
    DOM.points.innerText = points;
}
function saveGame() {
    const data = {
        points: points,
        garden: garden
    };
    localStorage.setItem('tabGardenSave', JSON.stringify(data));
}
init();