// simulation.js

class Simulation {
    constructor(gridWidth, gridHeight) {
        this.gridWidth = gridWidth;
        this.gridHeight = gridHeight;
        this.grid = this.createGrid(); // Stores refs to Human/Zombie entities, null if empty
        this.entities = new Map();   // All entities (Human, Zombie, Weapon) by ID
        this.weapons = new Map();    // Weapon entities by ID
        this.nextEntityId = 0;       // Replaced simple counter with Simulation-level counter

        this.spawnInitialEntities();
    }

    createGrid() {
        const grid = [];
        for (let y = 0; y < this.gridHeight; y++) {
            grid[y] = new Array(this.gridWidth).fill(null);
        }
        return grid;
    }

    getRandomInt(max) {
        return Math.floor(Math.random() * max);
    }

    // Gets a random empty cell suitable for Human/Zombie placement
    getRandomEmptyCellForPrimary() {
        let x, y;
        let attempts = 0;
        const maxAttempts = this.gridWidth * this.gridHeight * 2; // Heuristic limit

        do {
            x = this.getRandomInt(this.gridWidth);
            y = this.getRandomInt(this.gridHeight);
            attempts++;
            if (attempts > maxAttempts) {
                console.error("Failed to find an empty cell for primary entity after", maxAttempts, "attempts.");
                return null; // Indicate failure
            }
        } while (this.grid[y][x] !== null);
        return { x, y };
    }

     // Gets a random cell for Weapon placement (can overlap primary entities initially)
     getRandomCellForWeapon() {
        // In this version, weapons don't conflict with grid placement initially
        // but we still need unique weapon locations among themselves.
        // For simplicity now, just get any random cell. A better approach
        // would track weapon locations to ensure they don't stack initially.
        let x = this.getRandomInt(this.gridWidth);
        let y = this.getRandomInt(this.gridHeight);
        return { x, y };
        // TODO: Add logic to ensure unique weapon locations if needed later.
    }

    addEntity(entity) {
        entity.id = this.nextEntityId++; // Assign ID here
        this.entities.set(entity.id, entity);
        if (entity.type === 'HUMAN' || entity.type === 'ZOMBIE' || entity.type === 'OBSTACLE') {
             if(this.grid[entity.y][entity.x] === null) {
                 this.grid[entity.y][entity.x] = entity;
             } else {
                 console.warn(`Attempted to place primary entity ID ${entity.id} at occupied cell (${entity.x}, ${entity.y}). This shouldn't happen with correct spawning.`);
             }
        } else if (entity.type === 'WEAPON') {
            this.weapons.set(entity.id, entity);
            // Weapons don't occupy the main grid in this model
        }
    }

    removeEntity(entityId) {
        const entity = this.entities.get(entityId);
        if (!entity) return;

        if (entity.type === 'HUMAN' || entity.type === 'ZOMBIE') {
            if (this.grid[entity.y][entity.x] === entity) {
                this.grid[entity.y][entity.x] = null;
            }
        }
        if (entity.type === 'WEAPON') {
            this.weapons.delete(entityId);
        }
        this.entities.delete(entityId);
    }

