import { Sprite } from "pixi.js";
import { type Game } from "../game";
import { ClientEntity } from "./entity";
import { type EntitiesNetData } from "../../../../common/src/packets/updatePacket";
import { Vec2 } from "../../../../common/src/utils/vector";
import { Camera } from "../camera";
import { EntityType } from "../../../../common/src/constants";
import { CircleHitbox } from "../../../../common/src/utils/hitbox";
import { ProjectileDefKey, ProjectileDefs } from "../../../../common/src/defs/projectileDefs";
import { spriteFromDef } from "../../utils";
import { Random } from "../../../../common/src/utils/random";

export class Projectile extends ClientEntity {
    readonly __type = EntityType.Projectile;
    hitbox!: CircleHitbox;
    sprite = new Sprite();

    type!: ProjectileDefKey;
    initialPosition = Vec2.new(0, 0);

    constructor(game: Game, id: number) {
        super(game, id);

        this.container.addChild(this.sprite);
        this.sprite.anchor.set(0.5, 0.5);
        this.container.rotation = Random.float(0, Math.PI * 2);
    }

    override updateFromData(data: EntitiesNetData[EntityType.Projectile], isNew: boolean): void {
        super.updateFromData(data, isNew);

        if (isNew) {
            this.initialPosition = Vec2.clone(data.position);
        }

        this.oldPosition = isNew ? data.position : Vec2.clone(this.position);
        this.position = data.position;

        if (data.full) {
            this.type = data.full.type;

            const def = ProjectileDefs.typeToDef(this.type);
            this.hitbox = new CircleHitbox(def.radius);
            spriteFromDef(this.sprite, def.img);
        }
        this.hitbox.position = data.position;
    }

    override render(dt: number): void {
        super.render(dt);
        const pos = Camera.vecToScreen(
            Vec2.lerp(this.oldPosition, this.position, this.interpolationFactor)
        );
        this.container.rotation += dt;

        this.container.position = pos;
    }

    override destroy(): void {
        this.container.destroy({
            children: true
        });
    }
}
