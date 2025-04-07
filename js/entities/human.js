// human.js
// Depends on entity.js being loaded first.

class Human extends Entity {
    constructor(x, y) {
        super(x, y, 'HUMAN');
        this.state = 'ALIVE'; // Might change to INFECTED, then ZOMBIE
        this.hasWeapon = false; // Becomes true when weapon picked up
        this.weaponCooldown = 0; // Ticks remaining until weapon can be used again
        this.hasAttackedThisTick = false; // Reset at the start of each tick
        this.intendedMove = null; // { targetX, targetY }
        this.currentDirection = null; // { dx, dy } - Keep track of the last move
    }

    // Getter for dynamic color based on weapon status and cooldown
    get color() {
        if (!this.hasWeapon) {
            return 'white'; // Unarmed
        } else {
            if (this.weaponCooldown > 0) {
                return 'purple'; // Armed, but on cooldown
            } else {
                return 'orange'; // Armed and ready
            }
        }
    }

    getIntendedMove(simulation) {
        this.intendedMove = null; // Reset intended move

        if (this.hasWeapon) {
            // --- Armed Human Logic ---

            // Priority 1: Attack adjacent zombie if cooldown is 0
            if (this.weaponCooldown === 0) {
                const adjacentCells = simulation.getAdjacentCells(this.x, this.y, false); // Cardinal directions only for attacks
                for (const cell of adjacentCells) {
                    const entity = simulation.getEntityAt(cell.x, cell.y);
                    if (entity && entity.type === 'ZOMBIE') {
                        this.intendedMove = { targetX: this.x, targetY: this.y };
                        console.log(`DEBUG Human ${this.id} (${this.x},${this.y}): Intends to attack adjacent Z at (${cell.x},${cell.y}). Cooldown: ${this.weaponCooldown}`);
                        return this.intendedMove;
                    }
                }
            } else {
                 console.log(`DEBUG Human ${this.id} (${this.x},${this.y}): Cooldown active (${this.weaponCooldown}), cannot attack.`);
            }

            // Priority 2: Move towards nearest zombie within 10 cells
            console.log(`DEBUG Human ${this.id} (${this.x},${this.y}): Looking for Z within 10 cells.`);
            const nearestZombie = simulation.findNearestEntity(this.x, this.y, 'ZOMBIE', 10);
            if (nearestZombie) {
                console.log(`DEBUG Human ${this.id} (${this.x},${this.y}): Found nearest Z ${nearestZombie.id} at (${nearestZombie.x},${nearestZombie.y}). Attempting pathfinding.`);
                this.intendedMove = simulation.getMoveTowards(this.x, this.y, nearestZombie.x, nearestZombie.y, this);
                if (this.intendedMove) {
                     console.log(`DEBUG Human ${this.id} (${this.x},${this.y}): Path found to Z. Intended move: (${this.intendedMove.targetX},${this.intendedMove.targetY})`);
                    return this.intendedMove;
                } else {
                    console.log(`DEBUG Human ${this.id} (${this.x},${this.y}): Path to Z (${nearestZombie.x},${nearestZombie.y}) NOT found or blocked.`);
                }
            } else {
                 console.log(`DEBUG Human ${this.id} (${this.x},${this.y}): No Z found within 10 cells.`);
            }

            // Priority 3: Move towards nearest armed human within 10 cells
            console.log(`DEBUG Human ${this.id} (${this.x},${this.y}): Looking for armed H within 10 cells.`);
            const nearestArmedHuman = simulation.findNearestEntity(this.x, this.y, 'HUMAN', 10, (human) => human.hasWeapon && human !== this);
            if (nearestArmedHuman) {
                 console.log(`DEBUG Human ${this.id} (${this.x},${this.y}): Found nearest armed H ${nearestArmedHuman.id} at (${nearestArmedHuman.x},${nearestArmedHuman.y}). Attempting pathfinding.`);
                this.intendedMove = simulation.getMoveTowards(this.x, this.y, nearestArmedHuman.x, nearestArmedHuman.y, this);
                if (this.intendedMove) {
                    console.log(`DEBUG Human ${this.id} (${this.x},${this.y}): Path found to armed H. Intended move: (${this.intendedMove.targetX},${this.intendedMove.targetY})`);
                    return this.intendedMove;
                } else {
                     console.log(`DEBUG Human ${this.id} (${this.x},${this.y}): Path to armed H (${nearestArmedHuman.x},${nearestArmedHuman.y}) NOT found or blocked.`);
                }
            } else {
                 console.log(`DEBUG Human ${this.id} (${this.x},${this.y}): No armed H found within 10 cells.`);
            }

            // Priority 4 (Fallback): Random Movement
            console.log(`DEBUG Human ${this.id} (${this.x},${this.y}): Falling back to random movement.`);
            this.intendedMove = this._getRandomMove(simulation);
            if (this.intendedMove) {
                 console.log(`DEBUG Human ${this.id} (${this.x},${this.y}): Random move decided: (${this.intendedMove.targetX},${this.intendedMove.targetY})`);
                return this.intendedMove;
            }

        } else {
            // --- Unarmed Human Logic ---

            // Priority 1: Move towards nearest armed human (any distance)
            const nearestArmedHuman = simulation.findNearestEntity(this.x, this.y, 'HUMAN', Infinity, (human) => human.hasWeapon && human !== this);
            if (nearestArmedHuman) {
                const move = simulation.getMoveTowards(this.x, this.y, nearestArmedHuman.x, nearestArmedHuman.y, this);
                if (move) {
                    this.intendedMove = move;
                    // console.log(`Unarmed Human ${this.id} at (${this.x}, ${this.y}) moving towards armed human ${nearestArmedHuman.id} at (${nearestArmedHuman.x}, ${nearestArmedHuman.y}), intended: (${this.intendedMove.targetX}, ${this.intendedMove.targetY})`);
                    return this.intendedMove;
                } 
                // else: couldn't find a valid path towards armed human, fall through to default
            }

            // Default movement: Random walk (since no exit is defined yet)
             // console.log(`Unarmed Human ${this.id} at (${this.x}, ${this.y}) falling back to random movement (no armed human found or path blocked).`);
            this.intendedMove = this._getRandomMove(simulation);
            if (this.intendedMove) return this.intendedMove;
        }

        // Default: stay put if no move could be decided (shouldn't happen with random fallback)
        // console.log(`Human ${this.id} at (${this.x}, ${this.y}) could not decide move, staying put.`);
        this.intendedMove = { targetX: this.x, targetY: this.y };
        return this.intendedMove;
    }

