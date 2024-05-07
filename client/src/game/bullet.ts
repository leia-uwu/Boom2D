import { Sprite } from "pixi.js";
import { BaseBullet, BulletParams } from "../../../common/src/baseBullet";
import { Game } from "./game";
import { Camera } from "./camera";
import { Vec2 } from "../../../common/src/utils/vector";
import { BulletDefs } from "../../../common/src/defs/bulletDefs";
import { MathUtils } from "../../../common/src/utils/math";

export class BulletManager {
    readonly bullets: ClientBullet[] = [];

    constructor(readonly game: Game) { }

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

    constructor(readonly game: Game, params: BulletParams) {
        super(params);

        this.trailSprite.anchor.set(1, 0.5);
        this.trailSprite.rotation = Math.atan2(this.direction.y, this.direction.x);
        this.trailSprite.position = Camera.vecToScreen(this.position);
        game.camera.addObject(this.trailSprite);
    }

    override tick(dt: number) {
        if (!this.dead) {
            super.tick(dt);
            const collisions = this.checkCollisions(this.game.entities);

            for (const collision of collisions) {
                this.dead = true;
                this.position = collision.position;

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

    destroy() {
        this.trailSprite.destroy();
    }
}
