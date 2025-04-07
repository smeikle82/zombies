// weapon.js
// Depends on entity.js being loaded first.

class Weapon extends Entity {
    constructor(x, y) {
        super(x, y, 'WEAPON');
        this.color = 'red';
        this.state = 'ON_GROUND';
    }
} 