    // Helper function for the old random movement logic
    _getRandomMove(simulation) {
        const changeDirectionProbability = 0.2; // 20% chance to change direction

        const possibleMoves = [
            { dx: 0, dy: -1 }, // Up
            { dx: 0, dy: 1 },  // Down
            { dx: -1, dy: 0 }, // Left
            { dx: 1, dy: 0 }   // Right
        ];

        let chosenMove = null;

        // Decide whether to continue in the current direction
        if (this.currentDirection && Math.random() > changeDirectionProbability) {
            chosenMove = this.currentDirection;
        } else {
            // Filter out the opposite direction to prevent immediate reversal
            let allowedMoves = possibleMoves;
            if (this.currentDirection) {
                allowedMoves = possibleMoves.filter(move =>
                    move.dx !== -this.currentDirection.dx || move.dy !== -this.currentDirection.dy
                );
                if (allowedMoves.length === 0) {
                    allowedMoves = possibleMoves;
                }
            }

            // Choose a new random direction from the allowed ones
            chosenMove = allowedMoves[Math.floor(Math.random() * allowedMoves.length)];
            this.currentDirection = chosenMove; // Update current direction
        }

        // Calculate target position with toroidal wrap
        let targetX = (this.x + chosenMove.dx + simulation.gridWidth) % simulation.gridWidth;
        let targetY = (this.y + chosenMove.dy + simulation.gridHeight) % simulation.gridHeight;

        // Return the intended move coordinates
        return { targetX, targetY };
    }
} 