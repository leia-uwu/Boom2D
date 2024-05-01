import { EntityType } from "../../../common/src/constants";
import { ObstacleDefKey, ObstacleDefs } from "../../../common/src/defs/obstacleDefs";
import { EntitiesNetData } from "../../../common/src/packets/updatePacket";
import { BaseHitbox, Hitbox } from "../../../common/src/utils/hitbox";
import { Vector } from "../../../common/src/utils/vector";
import { Game } from "../game";
import { ServerEntity } from "./entity";

export class Obstacle extends ServerEntity {
    override readonly type = EntityType.Obstacle;

    obstacleType: ObstacleDefKey;
    override hitbox: Hitbox;

    constructor(game: Game, position: Vector, type: ObstacleDefKey) {
        super(game, position);
        this.obstacleType = type;
        const def = ObstacleDefs.typeToDef(type);
        this.hitbox = BaseHitbox.fromJSON(def.hitbox);
    }

    tick() {}

    get data(): Required<EntitiesNetData[EntityType.Obstacle]> {
        return {
            full: {
                position: this.position
            }
        };
    }
}
