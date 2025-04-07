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