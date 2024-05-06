import { Color, Sprite } from "pixi.js";
import { ExplosionDef, ExplosionDefKey, ExplosionDefs } from "../../../common/src/defs/explosionDefs";
import { Vector } from "../../../common/src/utils/vector";
import { Game } from "./game";
import { spriteFromDef } from "../utils";
import { EasinFunctions, MathUtils } from "../../../common/src/utils/math";
import { Camera } from "./camera";
import { Random } from "../../../common/src/utils/random";

export class ExplosionManager {
    explosions: Explosion[] = [];

    constructor(readonly game: Game) { }

    addExplosion(type: ExplosionDefKey, position: Vector) {
        const explosion = new Explosion(type, position);
        this.explosions.push(explosion);
        this.game.camera.addObject(explosion.sprite);

        // spawn particles
        const def = ExplosionDefs.typeToDef(type) as ExplosionDef;
        if (def.particles) {
            const p = def.particles;
            this.game.particleManager.spawnParticles(p.amount, () => {
                return {
                    position: explosion.position,
                    lifeTime: { min: 0.5, max: 1.5 },
                    blendMode: "add",
                    tint: new Color(`hsl(${Random.int(p.hue.min, p.hue.max)}, 100%, 50%)`),
                    sprite: "glow-particle.svg",
                    rotation: { value: 0 },
                    alpha: { start: 1, end: 0, easing: EasinFunctions.sineIn },
                    scale: { start: 2, end: 0 },
                    speed: p.speed,
                    direction: { value: Random.float(-Math.PI, Math.PI) }
                };
            });
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

    constructor(readonly type: ExplosionDefKey, readonly position: Vector) {
        const def = ExplosionDefs.typeToDef(this.type);
        spriteFromDef(this.sprite, def.img);
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
