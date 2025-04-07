// zombie.js
// Depends on entity.js being loaded first.

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