import { Sprite } from "pixi.js";
import { EntityType } from "../../../../common/src/constants";
import {
    type ProjectileDef,
    type ProjectileDefKey,
    ProjectileDefs,
} from "../../../../common/src/defs/projectileDefs";
import type { EntitiesNetData } from "../../../../common/src/packets/updatePacket";
import { CircleHitbox } from "../../../../common/src/utils/hitbox";
import { Random } from "../../../../common/src/utils/random";
import { Vec2 } from "../../../../common/src/utils/vector";
import { Helpers } from "../../helpers";
import { Camera } from "../camera";
import { DEBUG_ENABLED, debugRenderer } from "../debug";
import type { ParticleDefKey } from "../particle";
import { ClientEntity, EntityPool } from "./entity";

export class ProjectileManager extends EntityPool<Projectile> {
    constructor() {
        super(Projectile);
    }
}

export class Projectile extends ClientEntity {
    readonly __type = EntityType.Projectile;
    hitbox!: CircleHitbox;
    sprite = new Sprite();

    type!: ProjectileDefKey;
    initialPosition = Vec2.new(0, 0);

    spin = false;

    particleTicker = 0;

    direction = Vec2.new(0, 0);
    rotation = 0;

    override init() {
        this.container.addChild(this.sprite);
        this.sprite.anchor.set(0.5, 0.5);
    }

    override updateFromData(
        data: EntitiesNetData[EntityType.Projectile],
        isNew: boolean,
    ): void {
        super.updateFromData(data, isNew);

        if (isNew) {
            this.initialPosition = Vec2.clone(data.position);
        }

        this.oldPosition = isNew ? data.position : Vec2.clone(this.position);
        this.position = data.position;

        if (data.full) {
            this.type = data.full.type;

            const def = ProjectileDefs.typeToDef(this.type) as ProjectileDef;
            this.spin = !!def.img.spin;

            this.direction = data.full.direction;
            this.rotation = Math.atan2(data.full.direction.y, data.full.direction.x);
            if (this.spin) {
                this.container.rotation = Random.float(0, Math.PI * 2);
            } else {
                this.container.rotation = this.rotation;
            }

            this.hitbox = new CircleHitbox(def.radius);
            Helpers.spriteFromDef(this.sprite, def.img);
        }
        this.hitbox.position = data.position;
    }

    override update(dt: number): void {
        super.update(dt);
        const pos = Vec2.lerp(this.oldPosition, this.position, this.interpolationFactor);

        if (this.spin) {
            this.container.rotation += dt * 2;
        }
        const def = ProjectileDefs.typeToDef(this.type) as ProjectileDef;

        if (def.particles) {
            this.particleTicker += dt;

            const particles = def.particles;
            if (this.particleTicker > def.particles.spawnDelay) {
                this.particleTicker = 0;

                const rot = this.rotation - Math.PI;

                for (let i = 0; i < def.particles.amount; i++) {
                    const particlePos = Vec2.add(
                        pos,
                        Vec2.rotate(Vec2.new(particles.spawnOffset, 0), rot),
                    );
                    if (def.particles.randomPlacement) {
                        Vec2.set(
                            particlePos,
                            Random.pointInsideCircle(particlePos, def.radius),
                        );
                    }
                    this.game.particleManager.addParticle(
                        particlePos,
                        Vec2.fromPolar(Random.float(rot - 0.2, rot + 0.2)),
                        def.particles.type as ParticleDefKey,
                    );
                }
            }
        }

        this.container.position = Camera.vecToScreen(pos);

        if (DEBUG_ENABLED) {
            debugRenderer.addHitbox(this.hitbox, 0xff0000);
        }
    }

    override free(): void {
        this.container.visible = false;
    }

    override destroy(): void {
        this.container.destroy({
            children: true,
        });
    }
}
