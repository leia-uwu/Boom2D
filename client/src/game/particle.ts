import {
    type BLEND_MODES,
    Color,
    type ColorSource,
    Sprite,
    Texture,
    type TextureSourceLike,
} from "pixi.js";
import { EasinFunctions, MathUtils } from "../../../common/src/utils/math";
import { Random } from "../../../common/src/utils/random";
import { Vec2, type Vector } from "../../../common/src/utils/vector";
import { Camera } from "./camera";
import type { Game } from "./game";

export class ParticleManager {
    particles: Particle[] = [];
    activeCount = 0;

    constructor(public game: Game) {
        // pre-allocate some particles
        for (let i = 0; i < 100; i++) {
            const part = new Particle();
            this.game.camera.addObject(part.sprite);
            this.particles.push(part);
        }
    }

    addParticle(
        position: Vector,
        rotation: Vector,
        type: keyof typeof ParticleDefs,
        overrides: Partial<ParticleDef> = {},
    ) {
        const def = {
            ...ParticleDefs[type],
            ...overrides,
        };

        let particle: Particle | undefined = undefined;
        for (let i = 0; i < this.particles.length; i++) {
            const part = this.particles[i];
            if (!part.active) {
                particle = part;
                break;
            }
        }

        if (!particle) {
            particle = new Particle();
            this.particles.push(particle);
            this.game.camera.addObject(particle.sprite);
        }
        particle.init(position, rotation, def);
        return particle;
    }

    update(dt: number) {
        this.activeCount = 0;
        for (let i = 0; i < this.particles.length; i++) {
            const part = this.particles[i];
            part.sprite.visible = part.active;
            if (part.active) {
                this.activeCount++;
                part.update(dt);
            }
        }

        // free some particles if pool is too big
        if (this.particles.length > 512 && this.activeCount < this.particles.length / 2) {
            const compact = [];
            for (let i = 0; i < this.particles.length; i++) {
                const part = this.particles[i];
                if (part.active) {
                    compact.push(part);
                } else {
                    part.sprite.destroy();
                }
            }
            this.particles = compact;
        }
    }

    clear() {
        for (let i = 0; i < this.particles.length; i++) {
            this.particles[i].active = false;
        }
    }
}

interface MinMax {
    min: number;
    max: number;
}

type ParticleOption =
    & (
        | MinMax
        | {
            start: number;
            end: number;
        }
        | {
            value: number;
        }
    )
    & {
        /**
         * Easing function
         * Defaults to linear lerp
         */
        easing?: (t: number) => number;
    };

interface ParticleDef {
    /** Particle frame id */
    sprite: TextureSourceLike[];
    /** Particle sprite zIndex */
    zIndex?: number;
    /** Particle sprite blend mode */
    blendMode?: BLEND_MODES;
    /** Particle Sprite tint */
    tint?: ColorSource;
    /** Particle life time in seconds */
    lifeTime: MinMax | number;
    /** Particle rotation */
    rotation: ParticleOption;
    /** Particle speed */
    speed: ParticleOption;
    /** Particle scale */
    scale: ParticleOption;
    /** Particle alpha */
    alpha: ParticleOption;
}

function getMinMax(option: ParticleOption) {
    let start: number;
    let end: number;
    if ("min" in option) {
        start = end = Random.float(option.min, option.max);
    } else if ("start" in option && "end" in option) {
        start = option.start;
        end = option.end;
    } else {
        start = option.value;
        end = option.value;
    }
    return {
        start,
        end,
        easing: option.easing ?? EasinFunctions.linear,
        value: start,
    };
}

type ParticleInterpData = Omit<ParticleDef, "sprite" | "lifeTime">;

class Particle {
    active = false;
    tick = 0;
    end = 0;
    position = Vec2.new(0, 0);
    direction = Vec2.new(0, 0);

    sprite = new Sprite();

    data!: {
        [K in keyof ParticleInterpData]: {
            start: number;
            end: number;
            value: number;
            easing: (t: number) => number;
        };
    };

    init(position: Vector, direction: Vector, def: ParticleDef) {
        this.active = true;
        this.tick = 0;
        this.position = position;
        this.direction = direction;
        this.sprite.texture = Texture.from(Random.itemInArray(def.sprite));
        this.sprite.anchor.set(0.5);

        this.sprite.zIndex = def.zIndex ?? 0;

        this.sprite.blendMode = def.blendMode ?? "normal";

        this.sprite.tint = def.tint ?? 0xffffff;

        if (typeof def.lifeTime === "number") {
            this.end = def.lifeTime;
        } else {
            this.end = Random.float(def.lifeTime.min, def.lifeTime.max);
        }

        this.data = {
            rotation: getMinMax(def.rotation),
            speed: getMinMax(def.speed),
            scale: getMinMax(def.scale),
            alpha: getMinMax(def.alpha),
        };
    }

