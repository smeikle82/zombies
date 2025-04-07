// zombie.js
// Depends on entity.js being loaded first.

class Zombie extends Entity {
    constructor(x, y) {
        super(x, y, 'ZOMBIE');
        this.color = 'green';
        this.state = 'ZOMBIE';
        this.intendedMove = null; // { targetX, targetY }

        // Initialize visual coordinates immediately
        this.visualX = this.x;
        this.visualY = this.y;
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

            // Simple greedy move: Try to reduce both dx and dy if possible (diagonal)
            // Otherwise, reduce the larger component (cardinal)
            if (dx !== 0) {
                moveDx = Math.sign(dx);
            }
            if (dy !== 0) {
                moveDy = Math.sign(dy);
            }

            // If dx and dy are both non-zero, we've selected a diagonal move.
            // If one is zero, we've selected a cardinal move.
            // If both are zero (already handled by if (nearestHuman)), logic below defaults to random.
            
            // Ensure we don't just stay put if target is adjacent
            if (moveDx === 0 && moveDy === 0 && (Math.abs(dx) > 0 || Math.abs(dy) > 0)) {
                // This case should theoretically not happen with the logic above,
                // but as a fallback, let's pick a random valid move.
                 console.warn(`Zombie ${this.id} at (${this.x},${this.y}) target (${nearestHuman.x},${nearestHuman.y}) resulted in zero move. Falling back to random.`);
                 const possibleMoves = [
                    { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
                    { dx: -1, dy: -1 }, { dx: -1, dy: 1 }, { dx: 1, dy: -1 }, { dx: 1, dy: 1 }
                 ];
                 const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                 moveDx = randomMove.dx;
                 moveDy = randomMove.dy;
            }
            
            // --- Obstacle Check and Fallback --- 
            let finalMoveDx = moveDx;
            let finalMoveDy = moveDy;
            let potentialTargetX = (this.x + finalMoveDx + simulation.gridWidth) % simulation.gridWidth;
            let potentialTargetY = (this.y + finalMoveDy + simulation.gridHeight) % simulation.gridHeight;
            let entityAtTarget = simulation.getEntityAt(potentialTargetX, potentialTargetY);

            if (entityAtTarget && entityAtTarget.type === 'OBSTACLE') {
                // Ideal move is blocked, try cardinal fallbacks
                console.log(`DEBUG Zombie ${this.id}: Ideal move (${potentialTargetX},${potentialTargetY}) blocked by obstacle. Trying fallbacks.`);
                finalMoveDx = 0; // Reset, try alternatives
                finalMoveDy = 0;
                let foundFallback = false;

                // Try Horizontal first if applicable
                if (moveDx !== 0) {
                    let horizontalTargetX = (this.x + moveDx + simulation.gridWidth) % simulation.gridWidth;
                    let horizontalTargetY = this.y; // Keep Y the same
                    let entityAtHorizontal = simulation.getEntityAt(horizontalTargetX, horizontalTargetY);
                    if (!entityAtHorizontal || entityAtHorizontal.type !== 'OBSTACLE') {
                        console.log(`DEBUG Zombie ${this.id}: Fallback horizontal move to (${horizontalTargetX},${horizontalTargetY}) is clear.`);
                        finalMoveDx = moveDx;
                        finalMoveDy = 0;
                        foundFallback = true;
                    }
                }

                // If horizontal didn't work or wasn't tried, try Vertical
                if (!foundFallback && moveDy !== 0) {
                    let verticalTargetX = this.x; // Keep X the same
                    let verticalTargetY = (this.y + moveDy + simulation.gridHeight) % simulation.gridHeight;
                    let entityAtVertical = simulation.getEntityAt(verticalTargetX, verticalTargetY);
                     if (!entityAtVertical || entityAtVertical.type !== 'OBSTACLE') {
                        console.log(`DEBUG Zombie ${this.id}: Fallback vertical move to (${verticalTargetX},${verticalTargetY}) is clear.`);
                        finalMoveDx = 0;
                        finalMoveDy = moveDy;
                        foundFallback = true;
                    }
                }

                if (!foundFallback) {
                     console.log(`DEBUG Zombie ${this.id}: All preferred moves blocked by obstacles. Staying put.`);
                    // Keep finalMoveDx/Dy as 0
                }
            } // End of obstacle check
            // --- End Obstacle Check and Fallback --- 

            // Calculate final target based on potentially adjusted move
            targetX = (this.x + finalMoveDx + simulation.gridWidth) % simulation.gridWidth;
            targetY = (this.y + finalMoveDy + simulation.gridHeight) % simulation.gridHeight;

        } else {
            // No humans left, perform random walk (now 8 directions)
            console.log(`Zombie ${this.id} performing random walk (no humans found).`);
            const possibleMoves = [
                { dx: 0, dy: -1 }, // Up
                { dx: 0, dy: 1 },  // Down
                { dx: -1, dy: 0 }, // Left
                { dx: 1, dy: 0 },  // Right
                { dx: -1, dy: -1 }, // Up-Left
                { dx: -1, dy: 1 },  // Down-Left
                { dx: 1, dy: -1 },  // Up-Right
                { dx: 1, dy: 1 }   // Down-Right
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