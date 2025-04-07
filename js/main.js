// main.js

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('simulationCanvas');
    const ctx = canvas.getContext('2d');
    const resetButton = document.getElementById('resetButton');
    const pauseResumeButton = document.getElementById('pauseResumeButton');
    const slowDownButton = document.getElementById('slowDownButton');
    const speedUpButton = document.getElementById('speedUpButton');
    const speedDisplay = document.getElementById('speedDisplay');

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

        // Draw entities (Humans and Zombies) using VISUAL coordinates
        for (const entity of sim.entities.values()) {
            if (entity.type === 'HUMAN' || entity.type === 'ZOMBIE') {
                if (typeof entity.visualX !== 'undefined' && typeof entity.visualY !== 'undefined') {
                    context.fillStyle = entity.color;
                    // Use visualX/visualY for drawing position
                    context.fillRect(entity.visualX * cellSize, entity.visualY * cellSize, cellSize, cellSize);
                } else {
                     // Fallback or error if visual coords are missing (shouldn't happen after setup)
                     console.warn(`Entity ${entity.id} missing visual coordinates.`);
                     context.fillStyle = entity.color;
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

    // --- Initial Setup ---
    updateSpeedDisplay(); // Set initial speed display
    setupSimulation();
    startSimulation(); // Start the simulation and rendering loops
}); 