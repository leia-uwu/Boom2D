import type { HitData } from "@common/packets/updatePacket";
import { Random } from "@common/utils/random";
import { Vec2, type Vector } from "@common/utils/vector";
import * as PIXI from "pixi.js";
import { Camera } from "./camera";

const hitBreakPoints = [
    {
        damage: 0,
        color: "white",
        fontSize: 40,
    },
    {
        damage: 50,
        color: "yellow",
        fontSize: 44,
    },
    {
        damage: 100,
        color: "red",
        fontSize: 52,
    },
];

export class hitParticleManager {
    particles: HitParticle[] = [];
    activeCount = 0;

    addHit(hit: HitData, camera: Camera) {
        let p = this.particles.find(p => !p.active);
        if (!p) {
            p = new HitParticle();
            this.particles.push(p);
        }
        p.init(hit);
        camera.addObject(p.text);
    }

    update(dt: number) {
        this.activeCount = 0;

        for (let i = 0; i < this.particles.length; i++) {
            if (this.particles[i].active) {
                this.particles[i].update(dt);
                this.activeCount++;
            }
        }

        // free some particles if pool is too big
        if (this.particles.length > 64 && this.activeCount < this.particles.length / 2) {
            const compact = [];
            for (let i = 0; i < this.particles.length; i++) {
                const part = this.particles[i];
                if (part.active) {
                    compact.push(part);
                } else {
                    part.free();
                    part.destroy();
                }
            }
            this.particles = compact;
        }
    }
}

export class HitParticle {
    text = new PIXI.Text();
    active = false;

    hit!: HitData;

    position!: Vector;
    speed!: Vector;
    drag!: number;
    ticker!: number;
    rotationDir!: number;

    init(hit: HitData) {
        this.hit = hit;

        this.text.visible = true;
        this.active = true;

        this.ticker = 0;

        let breakPoint = hitBreakPoints[0];
        for (let i = 1; i < hitBreakPoints.length; i++) {
            if (hit.amount >= hitBreakPoints[i].damage) {
                breakPoint = hitBreakPoints[i];
            }
        }

        this.text.zIndex = 50;
        this.text.text = hit.amount;
        this.text.anchor.y = 0.5;
        this.text.alpha = 1;
        this.text.scale = 1;
        this.text.rotation = 0;
        this.text.style = {
            align: "center",
            fill: breakPoint.color,
            fontFamily: "Roboto Mono Semi Bold",
            fontSize: breakPoint.fontSize,
            stroke: {
                color: 0,
                width: 8,
            },
        };

        this.position = Vec2.clone(hit.position);

        // add some randomization to the direction
        // so damages coming from a straight line all hitting on the same position
        // (eg plasma projectiles)
        // are more random and readable instead of clumping together on the same position
        const randDir = Vec2.normalize(
            Vec2.add(hit.direction, Random.vector(-0.4, 0.4, -0.4, 0.4)),
        );

        this.speed = Vec2.mul(randDir, 4);
        this.drag = Random.float(2.5, 3.5);
        this.rotationDir = Random.boolean() ? Random.float(-1.2, -1) : Random.float(1, 1.2);
    }

    update(dt: number) {
        this.ticker += dt;

        this.position = Vec2.add(this.position, Vec2.mul(this.speed, dt));
        this.speed = Vec2.mul(this.speed, 1 / (1 + dt * this.drag));

        this.text.position = Camera.vecToScreen(this.position);

        if (this.ticker > 1) {
            this.text.alpha -= dt * 2;
        }

        this.text.scale = this.text.scale.x + (dt / 8);
        this.text.rotation += (dt / 6) * this.rotationDir;

        if (this.ticker >= 1.5) {
            this.free();
        }
    }

    free() {
        this.active = false;
        this.text.visible = false;
    }

    destroy() {
        this.text.destroy(true);
    }
}
