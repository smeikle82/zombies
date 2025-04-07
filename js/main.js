// main.js

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('simulationCanvas');
    const ctx = canvas.getContext('2d');
    const resetButton = document.getElementById('resetButton');
    const pauseResumeButton = document.getElementById('pauseResumeButton');
    const slowDownButton = document.getElementById('slowDownButton');
    const speedUpButton = document.getElementById('speedUpButton');
    const speedDisplay = document.getElementById('speedDisplay');
    const gridToggle = document.getElementById('gridToggle');
    const radiusToggle = document.getElementById('radiusToggle');

    const GRID_WIDTH = 50;
    const GRID_HEIGHT = 50;
    const CELL_SIZE = 10; // Adjust for desired visual size

    // Set canvas dimensions
    canvas.width = GRID_WIDTH * CELL_SIZE;
    canvas.height = GRID_HEIGHT * CELL_SIZE;

    let simulation;
    let simulationIntervalId = null; // Renamed from gameLoopIntervalId
    let renderRequestId = null;    // ID for requestAnimationFrame
    let isPaused = false;
    let ticksPerSecond = 8;
    const interpolationFactor = 0.2; // Adjust for smoother/faster interpolation (0 to 1)

    // Linear interpolation function
    function lerp(start, end, amount) {
        return start + (end - start) * amount;
    }

    function updateSpeedDisplay() {
        speedDisplay.textContent = `Speed: ${ticksPerSecond} TPS`;
    }

    function getIntervalTime() {
        return 1000 / ticksPerSecond;
    }

    function setupSimulation() {
        console.log("Setting up simulation...");
        simulation = new Simulation(GRID_WIDTH, GRID_HEIGHT);
        // Initialize visual positions
        simulation.entities.forEach(entity => {
            entity.visualX = entity.x;
            entity.visualY = entity.y;
        });
         // Initial draw using final positions
        drawSimulation(simulation, ctx, CELL_SIZE);
    }

    function drawSimulation(sim, context, cellSize) {
        // Clear canvas
        context.fillStyle = '#333'; // Background for empty cells
        context.fillRect(0, 0, context.canvas.width, context.canvas.height);

        // --- Draw Grid (Conditional) ---
        if (gridToggle.checked) {
            context.strokeStyle = '#444'; // Dark gray for grid lines
            context.lineWidth = 1;

            // Vertical lines
            for (let x = 0; x <= context.canvas.width; x += cellSize) {
                context.beginPath();
                context.moveTo(x, 0);
                context.lineTo(x, context.canvas.height);
                context.stroke();
            }

            // Horizontal lines
            for (let y = 0; y <= context.canvas.height; y += cellSize) {
                context.beginPath();
                context.moveTo(0, y);
                context.lineTo(context.canvas.width, y);
                context.stroke();
            }
        }
        // --- End Grid Draw ---

        // Draw entities (Humans and Zombies) using VISUAL coordinates
        for (const entity of sim.entities.values()) {

            // --- Draw Armed Human Range Indicator (Conditional) ---
            if (radiusToggle.checked && entity.type === 'HUMAN' && entity.hasWeapon && typeof entity.visualX !== 'undefined') {
                const range = 10; // The current detection range
                const centerX = entity.visualX * cellSize + cellSize / 2;
                const centerY = entity.visualY * cellSize + cellSize / 2;
                const radius = range * cellSize;

                context.strokeStyle = 'rgba(255, 255, 0, 0.3)'; // Faint yellow
                context.lineWidth = 1;
                context.beginPath();
                context.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                context.stroke();
            }
            // --- End Range Indicator ---

            if (entity.type === 'HUMAN' || entity.type === 'ZOMBIE') {
                if (typeof entity.visualX !== 'undefined' && typeof entity.visualY !== 'undefined') {
                    // Determine color based on state
                    let drawColor = entity.color;
                    if (entity.type === 'HUMAN' && entity.hasWeapon && entity.weaponCooldown > 0) {
                        drawColor = 'yellow'; // Cooldown color
                    } else if (entity.type === 'HUMAN' && entity.hasWeapon) {
                        drawColor = 'orange'; // Default armed color (ensure it overrides default white if needed)
                    } else {
                         drawColor = entity.color; // Default color (unarmed human, zombie, etc.)
                    }
                    context.fillStyle = drawColor;

                    // Use visualX/visualY for drawing position
                    context.fillRect(entity.visualX * cellSize, entity.visualY * cellSize, cellSize, cellSize);
                } else {
                     // Fallback or error if visual coords are missing (shouldn't happen after setup)
                     // Log the problematic entity object itself for inspection
                     console.warn(`Entity ${entity.id} missing visual coordinates. Type: ${entity.type}. Entity:`, entity);
                     context.fillStyle = entity.color; // Use original color in fallback
                     context.fillRect(entity.x * cellSize, entity.y * cellSize, cellSize, cellSize);
                }
            } else if (entity.type === 'OBSTACLE') {
                // Obstacles don't interpolate, draw at grid position
                context.fillStyle = entity.color;
                context.fillRect(entity.x * cellSize, entity.y * cellSize, cellSize, cellSize);
            }
        }

        // Draw weapons (using grid coordinates for now, could also be interpolated if they move)
        for (const weapon of sim.weapons.values()) {
            context.fillStyle = weapon.color;
            context.fillRect(weapon.x * cellSize + cellSize * 0.1, weapon.y * cellSize + cellSize * 0.1, cellSize * 0.8, cellSize * 0.8);
        }
    }

    // --- Simulation Loop (Fixed Interval) ---
    function simulationStep() {
        if (!simulation || isPaused) return;
        console.log("DEBUG SIMSTEP: Entered simulationStep, about to call simulation.tick().");
        simulation.tick(); // Only update simulation state
    }

    // --- Render Loop (RequestAnimationFrame) ---
    function renderLoop() {
        if (!simulation) return; // Don't render if simulation isn't ready

        // Interpolate visual positions towards actual grid positions
        simulation.entities.forEach(entity => {
             if (typeof entity.visualX !== 'undefined' && typeof entity.visualY !== 'undefined') {
                entity.visualX = lerp(entity.visualX, entity.x, interpolationFactor);
                entity.visualY = lerp(entity.visualY, entity.y, interpolationFactor);
            }
        });

        drawSimulation(simulation, ctx, CELL_SIZE); // Draw the interpolated state

        // Continue the loop
        if (!isPaused) { // Only request next frame if not paused
             renderRequestId = requestAnimationFrame(renderLoop);
        }
    }

    function stopSimulation() {
        if (simulationIntervalId) {
            clearInterval(simulationIntervalId);
            simulationIntervalId = null;
            console.log("Simulation interval stopped.");
        }
         if (renderRequestId) {
            cancelAnimationFrame(renderRequestId);
            renderRequestId = null;
            console.log("Render loop stopped.");
        }
    }

    function startSimulation() {
        stopSimulation(); // Ensure no duplicates

        if (!isPaused) {
            // Start simulation ticks
            const intervalTime = getIntervalTime();
            simulationIntervalId = setInterval(simulationStep, intervalTime);
            console.log(`Simulation interval started with interval ${intervalTime}ms.`);

            // Start rendering loop
            renderRequestId = requestAnimationFrame(renderLoop);
            console.log("Render loop started.");
        }
    }

    function resetSimulation() {
        console.log("Resetting simulation...");
        stopSimulation(); // Stop current loops
        isPaused = false;
        pauseResumeButton.textContent = 'Pause';
        setupSimulation(); // Create new simulation, sets initial visual positions
        startSimulation(); // Start new loops
    }

    function togglePauseResume() {
        isPaused = !isPaused;
        if (isPaused) {
            pauseResumeButton.textContent = 'Resume';
            // Stop loops, but keep state
            stopSimulation();
             // We keep renderRequestId so resume knows where to pick up drawing
            console.log("Simulation paused.");
        } else {
            pauseResumeButton.textContent = 'Pause';
            // Resume loops
            startSimulation(); // This will restart both loops correctly
            console.log("Simulation resumed.");
        }
    }

    function changeSpeed(delta) {
        const newTPS = ticksPerSecond + delta;
        if (newTPS >= 1 && newTPS <= 20) {
            ticksPerSecond = newTPS;
            updateSpeedDisplay();
            console.log(`Speed changed to ${ticksPerSecond} TPS.`);
            // If running, restart the simulation interval with the new speed
            // The render loop continues at its own pace
            if (!isPaused && simulationIntervalId) {
                 stopSimulation(); // Stop both
                 startSimulation(); // Restart both (simulation interval uses new speed)
            }
        } else {
            console.log(`Speed change rejected: ${newTPS} TPS is outside limits (1-20).`);
        }
    }

    // --- Event Listeners ---
    resetButton.addEventListener('click', resetSimulation);
    pauseResumeButton.addEventListener('click', togglePauseResume);
    slowDownButton.addEventListener('click', () => changeSpeed(-1));
    speedUpButton.addEventListener('click', () => changeSpeed(1));

    // Added listeners for toggles
    gridToggle.addEventListener('change', () => {
        if (isPaused) {
            drawSimulation(simulation, ctx, CELL_SIZE); // Redraw immediately if paused
        }
    });
    radiusToggle.addEventListener('change', () => {
        if (isPaused) {
            drawSimulation(simulation, ctx, CELL_SIZE); // Redraw immediately if paused
        }
    });

    // --- Initial Setup ---
    updateSpeedDisplay(); // Set initial speed display
    setupSimulation();

    // --- Add Click Listener for Debugging ---
    canvas.addEventListener('click', (event) => {
        if (!simulation) return; // Don't do anything if sim isn't ready

        const rect = canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        const gridX = Math.floor(clickX / CELL_SIZE);
        const gridY = Math.floor(clickY / CELL_SIZE);

        // Check bounds
        if (gridX < 0 || gridX >= simulation.gridWidth || gridY < 0 || gridY >= simulation.gridHeight) {
            console.log(`Clicked outside grid bounds at (${gridX}, ${gridY})`);
            return;
        }

        const entity = simulation.getEntityAt(gridX, gridY);

        if (entity && (entity.type === 'HUMAN' || entity.type === 'ZOMBIE')) {
            console.log('--- Entity Clicked ---');
            console.log(`ID: ${entity.id}`);
            console.log(`Type: ${entity.type}`);
            console.log(`Position (Grid): (${entity.x}, ${entity.y})`);
            if (typeof entity.visualX !== 'undefined') {
                 console.log(`Position (Visual): (${entity.visualX.toFixed(2)}, ${entity.visualY.toFixed(2)})`);
            }

            if (entity.type === 'HUMAN') {
                console.log(`State: ${entity.state}`);
                console.log(`Armed: ${entity.hasWeapon}`);
                console.log(`Weapon Cooldown: ${entity.weaponCooldown}`);
                console.log(`Attacked This Tick: ${entity.hasAttackedThisTick}`);
                // Note: intendedMove might be null or reflect the *previous* tick's intention depending on timing
                console.log(`Stored Intended Move: ${JSON.stringify(entity.intendedMove)}`);
            } else if (entity.type === 'ZOMBIE') {
                 console.log(`State: ${entity.state}`);
                 console.log(`Stored Intended Move: ${JSON.stringify(entity.intendedMove)}`);
            }
             console.log('--- End Entity Info ---');
        } else if (entity && entity.type === 'WEAPON') {
             console.log(`Clicked Weapon ID: ${entity.id} at (${gridX}, ${gridY})`);
        } else if (entity && entity.type === 'OBSTACLE') {
             console.log(`Clicked Obstacle at (${gridX}, ${gridY})`);
        } else {
            console.log(`Clicked empty cell at (${gridX}, ${gridY})`);
        }
    });
    // --- End Click Listener ---

    // --- Start Paused --- 
    isPaused = true;
    pauseResumeButton.textContent = 'Resume';
    drawSimulation(simulation, ctx, CELL_SIZE); // Draw the initial state once
    console.log("Simulation initialized and paused.");
    // The simulation and render loops will start when the user clicks 'Resume'.
    // --- End Start Paused ---
}); 