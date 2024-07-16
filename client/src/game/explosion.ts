import { Sprite } from "pixi.js";
import {
    type ExplosionDef,
    type ExplosionDefKey,
    ExplosionDefs
} from "../../../common/src/defs/explosionDefs";
import { MathUtils } from "../../../common/src/utils/math";
import { Random } from "../../../common/src/utils/random";
import type { Vector } from "../../../common/src/utils/vector";
import { Helpers } from "../helpers";
import { Camera } from "./camera";
import type { Game } from "./game";

export class ExplosionManager {
    explosions: Explosion[] = [];

    constructor(readonly game: Game) {}

    addExplosion(type: ExplosionDefKey, position: Vector) {
        const explosion = new Explosion(type, position);
        this.explosions.push(explosion);
        this.game.camera.addObject(explosion.sprite);

        // spawn particles
        const def = ExplosionDefs.typeToDef(type) as ExplosionDef;
        if (def.particles) {
            for (let i = 0; i < def.particles.amount; i++) {
                this.game.particleManager.addParticle(
                    position,
                    Random.vector(-1, 1, -1, 1),
                    def.particles.type
                );
            }
        }

        if (def.sound) {
            this.game.audioManager.play(def.sound, {
                position,
                falloff: 0.3
            });
        }
    }

    render(dt: number) {
        for (let i = 0; i < this.explosions.length; i++) {
            const explosion = this.explosions[i];
            explosion.render(dt);
            if (explosion.dead) {
                this.explosions.splice(i, 1);
                explosion.destroy();
            }
        }
    }
}

class Explosion {
    sprite = new Sprite();
    dead = false;
    ticks = 0;
    targetScale: number;

    constructor(
        readonly type: ExplosionDefKey,
        readonly position: Vector
    ) {
        const def = ExplosionDefs.typeToDef(this.type);
        Helpers.spriteFromDef(this.sprite, def.img);
        this.targetScale = Camera.unitToScreen(def.radius * def.img.animScale);

        this.sprite.scale.set(0);
        this.sprite.anchor.set(0.5);
        this.sprite.position = Camera.vecToScreen(this.position);
    }

    render(dt: number) {
        this.ticks += dt;

        const def = ExplosionDefs.typeToDef(this.type);
        const t = MathUtils.remap(this.ticks, 0, def.img.animDuration, 0, 1);
        const scale = MathUtils.lerp(0, this.targetScale, t);
        this.sprite.width = this.sprite.height = scale;
        this.sprite.alpha = Math.abs(t - 1);

        if (this.ticks > def.img.animDuration) {
            this.dead = true;
        }
    }

    destroy() {
        this.sprite.destroy();
    }
}
