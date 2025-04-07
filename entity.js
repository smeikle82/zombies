// entity.js

// Simple unique ID generator
let entityCounter = 0;

class Entity {
    constructor(x, y, type) {
        this.id = entityCounter++;
        this.x = x;
        this.y = y;
        this.type = type; // 'HUMAN', 'ZOMBIE', 'WEAPON'
    }
}

class Human extends Entity {
    constructor(x, y) {
        super(x, y, 'HUMAN');
        this.state = 'ALIVE'; // Might change to INFECTED, then ZOMBIE
        this.hasWeapon = false; // Becomes true when weapon picked up
        this.intendedMove = null; // { targetX, targetY }
        this.currentDirection = null; // { dx, dy } - Keep track of the last move
    }

    // Getter for dynamic color based on weapon status
    get color() {
        return this.hasWeapon ? 'orange' : 'white';
    }

    getIntendedMove(simulation) {
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
                // If filtering somehow removed all options (shouldn't happen with 4 cardinal directions)
                // fall back to all possible moves.
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

        this.intendedMove = { targetX, targetY };
        // Validation happens in the simulation's conflict resolution step
        return this.intendedMove;
    }
}

class Zombie extends Entity {
    constructor(x, y) {
        super(x, y, 'ZOMBIE');
        this.color = 'green';
        this.state = 'ZOMBIE';
        this.intendedMove = null; // { targetX, targetY }
    }

    getIntendedMove(simulation) {
        const nearestHuman = simulation.findNearestHuman(this.x, this.y);

        let targetX, targetY;

        if (nearestHuman) {
            // Move towards the nearest human
            let dx = nearestHuman.x - this.x;
            let dy = nearestHuman.y - this.y;

            // Account for toroidal wrap-around distance
            if (Math.abs(dx) > simulation.gridWidth / 2) {
                dx = dx > 0 ? dx - simulation.gridWidth : dx + simulation.gridWidth;
            }
            if (Math.abs(dy) > simulation.gridHeight / 2) {
                dy = dy > 0 ? dy - simulation.gridHeight : dy + simulation.gridHeight;
            }

            let moveDx = 0;
            let moveDy = 0;

            // Decide primary direction (reduce the larger distance component first)
            if (Math.abs(dx) > Math.abs(dy)) {
                moveDx = Math.sign(dx);
            } else if (Math.abs(dy) > 0) { // Check dy > 0 to handle cases where dy is 0
                moveDy = Math.sign(dy);
            } else if (Math.abs(dx) > 0) { // If dy is 0, but dx is not
                 moveDx = Math.sign(dx);
            } else {
                 // Zombie is already on the same cell as the human (shouldn't happen if human is alive?)
                 // Or dx=0, dy=0. Stay put or random move? Let's do random for now.
                 const possibleMoves = [
                    { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
                 ];
                 const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                 moveDx = randomMove.dx;
                 moveDy = randomMove.dy;
            }

            targetX = (this.x + moveDx + simulation.gridWidth) % simulation.gridWidth;
            targetY = (this.y + moveDy + simulation.gridHeight) % simulation.gridHeight;

        } else {
            // No humans left, perform random walk
            console.log(`Zombie ${this.id} performing random walk (no humans found).`);
            const possibleMoves = [
                { dx: 0, dy: -1 }, // Up
                { dx: 0, dy: 1 },  // Down
                { dx: -1, dy: 0 }, // Left
                { dx: 1, dy: 0 }   // Right
            ];
            const move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
            targetX = (this.x + move.dx + simulation.gridWidth) % simulation.gridWidth;
            targetY = (this.y + move.dy + simulation.gridHeight) % simulation.gridHeight;
        }

        this.intendedMove = { targetX, targetY };
        // Validation happens in the simulation's conflict resolution step
        return this.intendedMove;
    }
}

class Weapon extends Entity {
    constructor(x, y) {
        super(x, y, 'WEAPON');
        this.color = 'red';
        this.state = 'ON_GROUND';
    }
}

// Export or make available globally depending on module system
// For simple setup, they will be global if script is included before simulation.js 