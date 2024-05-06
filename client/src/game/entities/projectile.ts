import { Color, Sprite } from "pixi.js";
import { type Game } from "../game";
import { ClientEntity } from "./entity";
import { type EntitiesNetData } from "../../../../common/src/packets/updatePacket";
import { Vec2 } from "../../../../common/src/utils/vector";
import { Camera } from "../camera";
import { EntityType } from "../../../../common/src/constants";
import { CircleHitbox } from "../../../../common/src/utils/hitbox";
import { ProjectileDef, ProjectileDefKey, ProjectileDefs } from "../../../../common/src/defs/projectileDefs";
import { spriteFromDef } from "../../utils";
import { Random } from "../../../../common/src/utils/random";
import { EasinFunctions } from "../../../../common/src/utils/math";

export class Projectile extends ClientEntity {
    readonly __type = EntityType.Projectile;
    hitbox!: CircleHitbox;
    sprite = new Sprite();

    type!: ProjectileDefKey;
    initialPosition = Vec2.new(0, 0);

    spin = false;

    particleTicker = 0;

    constructor(game: Game, id: number) {
        super(game, id);

        this.container.addChild(this.sprite);
        this.sprite.anchor.set(0.5, 0.5);
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

            const def = ProjectileDefs.typeToDef(this.type) as ProjectileDef;
            this.spin = !!def.img.spin;

            if (this.spin) {
                this.container.rotation = Random.float(0, Math.PI * 2);
            } else {
                this.container.rotation = Math.atan2(data.full.direction.y, data.full.direction.x);
            }

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

        if (this.spin) {
            this.container.rotation += dt * 2;
        }
        const def = ProjectileDefs.typeToDef(this.type) as ProjectileDef;

        if (def.particles) {
            this.particleTicker += dt;

            const particles = def.particles;
            if (this.particleTicker > def.particles.spawnDelay) {
                this.particleTicker = 0;

                const rot = this.container.rotation - Math.PI;
                this.game.particleManager.spawnParticles(particles.amount, () => {
                    return {
                        position: Vec2.add(this.position, Vec2.rotate(Vec2.new(particles.spawnOffset, 0), rot)),
                        lifeTime: { min: 0.5, max: 1 },
                        blendMode: "add",
                        zIndex: -1,
                        tint: new Color(`hsl(${Random.int(particles.hue.min, particles.hue.max)}, 100%, 50%)`),
                        sprite: "glow-particle.svg",
                        rotation: { value: 0 },
                        alpha: { start: 1, end: 0, easing: EasinFunctions.sineIn },
                        scale: { start: 2, end: 0 },
                        speed: particles.speed,
                        direction: { min: rot - 0.2, max: rot + 0.2 }
                    };
                });
            }
        }

        this.container.position = pos;
    }

    override destroy(): void {
        this.container.destroy({
            children: true
        });
    }
}
