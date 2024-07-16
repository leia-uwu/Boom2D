import { Sprite } from "pixi.js";
import { BaseBullet, type BulletParams } from "../../../common/src/baseBullet";
import type { Wall } from "../../../common/src/baseMap";
import { EntityType } from "../../../common/src/constants";
import { BulletDefs } from "../../../common/src/defs/bulletDefs";
import { ObstacleDefs } from "../../../common/src/defs/obstacleDefs";
import { MathUtils } from "../../../common/src/utils/math";
import { Vec2, type Vector } from "../../../common/src/utils/vector";
import { Camera } from "./camera";
import type { ClientEntity } from "./entities/entity";
import type { Obstacle } from "./entities/obstacle";
import type { Game } from "./game";

export class BulletManager {
    readonly bullets: ClientBullet[] = [];

    constructor(readonly game: Game) {}

    tick(dt: number) {
        for (let i = 0; i < this.bullets.length; i++) {
            const bullet = this.bullets[i];
            bullet.tick(dt);
            if (!bullet.active) {
                this.bullets.splice(i, 1);
                bullet.destroy();
            }
        }
    }

    fireBullet(params: BulletParams) {
        const bullet = new ClientBullet(this.game, params);
        this.bullets.push(bullet);
        return bullet;
    }
}

export class ClientBullet extends BaseBullet {
    trailSprite = Sprite.from("bullet-trail.svg");
    trailTicks = 0;
    active = true;
    trailReachedMaxLength = false;

    constructor(
        readonly game: Game,
        params: BulletParams
    ) {
        super(params);

        this.trailSprite.anchor.set(1, 0.5);
        this.trailSprite.rotation = Math.atan2(this.direction.y, this.direction.x);
        this.trailSprite.position = Camera.vecToScreen(this.position);
        game.camera.addObject(this.trailSprite);
    }

    override tick(dt: number) {
        if (!this.dead) {
            super.tick(dt);
            const collisions = this.checkCollisions(
                this.game.entityManager.entities,
                this.game.map
            );

            for (const collision of collisions) {
                this.dead = true;
                this.position = collision.position;

                this.createHitParticle(
                    collision.position,
                    collision.normal,
                    collision.wall,
                    collision.entity
                );

                break;
            }
        }

        const def = BulletDefs.typeToDef(this.type);

        if (!this.dead && !this.trailReachedMaxLength) {
            this.trailTicks += dt;
        } else if (this.dead) {
            this.trailTicks -= dt;
        }

        if (this.distanceTraveled > def.maxDistance) {
            this.dead = true;
            this.position = Vec2.clone(this.finalPosition);
        }

        const length = MathUtils.min(
            MathUtils.min(
                def.speed * this.trailTicks,
                Vec2.distance(this.initialPosition, this.position)
            ),
            def.trailMaxLength
        );

        this.trailReachedMaxLength = length >= def.trailMaxLength;

        this.trailSprite.width = Camera.unitToScreen(length);
        this.trailSprite.position = Camera.vecToScreen(this.position);

        if (this.dead && this.trailTicks <= 0) {
            this.active = false;
        }
    }

    createHitParticle(
        position: Vector,
        normal: Vector,
        wall?: Wall,
        entity?: ClientEntity
    ) {
        if (wall || entity?.__type === EntityType.Obstacle) {
            let tint = 0xff0000;
            if (wall) {
                tint = wall.color;
            } else if (entity && entity.__type == EntityType.Obstacle) {
                const def = ObstacleDefs.typeToDef((entity as Obstacle).type);
                tint = def.img.tint;
            }

            this.game.particleManager.addParticle(position, normal, "wall_chip", {
                tint
            });
        } else if (entity?.__type === EntityType.Player) {
            this.game.particleManager.addParticle(position, normal, "blood");
        }
    }

    destroy() {
        this.trailSprite.destroy();
    }
}