    spawnInitialEntities() {
        console.log("Spawning initial entities...");
        const initialCounts = {
            ZOMBIE: 1,
            HUMAN: 100, // These will now spawn anywhere empty
            WEAPON: 15,
        };

        // --- Spawn Random Houses ---
        console.log("Spawning random houses...");
        const numHouses = 8;
        const houseWidth = 8;
        const houseHeight = 6;
        const maxPlacementAttempts = 50; // Tries per house
        let housesPlaced = 0;

        for (let i = 0; i < numHouses; i++) {
            let placed = false;
            for (let attempt = 0; attempt < maxPlacementAttempts && !placed; attempt++) {
                // 1. Choose random top-left corner, ensuring house fits within grid
                const startX = this.getRandomInt(this.gridWidth - houseWidth + 1);
                const startY = this.getRandomInt(this.gridHeight - houseHeight + 1);

                // 2. Check for collisions in the house footprint
                let collision = false;
                for (let y = startY; y < startY + houseHeight; y++) {
                    for (let x = startX; x < startX + houseWidth; x++) {
                        // Check bounds just in case (shouldn't be needed with startX/Y logic)
                        if (y < 0 || y >= this.gridHeight || x < 0 || x >= this.gridWidth) continue;
                        if (this.grid[y][x] !== null) {
                            collision = true;
                            break;
                        }
                    }
                    if (collision) break;
                }

                // 3. If no collision, place the house walls
                if (!collision) {
                    const doorX = startX + Math.floor(houseWidth / 2);
                    const doorY = startY; // Place door on top edge

                    for (let y = startY; y < startY + houseHeight; y++) {
                        for (let x = startX; x < startX + houseWidth; x++) {
                            // Check if it's a perimeter wall cell
                            const isPerimeter = (x === startX || x === startX + houseWidth - 1 || y === startY || y === startY + houseHeight - 1);
                            
                            if (isPerimeter) {
                                // Check if it's the door
                                const isDoor = (x === doorX && y === doorY);
                                
                                if (!isDoor) {
                                     // Check bounds again before placing
                                     if (y >= 0 && y < this.gridHeight && x >= 0 && x < this.gridWidth) {
                                        // Place wall if cell is empty (should be, but double-check)
                                        if (this.grid[y][x] === null) {
                                            const obstacle = new Obstacle(x, y);
                                            this.addEntity(obstacle); // addEntity handles grid update
                                        }
                                    } 
                                }
                            } 
                            // Inside the house (not perimeter) or the door cell remains empty (null)
                        }
                    }
                    placed = true;
                    housesPlaced++;
                } 
                // Else (collision), try a different random spot on the next attempt
            }
            if (!placed) {
                console.warn(`Could not place house ${i+1} after ${maxPlacementAttempts} attempts.`);
            }
        }
        console.log(`Placed ${housesPlaced} out of ${numHouses} houses.`);
        // --- End House Spawning ---

        // --- Spawn Zombies, Humans, and Weapons in remaining empty cells ---
        // Spawn Zombies
        for (let i = 0; i < initialCounts.ZOMBIE; i++) {
            const pos = this.getRandomEmptyCellForPrimary(); // Should find cells in streets
            if (pos) {
                const zombie = new Zombie(pos.x, pos.y);
                this.addEntity(zombie);
            } else {
                 console.error("Could not place initial Zombie - perhaps streets are too full?");
            }
        }

        // Spawn Humans
        for (let i = 0; i < initialCounts.HUMAN; i++) {
            const pos = this.getRandomEmptyCellForPrimary(); // Should find cells in streets
             if (pos) {
                const human = new Human(pos.x, pos.y);
                this.addEntity(human);
            } else {
                 console.error(`Could not place initial Human ${i+1} - perhaps streets are too full?`);
            }
        }
        
        // Spawn Weapons - Can potentially spawn on same cell as Human/Zombie initially
        for (let i = 0; i < initialCounts.WEAPON; i++) {
            // Get a random cell, but ideally one that's a 'street'
            // For now, getRandomCellForWeapon doesn't restrict placement, but pickup logic handles it.
            // A better approach might be to ensure weapons only spawn on streets too.
             let pos = this.getRandomCellForWeapon(); // This is just random x,y
             // Optional: Try to ensure weapon is on a street
             /* 
             let attempts = 0;
             while ((pos.x % streetFrequency !== 0) && (pos.y % streetFrequency !== 0) && attempts < 100) {
                 pos = this.getRandomCellForWeapon();
                 attempts++;
             }
             if (attempts >= 100) console.warn("Could not easily place weapon on street, placing randomly.");
             */
            
            const weapon = new Weapon(pos.x, pos.y);
            this.addEntity(weapon);
        }
         console.log(`Spawned: ${initialCounts.ZOMBIE} Zombies, ${initialCounts.HUMAN} Humans, ${this.weapons.size} Weapons.`);
    }

    getEntityAt(x, y) {
        return this.grid[y][x];
    }

    // Calculates toroidal distance (Manhattan distance with wrap-around)
    calculateToroidalDistance(x1, y1, x2, y2) {
        let dx = Math.abs(x1 - x2);
        let dy = Math.abs(y1 - y2);

        // Consider wrap-around
        if (dx > this.gridWidth / 2) {
            dx = this.gridWidth - dx;
        }
        if (dy > this.gridHeight / 2) {
            dy = this.gridHeight - dy;
        }

        return dx + dy;
    }

