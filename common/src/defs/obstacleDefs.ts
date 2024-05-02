import { DefinitionList } from "../utils/definitionList";
import { CircleHitbox, HitboxJSON } from "../utils/hitbox";

interface ObstacleDef {
    hitbox: HitboxJSON
    health: number
}

export const ObstacleDefs = new DefinitionList<ObstacleDef>({
    barrel: {
        hitbox: new CircleHitbox(2).toJSON(),
        health: 100
    }
} satisfies Record<string, ObstacleDef>);

export type ObstacleDefKey = keyof typeof ObstacleDefs["definitions"];
