export enum EntityType {
    Player,
    Projectile,
    Obstacle
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
    ammoTypes: ["bullet", "shell", "rocket", "cell"]
} as const;
