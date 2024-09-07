export enum EntityType {
    Invalid,
    Player,
    Projectile,
    Obstacle,
    Loot
}

export type ValidEntityType = Exclude<EntityType, EntityType.Invalid>;

export const GameConstants = {
    maxPosition: 512,
    maxEntityId: (1 << 16) - 1,
    leaderboardMaxEntries: 10,
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
    }
} as const;
