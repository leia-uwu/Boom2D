import { Sprite } from "pixi.js";
import { type Game } from "../game";
import { ClientEntity } from "./entity";
import { type EntitiesNetData } from "../../../../common/src/packets/updatePacket";
import { Camera } from "../camera";
import { EntityType } from "../../../../common/src/constants";
import { BaseHitbox, Hitbox } from "../../../../common/src/utils/hitbox";
import { ObstacleDefKey, ObstacleDefs } from "../../../../common/src/defs/obstacleDefs";
import { Helpers } from "../../helpers";

export class Obstacle extends ClientEntity {
    readonly __type = EntityType.Obstacle;
    hitbox!: Hitbox;
    type = "" as ObstacleDefKey;
    sprite = new Sprite();

    constructor(game: Game, id: number) {
        super(game, id);

        this.container.addChild(this.sprite);
        this.sprite.anchor.set(0.5, 0.5);
    }

    override updateFromData(data: EntitiesNetData[EntityType.Obstacle], isNew: boolean): void {
        super.updateFromData(data, isNew);

        if (data.full) {
            this.position = data.full.position;
            this.type = data.full.type;
            const def = ObstacleDefs.typeToDef(this.type);

            this.hitbox = BaseHitbox.fromJSON(def.hitbox).transform(this.position, 0, 1);

            Helpers.spriteFromDef(this.sprite, def.img);
        }
    }

    override render(dt: number): void {
        super.render(dt);
        const pos = Camera.vecToScreen(this.position);
        this.container.position = pos;
    }

    override destroy(): void {
        this.container.destroy({
            children: true
        });
    }
}
