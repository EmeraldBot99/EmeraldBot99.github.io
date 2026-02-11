const canvas = document.getElementById('Simulator');
const ctx = canvas.getContext('2d');

canvas.oncontextmenu = function (e) { e.preventDefault(); };

window.addEventListener('resize', resizeCanvas);
resizeCanvas();


const simSize = 200;
const totalCells = simSize * simSize;


const LATTICE_DENSITY = 20.0; 
const DRIFT_RATE = 0.5;       
const DIFFUSION_RATE = 0.15; 
const POISSON_ITER = 50;  

let fixedCharge = new Float32Array(totalCells); 
let mobileCharge = new Float32Array(totalCells);
let potential = new Float32Array(totalCells);
let conductivity = new Float32Array(totalCells);
let nextMobileCharge = new Float32Array(totalCells);
let groundMap = new Uint8Array(totalCells); 

let fieldOn = false;
let grounded = false;

let groundNode = {
    x: simSize / 2,
    y: simSize - 20,
    radius: 12,
    isDragging: false
};

class Conductor {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
    }

    updateGrid() {
        for (let i = 0; i < totalCells; i++) {
            let x = i % simSize;
            let y = Math.floor(i / simSize);
            let dist = Math.sqrt((x - this.x) ** 2 + (y - this.y) ** 2);

            if (dist < this.radius) {
                conductivity[i] = 1.0; 
                // Initialize perfectly neutral
                fixedCharge[i] = LATTICE_DENSITY;   
                mobileCharge[i] = -LATTICE_DENSITY; 
            } else {
                conductivity[i] = 0.0;
                fixedCharge[i] = 0;
                mobileCharge[i] = 0;
            }
        }
    }
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function updateGroundMap() {
    groundMap.fill(0);
    if (!grounded) return;

    let gx = Math.floor(groundNode.x);
    let gy = Math.floor(groundNode.y);
    let r = groundNode.radius;
    let rSq = r * r;

    for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
            if (dx*dx + dy*dy <= rSq) {
                let simX = gx + dx;
                let simY = gy + dy;
                if(simX >= 0 && simX < simSize && simY >= 0 && simY < simSize) {
                    groundMap[simY * simSize + simX] = 1;
                }
            }
        }
    }
}

function updatePhysics() {
    
    if(fieldOn){
        for(let i = 0; i < totalCells; i++) {
            let x = i % simSize;
            let factor = x / simSize; 
            potential[i] = 150 * (1 - factor) + (-150 * factor);
        }
    } else {
        potential.fill(0);
    }


    for (let iter = 0; iter < POISSON_ITER; iter++) {
        for (let y = 1; y < simSize - 1; y++) {     
            for (let x = 1; x < simSize - 1; x++) { 
                let i = y * simSize + x;
                
                if (groundMap[i] === 1) {
                    potential[i] = 0;
                    continue;
                }

                const neighbors = potential[i - 1] + potential[i + 1] + potential[i - simSize] + potential[i + simSize];
                let netCharge = fixedCharge[i] + mobileCharge[i];
                potential[i] = (neighbors + netCharge) * 0.25;
            }
        }
        
        if(fieldOn){
            for(let y=0; y<simSize; y++){
                potential[y*simSize] = 150; 
                potential[y*simSize + (simSize-1)] = -150; 
            }
        }
    }

    // 3. Charge Transport
    nextMobileCharge.set(mobileCharge); 

    for (let y = 1; y < simSize - 1; y++) {
        for (let x = 1; x < simSize - 1; x++) {
            let idx = y * simSize + x;
            
            if (conductivity[idx] <= 0 && groundMap[idx] === 0) continue;

            handleFlux(idx, idx + 1);       
            handleFlux(idx, idx + simSize); 
        }
    }
    
    mobileCharge.set(nextMobileCharge);
}

function handleFlux(idxA, idxB) {
    let condA = conductivity[idxA] > 0 || groundMap[idxA] === 1;
    let condB = conductivity[idxB] > 0 || groundMap[idxB] === 1;

    if (!condA || !condB) return;

    let isGroundA = groundMap[idxA] === 1;
    let isGroundB = groundMap[idxB] === 1;


    let vDiff = potential[idxB] - potential[idxA];

    
    let densityA = isGroundA ? -LATTICE_DENSITY : mobileCharge[idxA];
    let densityB = isGroundB ? -LATTICE_DENSITY : mobileCharge[idxB];

    let densityDiff = densityB - densityA;
    
    let flow = (vDiff * DRIFT_RATE) + (densityDiff * DIFFUSION_RATE);

    if (flow > 2.0) flow = 2.0;
    if (flow < -2.0) flow = -2.0;

    // --- TRANSFER ---
    if (flow > 0) {
        // Flow A -> B
        if (!isGroundA) {
            let available = Math.abs(nextMobileCharge[idxA]);
            if (flow > available * 0.15) flow = available * 0.15;
            nextMobileCharge[idxA] += flow; 
        }
        if (!isGroundB) nextMobileCharge[idxB] -= flow; 
    } else {
        // Flow B -> A
        let absFlow = Math.abs(flow);
        if (!isGroundB) {
            let available = Math.abs(nextMobileCharge[idxB]);
            if (absFlow > available * 0.15) absFlow = available * 0.15;
            nextMobileCharge[idxB] += absFlow; 
        }
        if (!isGroundA) nextMobileCharge[idxA] -= absFlow; 
    }
}

