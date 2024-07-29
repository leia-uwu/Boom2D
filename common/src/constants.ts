export enum EntityType {
    Invalid,
    Player,
    Projectile,
    Obstacle,
    Loot
}

export const GameConstants = {
    maxPosition: 512,
    player: {
        nameMaxLength: 16,
        radius: 1,
        defaultName: "Player",
        activeColor: "green",
        enemyColor: "red",
        speed: 20,
        defaultZoom: 32,
        maxHealth: 200,
        defaultHealth: 100,
        maxArmor: 200,
        defaultArmor: 0
    },
    loot: {
        radius: 1
    }
} as const;
