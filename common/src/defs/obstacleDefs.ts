import { DefinitionList, type ImgDefinition } from "../utils/definitionList";
import { CircleHitbox, type HitboxJSON } from "../utils/hitbox";

export interface ObstacleDef {
    hitbox: HitboxJSON;
    health: number;
    img: ImgDefinition;
}

export type ObstacleDefKey = "barrel";

const rawDefs: Record<ObstacleDefKey, ObstacleDef> = {
    barrel: {
        hitbox: new CircleHitbox(2).toJSON(),
        health: 100,
        img: {
            src: "barrel.svg",
            tint: 0x550000,
        },
    },
};

export const ObstacleDefs = new DefinitionList(rawDefs);
