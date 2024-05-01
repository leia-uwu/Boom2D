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

export const BulletDefs = new DefinitionList({
    pistol_bullet: {
        damage: {
            min: 5,
            max: 15
        },
        speed: 120,
        maxDistance: 150,
        trailMaxLength: 20
    }
} satisfies Record<string, BulletDef>);

export type BulletDefKey = keyof typeof BulletDefs["definitions"];
