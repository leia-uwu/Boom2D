import { EntityType } from "@common/constants";
import { type ObstacleDefKey, ObstacleDefs } from "@common/defs/obstacleDefs";
import type { EntitiesNetData } from "@common/packets/updatePacket";
import { BaseHitbox, type Hitbox } from "@common/utils/hitbox";
import type { Vector } from "@common/utils/vector";
import type { Game } from "../game";
import { AbstractServerEntity, EntityPool } from "./entity";

export class ObstacleManager extends EntityPool<Obstacle> {
    override readonly type = EntityType.Obstacle;
    constructor(game: Game) {
        super(game, Obstacle);
    }
}

export class Obstacle extends AbstractServerEntity<EntityType.Obstacle> {
    override readonly __type = EntityType.Obstacle;

    type!: ObstacleDefKey;
    override hitbox!: Hitbox;

    init(position: Vector, type: ObstacleDefKey) {
        this.position = position;
        this.type = type;
        const def = ObstacleDefs.typeToDef(type);
        this.hitbox = BaseHitbox.fromJSON(def.hitbox).transform(this.position);
    }

    update() {}

    get data(): Required<EntitiesNetData[EntityType.Obstacle]> {
        return {
            full: {
                position: this.position,
                type: this.type,
            },
        };
    }
}