    update(dt: number) {
        this.tick += dt;
        if (this.tick > this.end) {
            this.active = false;
            this.sprite.visible = false;
            return;
        }

        const t = this.tick / this.end;

        for (const key in this.data) {
            const data = this.data[key as keyof ParticleInterpData];
            data!.value = MathUtils.lerp(data!.start, data!.end, data!.easing(t));
        }

        this.sprite.rotation = this.data.rotation.value;
        this.sprite.scale = this.data.scale.value;
        this.sprite.alpha = this.data.alpha.value;

        this.position = Vec2.add(
            this.position,
            Vec2.mul(this.direction, this.data.speed.value * dt),
        );
        this.sprite.position = Camera.vecToScreen(this.position);
    }
}

const ParticleDefs = {
    rocket_trail: {
        lifeTime: { min: 0.5, max: 1 },
        blendMode: "add",
        zIndex: -1,
        get tint() {
            return new Color(`hsl(${Random.int(0, 25)}, 100%, 50%)`);
        },
        sprite: ["glow-particle.svg"],
        rotation: { value: 0 },
        alpha: { start: 1, end: 0, easing: EasinFunctions.sineIn },
        scale: { start: 2, end: 0 },
        speed: { min: 2, max: 5 },
    },
    rocket_explosion: {
        lifeTime: { min: 0.5, max: 1 },
        blendMode: "add",
        zIndex: -1,
        get tint() {
            return new Color(`hsl(${Random.int(0, 25)}, 100%, 50%)`);
        },
        sprite: ["glow-particle.svg"],
        rotation: { value: 0 },
        alpha: { start: 1, end: 0, easing: EasinFunctions.sineIn },
        scale: { start: 6, end: 0 },
        speed: { min: 5, max: 10 },
    },
    plasma_explosion: {
        lifeTime: { min: 0.5, max: 1 },
        blendMode: "add",
        zIndex: -1,
        get tint() {
            return new Color(`hsl(${Random.int(160, 200)}, 100%, 50%)`);
        },
        sprite: ["glow-particle.svg"],
        rotation: { value: 0 },
        alpha: { start: 1, end: 0, easing: EasinFunctions.sineIn },
        scale: { start: 2, end: 0 },
        speed: { min: 2, max: 5 },
    },
    bfg_trail: {
        lifeTime: { min: 0.5, max: 1 },
        blendMode: "add",
        zIndex: -1,
        get tint() {
            return new Color(`hsl(${Random.int(90, 140)}, 100%, 50%)`);
        },
        sprite: ["glow-particle.svg"],
        rotation: { value: 0 },
        alpha: { start: 1, end: 0, easing: EasinFunctions.sineIn },
        scale: { start: 2, end: 0 },
        speed: { min: 2, max: 5 },
    },
    bfg_explosion: {
        lifeTime: { min: 1, max: 1.5 },
        blendMode: "add",
        zIndex: -1,
        get tint() {
            return new Color(`hsl(${Random.int(90, 140)}, 100%, 50%)`);
        },
        sprite: ["glow-particle.svg"],
        rotation: { value: 0 },
        alpha: { start: 1, end: 0, easing: EasinFunctions.sineIn },
        scale: { start: 4, end: 0 },
        speed: { min: 2, max: 5 },
    },
    wall_chip: {
        lifeTime: { min: 0.5, max: 0.8 },
        blendMode: "normal",
        zIndex: 1,
        tint: 0xffffff,
        sprite: ["chip-particle.svg"],
        rotation: { start: 0, end: 5 },
        alpha: { start: 1, end: 0, easing: EasinFunctions.sineIn },
        scale: {
            get start() {
                return Random.float(1, 1.8);
            },
            end: 0.5,
        },
        speed: { min: 3, max: 4 },
    },
    blood: {
        lifeTime: { min: 0.5, max: 0.8 },
        zIndex: 1,
        get tint() {
            return new Color(`hsl(0, 100%, ${Random.int(30, 50)}%)`);
        },
        sprite: ["blood-particle-01.svg", "blood-particle-02.svg"],
        rotation: { min: 0, max: Math.PI * 2 },
        alpha: { start: 1, end: 0, easing: EasinFunctions.sineIn },
        scale: { start: 0.3, end: 1.5 },
        speed: { min: 1.5, max: 2 },
    },
    gib_blood: {
        lifeTime: { min: 0.8, max: 1.1 },
        zIndex: 1,
        get tint() {
            return new Color(`hsl(0, 100%, ${Random.int(30, 50)}%)`);
        },
        sprite: ["blood-particle-01.svg", "blood-particle-02.svg"],
        rotation: { min: 0, max: Math.PI * 2 },
        alpha: { start: 1, end: 0, easing: EasinFunctions.sineIn },
        scale: { start: 3, end: 0.1 },
        speed: { min: 5, max: 8 },
    },
    gib_bones: {
        lifeTime: { min: 0.8, max: 1.1 },
        zIndex: 1,
        sprite: ["bone-particle.svg"],
        rotation: { min: 0, max: Math.PI * 2 },
        alpha: { start: 1, end: 0, easing: EasinFunctions.sineIn },
        scale: { min: 1, max: 2 },
        speed: { min: 5, max: 8 },
    },
} satisfies Record<string, ParticleDef>;

export type ParticleDefKey = keyof typeof ParticleDefs;
