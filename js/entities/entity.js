// entity.js

// Simple unique ID generator
let entityCounter = 0;

class Entity {
    constructor(x, y, type) {
        this.id = entityCounter++;
        this.x = x;
        this.y = y;
        this.type = type; // 'HUMAN', 'ZOMBIE', 'WEAPON', 'OBSTACLE'
    }
}

// Export or make available globally depending on module system
// For simple setup, Entity will be global if this script is included first.
// Other entity types (Human, Zombie, etc.) are defined in separate files. 