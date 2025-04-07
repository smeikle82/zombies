// obstacle.js
// Depends on entity.js being loaded first.

class Obstacle extends Entity {
    constructor(x, y) {
        super(x, y, 'OBSTACLE');
        this.color = 'gray'; // Or whatever color you prefer for walls
    }
} 