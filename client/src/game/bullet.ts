import { Sprite } from "pixi.js";
import { BaseBullet, type BulletParams } from "../../../common/src/baseBullet";
import type { MapObject } from "../../../common/src/baseMap";
import { EntityType } from "../../../common/src/constants";
import { type BulletDef, BulletDefs } from "../../../common/src/defs/bulletDefs";
import { ObstacleDefs } from "../../../common/src/defs/obstacleDefs";
import { MathUtils } from "../../../common/src/utils/math";
import { Random } from "../../../common/src/utils/random";
import { Vec2, type Vector } from "../../../common/src/utils/vector";
import { Camera } from "./camera";
import { DEBUG_ENABLED, debugRenderer } from "./debug";
import type { ClientEntity } from "./entities/entity";
import type { Obstacle } from "./entities/obstacle";
import type { Game } from "./game";

export class BulletManager {
    bullets: ClientBullet[] = [];
    activeCount = 0;

    constructor(readonly game: Game) {}

    update(dt: number) {
        this.activeCount = 0;
        for (let i = 0; i < this.bullets.length; i++) {
            const bullet = this.bullets[i];
            if (bullet.active) {
                bullet.update(dt);
                this.activeCount++;
            }
        }

        // free some bullets if pool is too big
        if (this.bullets.length > 128 && this.activeCount < this.bullets.length / 2) {
            const compact = [];
            for (let i = 0; i < this.bullets.length; i++) {
                const bullet = this.bullets[i];
                if (bullet.active) {
                    compact.push(bullet);
                } else {
                    bullet.trailSprite.destroy();
                }
            }
            this.bullets = compact;
        }
    }

    fireBullet(params: BulletParams) {
        let bullet: ClientBullet | undefined = undefined;

        for (let i = 0; i < this.bullets.length; i++) {
            if (!this.bullets[i].active) {
                bullet = this.bullets[i];
                break;
            }
        }

        if (!bullet) {
            bullet = new ClientBullet(this.game);
            this.bullets.push(bullet);
        }

        bullet.init(params);
        return bullet;
    }
}

export class ClientBullet extends BaseBullet {
    trailSprite = Sprite.from("bullet-trail.svg");
    trailFadeTicker!: number;
    trailMaxLength!: number;
    trailLength!: number;
    trailFadeSpeed!: number;

    constructor(readonly game: Game) {
        super();
        this.game.camera.addObject(this.trailSprite);
        this.trailSprite.anchor.set(1, 0.5);
    }

    init(params: BulletParams) {
        this._init(params);

        this.trailFadeTicker = 0;

        this.trailSprite.rotation = Math.atan2(this.direction.y, this.direction.x);
        this.trailSprite.position = Camera.vecToScreen(this.position);

        const def = BulletDefs.typeToDef(this.type) as BulletDef;
        this.trailMaxLength = def.trailMaxLength;
        this.trailFadeSpeed = def.trailFadeSpeed ?? 1;

        this.trailLength = 0;

        this.trailSprite.visible = true;
        this.trailSprite.tint = def.trailColor ?? 0xffffff;
    }

    override update(dt: number) {
        if (!this.dead) {
            super.update(dt);
            const collisions = this.checkCollisions(
                this.game.entityManager.entities,
                this.game.map
            );

            for (let i = 0; i < collisions.length; i++) {
                const collision = collisions[i];
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

        if (this.distanceTraveled > this.maxDistance) {
            this.dead = true;
            this.position = Vec2.clone(this.finalPosition);
        }

        this.trailLength = MathUtils.min(
            this.trailMaxLength,
            Vec2.distance(this.initialPosition, this.position)
        );
        if (this.dead) {
            this.trailFadeTicker += dt;
            this.trailLength = MathUtils.max(
                0,
                this.trailLength - this.trailFadeTicker * this.speed * this.trailFadeSpeed
            );
        }

        this.trailSprite.width = Camera.unitToScreen(this.trailLength);
        this.trailSprite.position = Camera.vecToScreen(this.position);

        if (this.dead && this.trailFadeTicker <= 0) {
            this.active = false;
            this.trailSprite.visible = false;
        }

        if (DEBUG_ENABLED) {
            debugRenderer.addLine(this.initialPosition, this.position, 0xff0000);
        }
    }

    createHitParticle(
        position: Vector,
        normal: Vector,
        wall?: MapObject,
        entity?: ClientEntity
    ) {
        if (wall || entity?.__type === EntityType.Obstacle) {
            let tint = 0xff0000;
            if (wall) {
                tint = wall.color;
            } else if (entity && entity.__type == EntityType.Obstacle) {
                const def = ObstacleDefs.typeToDef((entity as Obstacle).type);
                tint = def.img.tint ?? tint;
            }

            this.game.particleManager.addParticle(
                position,
                Vec2.add(normal, Random.vector(-0.3, 0.3, -0.3, 0.3)),
                "wall_chip",
                {
                    tint
                }
            );
        } else if (entity?.__type === EntityType.Player) {
            for (let i = 0; i < 20; i++) {
                this.game.particleManager.addParticle(
                    position,
                    Vec2.add(normal, Random.vector(-0.4, 0.34, -0.4, 0.4)),
                    "blood"
                );
            }
        }
    }
}
