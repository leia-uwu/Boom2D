import { DefinitionList } from "../utils/definitionList";

export interface BulletDef {
    damage: {
        min: number;
        max: number;
    };
    speed: number;
    maxDistance: number;
    trailMaxLength: number;
    trailColor?: number;
    trailFadeSpeed?: number;
}

export type BulletDefKey = "pistol_bullet" | "shotgun_bullet" | "bfg_tracer";

const rawDefs: Record<BulletDefKey, BulletDef> = {
    pistol_bullet: {
        damage: {
            min: 5,
            max: 15,
        },
        speed: 110,
        maxDistance: 150,
        trailMaxLength: 20,
    },
    shotgun_bullet: {
        damage: {
            min: 5,
            max: 15,
        },
        speed: 80,
        maxDistance: 80,
        trailMaxLength: 15,
    },
    bfg_tracer: {
        damage: {
            min: 20,
            max: 80,
        },
        speed: 200,
        maxDistance: 200,
        trailMaxLength: 200,
        trailColor: 0x00ff00,
        trailFadeSpeed: 0.1,
    },
};

export const BulletDefs = new DefinitionList<BulletDefKey, BulletDef>(rawDefs);
