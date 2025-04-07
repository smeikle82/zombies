// simulation.js

// --- Constants ---
const HUMAN_WEAPON_COOLDOWN = 5; // Ticks cooldown after attacking

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
        // Constants for house spawning
        const numHouses = 8;
        const houseWidth = 8;
        const houseHeight = 6;
        const maxPlacementAttempts = 50; // Tries per house

        this._spawnHouses(numHouses, houseWidth, houseHeight, maxPlacementAttempts);
        // --- End House Spawning ---

        // --- Spawn Zombies, Humans, and Weapons in remaining empty cells ---
        this._spawnZombies(initialCounts.ZOMBIE);
        this._spawnHumans(initialCounts.HUMAN);
        this._spawnWeapons(initialCounts.WEAPON);

        console.log(`Spawned: ${initialCounts.ZOMBIE} Zombies, ${initialCounts.HUMAN} Humans, ${this.weapons.size} Weapons.`);
    }

    _spawnZombies(count) {
        console.log(`Spawning ${count} zombies...`);
        for (let i = 0; i < count; i++) {
            const pos = this.getRandomEmptyCellForPrimary(); // Should find cells in streets
            if (pos) {
                const zombie = new Zombie(pos.x, pos.y);
                this.addEntity(zombie);
            } else {
                 console.error("Could not place initial Zombie - perhaps streets are too full?");
                 // Consider breaking or other error handling if essential
            }
        }
    }

    _spawnHumans(count) {
        console.log(`Spawning ${count} humans...`);
        for (let i = 0; i < count; i++) {
            const pos = this.getRandomEmptyCellForPrimary(); // Should find cells in streets
             if (pos) {
                const human = new Human(pos.x, pos.y);
                this.addEntity(human);
            } else {
                 console.error(`Could not place initial Human ${i+1} - perhaps streets are too full?`);
                 // Consider breaking or other error handling
            }
        }
    }

    _spawnWeapons(count) {
        console.log(`Spawning ${count} weapons...`);
        const maxAttemptsPerWeapon = 100; // Prevent infinite loop if no valid spots found
        let weaponsSpawned = 0;

        for (let i = 0; i < count; i++) {
            let pos;
            let attempts = 0;
            
            do {
                pos = this.getRandomCellForWeapon();
                const entityAtPos = this.getEntityAt(pos.x, pos.y);
                // Check if the cell is empty OR if it contains something that is NOT an obstacle
                if (!entityAtPos || entityAtPos.type !== 'OBSTACLE') {
                     break; // Found a valid spot
                }
                attempts++;
            } while (attempts < maxAttemptsPerWeapon);

            if (attempts >= maxAttemptsPerWeapon) {
                console.warn(`Could not find a non-obstacle position for weapon ${i+1} after ${maxAttemptsPerWeapon} attempts. Skipping weapon spawn.`);
                continue; // Skip this weapon if no suitable spot found
            }

            // We have a valid position 'pos' here
            const weapon = new Weapon(pos.x, pos.y);
            this.addEntity(weapon);
            weaponsSpawned++; // Increment count only if weapon was added
        }
        // Log the actual number spawned, as some might fail
        console.log(`Successfully spawned ${weaponsSpawned} out of ${count} requested weapons.`);
    }

    // New private method for spawning houses
    _spawnHouses(numHouses, houseWidth, houseHeight, maxPlacementAttempts) {
        console.log("Spawning random houses...");
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

    _gatherIntentions() {
        const intentions = []; // { entityId, targetX, targetY }
        const movingEntities = []; // Keep track of entities that intend to move

        // --- Use Array.from for safer iteration ---
        Array.from(this.entities.values()).forEach(entity => {
            // Only gather intentions for entities that CAN move/act
            if ((entity.type === 'HUMAN' && !entity.hasAttackedThisTick) || entity.type === 'ZOMBIE') {
                const intent = entity.getIntendedMove(this);
                if (intent) {
                     intentions.push({ entityId: entity.id, targetX: intent.targetX, targetY: intent.targetY });
                     movingEntities.push(entity); // Add entity itself for potential later use
                }
            }
        });
        // Return both intentions and the list of entities that generated them
        return { intentions, movingEntities };
    }

    _resolveConflicts(intentions) {
        const successfulMoves = []; // { entityId, newX, newY }
        const infections = new Set();    // Set of human IDs to be infected
        const targetCellOccupants = {}; // track who wants to move where: `${x},${y}` -> [entityId1, entityId2]

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
                            break; // Prioritize the first one found for simplicity
                        }
                    }
                }

                if (zombieInfectsHumanId !== null) {
                    // Only the infecting zombie's move succeeds for this target cell
                    successfulMoves.push({ entityId: zombieInfectsHumanId, newX: targetX, newY: targetY });
                } else {
                    // No prioritized infection OR target cell wasn't a human.
                    // Multiple entities targeting same empty/zombie cell. All fail.
                }
                 // In both conflict cases (prioritized infection or general clash),
                 // only the explicitly added moves (if any) proceed. Others implicitly fail.
            }
        }
        return { successfulMoves, infections };
    }

    _applyStateChanges(successfulMoves, infections) {
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
             } else if (move.newX === this.gridWidth - 1 && entity.x === 0) {
                 // Wrapped from left edge to right edge
                 entity.visualX += this.gridWidth; // Move visualX off-screen to the right
             }
 
             // Check if the entity wrapped around vertically
             if (move.newY === 0 && entity.y === this.gridHeight - 1) {
                 // Wrapped from bottom edge to top edge
                 entity.visualY -= this.gridHeight; // Move visualY off-screen upwards
             } else if (move.newY === this.gridHeight - 1 && entity.y === 0) {
                 // Wrapped from top edge to bottom edge
                 entity.visualY += this.gridHeight; // Move visualY off-screen downwards
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
                 const newZombie = new Zombie(humanEntity.x, humanEntity.y);
                 newZombie.id = humanEntity.id; // Re-use ID

                 // Initialize visual coordinates for the new zombie
                 newZombie.visualX = newZombie.x;
                 newZombie.visualY = newZombie.y;

                 this.entities.delete(humanId); // Remove human from master list
                 this.entities.set(newZombie.id, newZombie); // Add new zombie to master list
 
                 // Update the grid to point to the new Zombie object
                 this.grid[newZombie.y][newZombie.x] = newZombie;
             } else {
                  console.warn(`Attempted to infect entity ${humanId}, but it was not found or not a Human.`);
             }
         });
    }

    // New method to handle combat phase
    _resolveCombat() {
        const zombiesToRemove = new Set(); // IDs of zombies defeated this tick
        const zombiesTargetedThisTick = new Set(); // Prevent multiple humans targeting the same zombie

        // Find humans who can potentially attack
        const potentialAttackers = [];
        // --- Use Array.from for safer iteration ---
        Array.from(this.entities.values()).forEach(entity => {
            if (entity.type === 'HUMAN' && entity.hasWeapon && entity.weaponCooldown === 0 && !entity.hasAttackedThisTick) {
                potentialAttackers.push(entity);
            }
        });
        // --- End Finding Attackers ---

        // Randomize attacker order slightly to avoid positional bias if multiple humans can attack the same zombie
        potentialAttackers.sort(() => Math.random() - 0.5);

        potentialAttackers.forEach(human => {
             if (human.hasAttackedThisTick) return; // Skip if already attacked (e.g., by an earlier attacker in this loop)

            const adjacentCells = this.getAdjacentCells(human.x, human.y, true); // include Diagonals? Let's say no for now. Use false. TODO: Revisit diagonal attacks?
            // Let's enable diagonal attacks for now.
            // const adjacentCells = this.getAdjacentCells(human.x, human.y, true);

            let attackedZombie = false;
            for (const cell of adjacentCells) {
                const targetEntity = this.getEntityAt(cell.x, cell.y);

                if (targetEntity && targetEntity.type === 'ZOMBIE' && !zombiesTargetedThisTick.has(targetEntity.id)) {
                    console.log(`Combat: Human ${human.id} attacks Zombie ${targetEntity.id} at (${cell.x}, ${cell.y})`);

                    zombiesToRemove.add(targetEntity.id);
                    zombiesTargetedThisTick.add(targetEntity.id); // Mark this zombie as targeted

                    human.weaponCooldown = HUMAN_WEAPON_COOLDOWN;
                    human.hasAttackedThisTick = true; // Mark human as having acted

                    attackedZombie = true;
                    break; // Human attacks only one zombie per tick
                }
            }
        });

        // Remove defeated zombies
        zombiesToRemove.forEach(zombieId => {
            console.log(`Removing defeated Zombie ${zombieId}`);
            this.removeEntity(zombieId);
        });
    }

    // Helper to get adjacent cell coordinates with toroidal wrapping
    getAdjacentCells(x, y, includeDiagonals = false) {
        const adjacent = [];
        const deltas = [
            { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 } // Cardinal
        ];
        if (includeDiagonals) {
            deltas.push(
                { dx: -1, dy: -1 }, { dx: -1, dy: 1 }, { dx: 1, dy: -1 }, { dx: 1, dy: 1 } // Diagonal
            );
        }

        deltas.forEach(delta => {
            const newX = (x + delta.dx + this.gridWidth) % this.gridWidth;
            const newY = (y + delta.dy + this.gridHeight) % this.gridHeight;
            adjacent.push({ x: newX, y: newY });
        });

        return adjacent;
    }

    tick() {
        try { // <--- Start Try Block
            console.log("DEBUG TICK: ------------- Tick function START -------------");

            // 0. Update Cooldowns and Reset Flags
            Array.from(this.entities.values()).forEach(entity => {
                if (entity.type === 'HUMAN') {
                    entity.hasAttackedThisTick = false; // Reset attack flag

                    // Decrease weapon cooldown
                    if (entity.weaponCooldown > 0) {
                        entity.weaponCooldown--;
                    }
                }
                // Reset intention
                 entity.intendedMove = null;
            });

            // 1. Resolve Combat
            this._resolveCombat();

            // 2. Determine Intentions
            const { intentions, movingEntities } = this._gatherIntentions();

            // 3. Resolve Conflicts
            const { successfulMoves, infections } = this._resolveConflicts(intentions);

            // 4. Apply State Changes
            this._applyStateChanges(successfulMoves, infections);

            console.log("DEBUG TICK: ------------- Tick function END -------------  ");

        } catch (error) { // <--- Catch Block
            console.error("ERROR INSIDE TICK FUNCTION:", error);
        }
    }

    /**
     * Finds the nearest entity of a specific type relative to a starting point.
     * @param {number} startX - The starting X coordinate.
     * @param {number} startY - The starting Y coordinate.
     * @param {string} entityType - The type of entity to search for ('HUMAN', 'ZOMBIE').
     * @param {number} [maxDistance=Infinity] - The maximum distance to search.
     * @param {function|null} [filterFn=null] - An optional function to further filter entities. Takes entity as argument, returns true if valid.
     * @returns {Entity|null} The nearest matching entity or null if none found within range.
     */
    findNearestEntity(startX, startY, entityType, maxDistance = Infinity, filterFn = null) {
        let nearestEntity = null;
        let minDistance = maxDistance;

        for (const entity of this.entities.values()) {
            if (entity.type === entityType) {
                 // Skip self if applicable (e.g., finding nearest *other* human)
                 if (entity.x === startX && entity.y === startY) {
                    continue;
                 }

                // Apply optional filter function
                if (filterFn && !filterFn(entity)) {
                    continue;
                }

                const distance = this.calculateToroidalDistance(startX, startY, entity.x, entity.y);

                if (distance < minDistance) {
                    minDistance = distance;
                    nearestEntity = entity;
                }
            }
        }
        // Ensure the found entity is actually within the original maxDistance threshold
        // (minDistance starts at maxDistance, so this check is important)
         if (nearestEntity && minDistance <= maxDistance) {
            return nearestEntity;
         } else {
             return null;
         }
    }

    /**
     * Determines the best single step (move) towards a target coordinate.
     * Considers toroidal distance and obstacles.
     * @param {number} startX - The starting X coordinate.
     * @param {number} startY - The starting Y coordinate.
     * @param {number} targetX - The target X coordinate.
     * @param {number} targetY - The target Y coordinate.
     * @returns {{targetX: number, targetY: number}|null} The coordinates of the best next cell, or null if no valid move improves distance.
     */
    getMoveTowards(startX, startY, targetX, targetY) {
        // If already at the target, no move needed
        if (startX === targetX && startY === targetY) {
            return null;
        }

        const queue = [];
        const visited = new Set();
        const parentMap = new Map(); // To reconstruct the path

        const startKey = `${startX},${startY}`;
        visited.add(startKey);
        queue.push({ x: startX, y: startY });
        parentMap.set(startKey, null); // Start has no parent

        let targetFound = false;
        let current = null;
        const maxSearchSteps = this.gridWidth * this.gridHeight; // Safety break
        let steps = 0;

        while (queue.length > 0 && steps < maxSearchSteps) {
            current = queue.shift();
            steps++;

            if (current.x === targetX && current.y === targetY) {
                targetFound = true;
                break;
            }

            // Explore neighbors (cardinal directions only)
            const possibleMoves = [
                { dx: 0, dy: -1 }, // Up
                { dx: 0, dy: 1 },  // Down
                { dx: -1, dy: 0 }, // Left
                { dx: 1, dy: 0 }   // Right
            ];

            // --- Explore Neighbors --- 
            // Shuffle moves slightly to avoid bias in path choice if multiple shortest paths exist
            possibleMoves.sort(() => Math.random() - 0.5);

            for (const move of possibleMoves) {
                let nextX = (current.x + move.dx + this.gridWidth) % this.gridWidth;
                let nextY = (current.y + move.dy + this.gridHeight) % this.gridHeight;
                const nextKey = `${nextX},${nextY}`;

                if (!visited.has(nextKey)) {
                    const entityAtNext = this.getEntityAt(nextX, nextY);
                    // Check if the cell is valid (empty or non-obstacle)
                    if (entityAtNext === null || (entityAtNext && entityAtNext.type !== 'OBSTACLE')) {
                        visited.add(nextKey);
                        parentMap.set(nextKey, current); // Store parent for path reconstruction
                        queue.push({ x: nextX, y: nextY });
                    }
                }
            }
             // --- End Explore Neighbors ---
        }

        if (targetFound) {
            // Reconstruct the path backwards to find the first step from the start
            let pathNode = current; // 'current' holds the target node info
            let parent = parentMap.get(`${pathNode.x},${pathNode.y}`);

            // Traverse back until we find the node whose parent is the start node
            while (parent && (parent.x !== startX || parent.y !== startY)) {
                pathNode = parent;
                parent = parentMap.get(`${pathNode.x},${pathNode.y}`);
            }

            // If parent is null, it means start === target, handled earlier.
            // Otherwise, pathNode is the first step taken from the start node.
            if (parent && parent.x === startX && parent.y === startY) {
                return { targetX: pathNode.x, targetY: pathNode.y };
            } else {
                 // Should not happen if targetFound is true and start !== target
                 console.error("BFS path reconstruction failed unexpectedly.", {startX, startY, targetX, targetY});
                 return null;
            }
        } else {
            // Target not found or BFS limit reached
            return null;
        }
    }
}

// Make available globally for main.js
window.Simulation = Simulation; 