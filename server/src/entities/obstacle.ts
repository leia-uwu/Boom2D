import { EntityType } from "../../../common/src/constants";
import { type ObstacleDefKey, ObstacleDefs } from "../../../common/src/defs/obstacleDefs";
import type { EntitiesNetData } from "../../../common/src/packets/updatePacket";
import { BaseHitbox, type Hitbox } from "../../../common/src/utils/hitbox";
import type { Vector } from "../../../common/src/utils/vector";
import type { Game } from "../game";
import { AbstractServerEntity, EntityPool } from "./entity";

export class ObstacleManager extends EntityPool<Obstacle> {
    override readonly type = EntityType.Obstacle;
    constructor(game: Game) {
        super(game, Obstacle);
    }
}

export class Obstacle extends AbstractServerEntity {
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
                type: this.type
            }
        };
    }
}
