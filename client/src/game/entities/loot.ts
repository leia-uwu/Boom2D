import { Sprite, Texture } from "pixi.js";
import { EntityType, GameConstants } from "../../../../common/src/constants";
import { type LootDefKey, LootDefs } from "../../../../common/src/defs/lootDefs";
import type { EntitiesNetData } from "../../../../common/src/packets/updatePacket";
import { CircleHitbox } from "../../../../common/src/utils/hitbox";
import { MathUtils } from "../../../../common/src/utils/math";
import { Helpers } from "../../helpers";
import { Camera } from "../camera";
import { ClientEntity, EntityPool } from "./entity";

export class LootManager extends EntityPool<Loot> {
    constructor() {
        super(Loot);
    }
}

export class Loot extends ClientEntity {
    readonly __type = EntityType.Loot;

    canPickup = true;
    type = "" as LootDefKey;

    sprite = new Sprite();
    background = new Sprite(Texture.from("glow-particle.svg"));
    hitbox = new CircleHitbox(GameConstants.loot.radius);

    scaleTicker!: number;
    scalingDown!: boolean;

    override init() {
        this.container.visible = true;
        this.container.addChild(this.background, this.sprite);
        this.sprite.anchor.set(0.5, 0.5);

        this.background.anchor.set(0.5, 0.5);
        this.scaleTicker = Math.random();
        this.scalingDown = false;
    }

    override updateFromData(
        data: EntitiesNetData[EntityType.Loot],
        isNew: boolean
    ): void {
        super.updateFromData(data, isNew);

        this.canPickup = data.canPickup;

        if (data.full) {
            this.position = data.full.position;
            this.type = data.full.type;
            const def = LootDefs.typeToDef(this.type);

            Helpers.spriteFromDef(this.sprite, def.lootImg);
            this.background.width = this.background.height = this.sprite.width;
        }
    }

    override render(dt: number): void {
        super.render(dt);
        this.container.alpha = this.canPickup ? 1 : 0.3;
        this.background.visible = this.canPickup;

        if (this.canPickup) {
            if (this.scalingDown) {
                this.scaleTicker -= dt;
            } else {
                this.scaleTicker += dt;
            }

            if (this.scaleTicker <= 0) {
                this.scalingDown = false;
            }

            if (this.scaleTicker > 2) {
                this.scalingDown = true;
            }

            this.container.scale = MathUtils.remap(this.scaleTicker, 0, 2, 0.8, 1);
        } else {
            this.container.scale = 1;
        }
        const pos = Camera.vecToScreen(this.position);
        this.container.position = pos;
    }

    override free() {
        this.container.visible = false;
    }

    override destroy(): void {
        this.container.destroy({
            children: true
        });
    }
}