    findNearestHuman(zombieX, zombieY) {
        let nearestHuman = null;
        let minDistance = Infinity;

        for (const entity of this.entities.values()) {
            if (entity.type === 'HUMAN') {
                const distance = this.calculateToroidalDistance(zombieX, zombieY, entity.x, entity.y);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestHuman = entity;
                }
            }
        }
        return nearestHuman;
    }

    // Helper for toroidal distance/wrapping calculations if needed later
    // wrapCoordinate(coord, max) { ... }

    tick() {
        console.log("Tick starting...");
        const intentions = []; // { entityId, targetX, targetY }
        const movingEntities = [];

        // 1. Determine Intentions for mobile entities (Humans, Zombies)
        this.entities.forEach(entity => {
            if (entity.type === 'HUMAN' || entity.type === 'ZOMBIE') {
                // Ensure intendedMove exists before accessing properties
                const intent = entity.getIntendedMove(this);
                if (intent) {
                     intentions.push({ entityId: entity.id, targetX: intent.targetX, targetY: intent.targetY });
                     movingEntities.push(entity);
                } else {
                    // Handle cases where getIntendedMove might return null/undefined if needed
                    console.warn(`Entity ${entity.id} did not produce an intended move.`);
                }
            }
        });

        // 2. Resolve Conflicts & Determine Outcomes (Revised Logic)
        const successfulMoves = []; // { entityId, newX, newY }
        const infections = new Set();    // Set of human IDs to be infected
        const targetCellOccupants = {}; // track who wants to move where: `${x},${y}` -> [entityId1, entityId2]
        // No longer need intentionMap if intent is stored on entity

        // Group intentions by target cell
        intentions.forEach(intent => {
            const targetKey = `${intent.targetX},${intent.targetY}`;
            if (!targetCellOccupants[targetKey]) {
                targetCellOccupants[targetKey] = [];
            }
            targetCellOccupants[targetKey].push(intent.entityId);
        });

        // Process conflicts cell by cell
        for (const targetKey in targetCellOccupants) {
            const occupantIds = targetCellOccupants[targetKey];
            const [targetX, targetY] = targetKey.split(',').map(Number);
            const targetEntity = this.getEntityAt(targetX, targetY); // Entity *currently* at the target location

            // --- Check if target is an Obstacle first --- 
            if (targetEntity && targetEntity.type === 'OBSTACLE') {
                // console.log(`Move failed: Target (${targetX},${targetY}) is an Obstacle.`);
                continue; // No entity can move into an obstacle, skip to next target cell
            }
            // --- End Obstacle Check ---

            if (occupantIds.length === 1) {
                // --- Single entity targeting this non-obstacle cell ---
                const entityId = occupantIds[0];
                const entity = this.entities.get(entityId);
                 if (!entity) continue; // Skip if entity somehow missing

                if (entity.type === 'ZOMBIE') {
                    if (targetEntity === null) { // Target empty
                        successfulMoves.push({ entityId: entity.id, newX: targetX, newY: targetY });
                    } else if (targetEntity && targetEntity.type === 'HUMAN') { // Target human
                        successfulMoves.push({ entityId: entity.id, newX: targetX, newY: targetY });
                        infections.add(targetEntity.id);
                         console.log(`Infection: Zombie ${entity.id} targets Human ${targetEntity.id} at (${targetX},${targetY})`);
                    } // else if (targetEntity.type === 'ZOMBIE') { Move fails }

                } else if (entity.type === 'HUMAN') {
                    if (targetEntity === null) { // Target empty
                        successfulMoves.push({ entityId: entity.id, newX: targetX, newY: targetY });
                    } // else { Move fails - target occupied by Human/Zombie, already handled by grid state + obstacle check }
                }
            } else {
                // --- Multiple entities targeting the same non-obstacle cell - CONFLICT ---
                let zombieInfectsHumanId = null; // Store the ID of a zombie successfully infecting

                // Check if any targeting zombie is infecting a human currently in that cell
                if (targetEntity && targetEntity.type === 'HUMAN') {
                    for (const entityId of occupantIds) {
                        const entity = this.entities.get(entityId);
                        if (entity && entity.type === 'ZOMBIE') {
                            // Found a zombie trying to infect the human in this cell
                            zombieInfectsHumanId = entityId;
                            infections.add(targetEntity.id);
                            console.log(`Conflict Resolution: Zombie ${entityId} infection prioritized for Human ${targetEntity.id} at (${targetX},${targetY})`);
                            break; // Prioritize the first one found for simplicity
                        }
                    }
                }

                if (zombieInfectsHumanId !== null) {
                    // Only the infecting zombie's move succeeds for this target cell
                    successfulMoves.push({ entityId: zombieInfectsHumanId, newX: targetX, newY: targetY });
                    console.log(`Conflict Resolution: All other moves to (${targetX},${targetY}) cancelled due to prioritized infection.`);
                } else {
                    // No prioritized infection OR target cell wasn't a human.
                    // Multiple entities targeting same empty/zombie cell. All fail.
                    console.log(`Conflict: Multiple entities [${occupantIds.join(', ')}] targeting (${targetX},${targetY}), no prioritized infection or target not human. All moves fail.`);
                }
                 // In both conflict cases (prioritized infection or general clash),
                 // only the explicitly added moves (if any) proceed. Others implicitly fail.
            }
        }

        // 3. Apply State Changes

        // Apply successful moves (clearing old spots first)
        const movesToApply = [];
        successfulMoves.forEach(move => {
            const entity = this.entities.get(move.entityId);
            if (!entity) return;
            // Clear current grid position *before* potentially occupying target
             if (this.grid[entity.y][entity.x] === entity) {
                  this.grid[entity.y][entity.x] = null;
             }
            movesToApply.push(move);
        });

        // Update positions and grid for moved entities
        movesToApply.forEach(move => {
             const entity = this.entities.get(move.entityId);
             if (!entity) return;

            // --- Wrap-around visual adjustment ---
            // Check if the entity wrapped around horizontally
            if (move.newX === 0 && entity.x === this.gridWidth - 1) {
                // Wrapped from right edge to left edge
                entity.visualX -= this.gridWidth; // Move visualX off-screen to the left
                 console.log(`Entity ${entity.id} visualX wrap R->L: ${entity.visualX + this.gridWidth} -> ${entity.visualX}`);
            } else if (move.newX === this.gridWidth - 1 && entity.x === 0) {
                // Wrapped from left edge to right edge
                entity.visualX += this.gridWidth; // Move visualX off-screen to the right
                 console.log(`Entity ${entity.id} visualX wrap L->R: ${entity.visualX - this.gridWidth} -> ${entity.visualX}`);
            }

            // Check if the entity wrapped around vertically
            if (move.newY === 0 && entity.y === this.gridHeight - 1) {
                // Wrapped from bottom edge to top edge
                entity.visualY -= this.gridHeight; // Move visualY off-screen upwards
                 console.log(`Entity ${entity.id} visualY wrap B->T: ${entity.visualY + this.gridHeight} -> ${entity.visualY}`);
            } else if (move.newY === this.gridHeight - 1 && entity.y === 0) {
                // Wrapped from top edge to bottom edge
                entity.visualY += this.gridHeight; // Move visualY off-screen downwards
                 console.log(`Entity ${entity.id} visualY wrap T->B: ${entity.visualY - this.gridHeight} -> ${entity.visualY}`);
            }
             // --- End wrap-around adjustment ---

            // Update actual grid coordinates
            entity.x = move.newX;
            entity.y = move.newY;

            // Place the moved entity onto the grid.
            // If it was an infecting zombie, it temporarily occupies the spot.
            this.grid[entity.y][entity.x] = entity;

            // --- Check for weapon pickup ---
            if (entity.type === 'HUMAN' && !entity.hasWeapon) { // Only unarmed humans can pick up
                let weaponToRemoveId = null;
                // Iterate through weapons Map to find if one exists at the new location
                for (const [weaponId, weapon] of this.weapons.entries()) {
                    if (weapon.x === entity.x && weapon.y === entity.y) {
                        entity.hasWeapon = true;
                        weaponToRemoveId = weaponId;
                        console.log(`Human ${entity.id} picked up Weapon ${weaponId} at (${entity.x}, ${entity.y})`);
                        break; // Assume only one weapon per cell can be picked up per tick
                    }
                }
                // If a weapon was found and flagged for removal
                if (weaponToRemoveId !== null) {
                    this.removeEntity(weaponToRemoveId); // Use existing method to remove from this.entities and this.weapons
                }
            }
             // --- End Check for weapon pickup ---
        })

        // Apply infections (potentially overwriting the grid cell again)
        infections.forEach(humanId => {
            const humanEntity = this.entities.get(humanId); // Get the original human object
            // Check if the entity still exists and is indeed a Human (might have been removed/changed differently)
            if (humanEntity && humanEntity.type === 'HUMAN') {
                console.log(`Applying infection to Human ${humanId} at (${humanEntity.x}, ${humanEntity.y})`);

                const newZombie = new Zombie(humanEntity.x, humanEntity.y);
                newZombie.id = humanEntity.id; // Re-use ID

                this.entities.delete(humanId); // Remove human from master list
                this.entities.set(newZombie.id, newZombie); // Add new zombie to master list

                // Update the grid to point to the new Zombie object
                this.grid[newZombie.y][newZombie.x] = newZombie;

                console.log(`Human ${humanId} turned into Zombie ${newZombie.id}`);
            } else {
                 console.warn(`Attempted to infect entity ${humanId}, but it was not found or not a Human.`);
            }
        });
        console.log("Tick finished.");
    }
}

// Make available globally for main.js 