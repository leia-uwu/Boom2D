export enum EntityType {
    Invalid,
    Player,
    Projectile,
    Obstacle,
    Loot,
    Beam,
}

export type ValidEntityType = Exclude<EntityType, EntityType.Invalid>;

export enum DamageType {
    None, // "their head just did that"
    Player,
}

export const GameConstants = {
    maxPosition: 512,
    maxEntityId: (1 << 16) - 1,
    leaderboardMaxEntries: 10,
    gameSpeed: 1, // for debugging, this multiplies the delta time on client and server
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
        defaultArmor: 0,
    },
} as const;
