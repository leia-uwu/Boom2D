import { Sprite } from "pixi.js";
import { EntityType } from "../../../../common/src/constants";
import {
    type ObstacleDefKey,
    ObstacleDefs
} from "../../../../common/src/defs/obstacleDefs";
import type { EntitiesNetData } from "../../../../common/src/packets/updatePacket";
import { BaseHitbox, type Hitbox } from "../../../../common/src/utils/hitbox";
import { Helpers } from "../../helpers";
import { Camera } from "../camera";
import { ClientEntity, EntityPool } from "./entity";

export class ObstacleManager extends EntityPool<Obstacle> {
    constructor() {
        super(Obstacle);
    }
}

export class Obstacle extends ClientEntity {
    readonly __type = EntityType.Obstacle;
    hitbox!: Hitbox;
    type = "" as ObstacleDefKey;
    sprite = new Sprite();

    override init() {
        this.container.addChild(this.sprite);
        this.sprite.anchor.set(0.5, 0.5);
        this.container.visible = true;
    }

    override updateFromData(
        data: EntitiesNetData[EntityType.Obstacle],
        isNew: boolean
    ): void {
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

    override free(): void {
        this.container.visible = false;
    }

    override destroy(): void {
        this.container.destroy({
            children: true
        });
    }
}
