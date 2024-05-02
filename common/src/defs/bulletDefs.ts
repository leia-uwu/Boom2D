import { DefinitionList } from "../utils/definitionList";

interface BulletDef {
    damage: {
        min: number
        max: number
    }
    speed: number
    maxDistance: number
    trailMaxLength: number
}

export const BulletDefs = new DefinitionList<BulletDef>({
    pistol_bullet: {
        damage: {
            min: 5,
            max: 15
        },
        speed: 110,
        maxDistance: 150,
        trailMaxLength: 20
    },
    shotgun_bullet: {
        damage: {
            min: 5,
            max: 15
        },
        speed: 80,
        maxDistance: 80,
        trailMaxLength: 15
    }
} satisfies Record<string, BulletDef>);

export type BulletDefKey = keyof typeof BulletDefs["definitions"];