function render() {
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const buffer = imageData.data;
    
    const scaleX = simSize / canvas.width;
    const scaleY = simSize / canvas.height;

    for (let y = 0; y < canvas.height; y++) {
        const simY = Math.floor(y * scaleY);
        const rowOffset = simY * simSize;
        
        for (let x = 0; x < canvas.width; x++) {
            const simX = Math.floor(x * scaleX);
            const simIdx = rowOffset + simX;
            const idx = (y * canvas.width + x) * 4;

            const netCharge = fixedCharge[simIdx] + mobileCharge[simIdx];
            let r = 0, g = 0, b = 0;
            
            if (conductivity[simIdx] > 0) {
                // Visualize Metal
                let intensity = Math.abs(netCharge) * 200; 
                intensity = Math.min(255, intensity);

                if (netCharge > 0.005) {
                    r = 150 + intensity; g = 50; b = 50; 
                } else if (netCharge < -0.005) {
                    r = 50; g = 50; b = 150 + intensity; 
                } else {
                    r = 100; g = 100; b = 100; 
                }
            } else {
                // Visualize Field
                let v = potential[simIdx];
                let val = Math.abs(v);
                
                if(v > 0) { r = val; g = 0; b = 0; } 
                else { b = val; g = 0; r = 0; }      
                
                r *= 0.4; b *= 0.4; // Dim background
            }

            buffer[idx] = r; buffer[idx + 1] = g; buffer[idx + 2] = b; buffer[idx + 3] = 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);

    if (grounded) {
        const screenX = groundNode.x * (canvas.width / simSize);
        const screenY = groundNode.y * (canvas.height / simSize);
        const screenR = groundNode.radius * (canvas.width / simSize);

        ctx.beginPath();
        ctx.arc(screenX, screenY, screenR, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(50, 255, 50, 0.6)";
        ctx.fill();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "white";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.fillText("GND", screenX, screenY - screenR - 5);
    }
}


canvas.addEventListener('mousedown', (e) => {
    if (!grounded) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = simSize / canvas.width;
    const scaleY = simSize / canvas.height;
    const simMouseX = (e.clientX - rect.left) * scaleX;
    const simMouseY = (e.clientY - rect.top) * scaleY;

    if (Math.sqrt((simMouseX - groundNode.x)**2 + (simMouseY - groundNode.y)**2) < groundNode.radius * 2) {
        groundNode.isDragging = true;
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (groundNode.isDragging && grounded) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = simSize / canvas.width;
        const scaleY = simSize / canvas.height;
        groundNode.x = (e.clientX - rect.left) * scaleX;
        groundNode.y = (e.clientY - rect.top) * scaleY;
        updateGroundMap(); 
    }
});

canvas.addEventListener('mouseup', () => {
    groundNode.isDragging = false;
});

const menuBtn = document.getElementById('menu-btn');
const dropdown = document.getElementById('dropdown-menu');
const fieldToggleBtn = document.getElementById('field-toggle-btn');
const groundToggleBtn = document.getElementById('ground-toggle-btn');

menuBtn.addEventListener('click', () => {
    dropdown.classList.toggle('hidden');
});

fieldToggleBtn.addEventListener('click', () => {
    fieldOn = !fieldOn;
    fieldToggleBtn.textContent = fieldOn ? "Field: ON" : "Field: OFF";
    fieldToggleBtn.style.backgroundColor = fieldOn ? "#ccffcc" : "#ffcccc";
});

groundToggleBtn.addEventListener('click', () => {
    grounded = !grounded; 
    groundToggleBtn.textContent = grounded ? "Ground: ON" : "Ground: OFF";
    groundToggleBtn.style.backgroundColor = grounded ? "#ccffcc" : "#ffcccc";
    updateGroundMap(); 
});

// SETUP SCENE
let scene = [];
// Pass only radius, density is now global constant
scene.push(new Conductor(simSize/2, simSize/2, 40));

// Init Grid
for (let i = 0; i < scene.length; i++) {
    scene[i].updateGrid();
}

function main() {
    updatePhysics();
    render();
}

setInterval(main, 1000/60);