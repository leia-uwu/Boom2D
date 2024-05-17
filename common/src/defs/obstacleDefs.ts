import { DefinitionList, ImgDefinition } from "../utils/definitionList";
import { CircleHitbox, HitboxJSON } from "../utils/hitbox";

export interface ObstacleDef {
    hitbox: HitboxJSON
    health: number
    img: ImgDefinition
}

export const ObstacleDefs = new DefinitionList({
    barrel: {
        hitbox: new CircleHitbox(2).toJSON(),
        health: 100,
        img: {
            src: "barrel.svg",
            tint: 0x550000
        }
    }
} satisfies Record<string, ObstacleDef>);

export type ObstacleDefKey = keyof typeof ObstacleDefs["definitions"];
