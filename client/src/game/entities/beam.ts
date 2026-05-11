import { EntityType } from "@common/constants";
import { type BeamDefKey, BeamDefs } from "@common/defs/beamDefs";
import type { EntitiesNetData } from "@common/packets/updatePacket";
import { type Hitbox, RectHitbox } from "@common/utils/hitbox";
import { MathUtils } from "@common/utils/math";
import { Random } from "@common/utils/random";
import { Vec2, type Vector } from "@common/utils/vector";
import * as PIXI from "pixi.js";
import type { GameSound } from "../audioManager";
import { Camera } from "../camera";
import { DEBUG_ENABLED, debugRenderer } from "../debug";
import type { Game } from "../game";
import type { ParticleDefKey } from "../particle";
import { ClientEntity, EntityPool } from "./entity";

export class BeamManager extends EntityPool<Beam> {
    constructor() {
        super(Beam);
    }
}

export class Beam extends ClientEntity {
    readonly __type = EntityType.Beam;
    hitbox!: Hitbox;
    type = "" as BeamDefKey;

    gfx = new PIXI.Graphics();

    sound?: GameSound;

    sourcePos!: Vector;
    targetPos!: Vector;

    maxLength!: number;
    length!: number;
    lineWidth!: number;

    oldPosA!: Vector;
    oldPosB!: Vector;

    // x is normalized between 0 and 1
    // and is the distance from the source position to the target position
    // y is the offset perpendicular from the line
    stops!: Array<Vector>;
    updateStopsTicker!: number;

    rayParticleTicker!: number;
    hitParticleTicker!: number;

    constructor(game: Game) {
        super(game);
        this.container.addChild(this.gfx);
    }

    override init() {
        this.container.visible = true;
        this.stops = [];

        this.rayParticleTicker = 0;
        this.hitParticleTicker = 0;
    }

    updateStops() {
        this.updateStopsTicker = Random.float(0.05, 0.2);

        this.stops.length = 0;

        const xDist = MathUtils.remap(this.length, 0, this.maxLength, 0.3, 0.05);
        // TODO: bigger Y variation the longer the line is
        // this curren logic is kinda meh
        const maxYDist = MathUtils.remap(this.length, 0, this.maxLength, 0.4, 0.8);

        for (let i = 0; i <= 1; i += Random.float(xDist, xDist * 2)) {
            this.stops.push({
                x: i,
                y: Random.float(-maxYDist, maxYDist),
            });
        }
    }

    override updateFromData(
        data: EntitiesNetData[EntityType.Beam],
        isNew: boolean,
    ): void {
        super.updateFromData(data, isNew);

        this.oldPosA = isNew ? data.sourcePos : Vec2.clone(this.sourcePos);
        this.oldPosB = isNew ? data.targetPos : Vec2.clone(this.targetPos);

        this.sourcePos = data.sourcePos;
        this.targetPos = data.targetPos;

        this.length = Vec2.distance(data.sourcePos, data.targetPos);

        this.position = Vec2.midpoint(data.sourcePos, data.targetPos);
        this.hitbox = RectHitbox.fromLine(data.sourcePos, data.targetPos);

        if (this.sound) {
            this.sound.position = Vec2.midpoint(data.sourcePos, data.targetPos);
        }

        if (data.full) {
            this.updateStops();
            this.type = data.full.type;
            const def = BeamDefs.typeToDef(this.type);
            this.maxLength = def.maxLength;
            this.lineWidth = def.lineWidth;
            this.container.zIndex = def.zIndex;

            if (def.sound) {
                this.sound?.stop();
                this.sound = this.game.audioManager.play(def.sound, {
                    position: Vec2.midpoint(data.sourcePos, data.targetPos),
                    falloff: 0.8,
                    maxRange: 48,
                    dynamic: true,
                    loop: false,
                });
            }
        }
    }

    override update(dt: number): void {
        super.update(dt);

        this.updateStopsTicker -= dt;
        if (this.updateStopsTicker < 0) {
            this.updateStops();
        }

        const sourcePos = Vec2.lerp(this.oldPosA, this.sourcePos, this.interpolationFactor);

        const targetPos = Vec2.lerp(this.oldPosB, this.targetPos, this.interpolationFactor);

        const aToB = Vec2.normalize(Vec2.sub(targetPos, sourcePos));

        const def = BeamDefs.typeToDef(this.type);

        //
        // Particles
        //
        if (def.rayParticles) {
            this.rayParticleTicker += dt;

            const particles = def.rayParticles;
            if (this.rayParticleTicker > particles.spawnDelay) {
                this.rayParticleTicker = 0;

                for (let i = 0; i < particles.amount; i++) {
                    const particlePos = Vec2.add(
                        sourcePos,
                        Vec2.mul(aToB, Random.float(0, this.length)),
                    );
                    this.game.particleManager.addParticle(
                        particlePos,
                        Random.unitVector(),
                        particles.type as ParticleDefKey,
                    );
                }
            }
        }

        if (def.hitParticles) {
            this.hitParticleTicker += dt;

            const particles = def.hitParticles;
            if (this.hitParticleTicker > particles.spawnDelay) {
                this.hitParticleTicker = 0;

                for (let i = 0; i < particles.amount; i++) {
                    this.game.particleManager.addParticle(
                        targetPos,
                        Random.unitVector(),
                        particles.type as ParticleDefKey,
                    );
                }
            }
        }

        //
        // render line
        //

        const linePositions: Vector[] = [];

        for (let i = 0; i < this.stops.length; i++) {
            const stop = this.stops[i];
            const linePos = Vec2.add(
                sourcePos,
                Vec2.mul(aToB, this.length * stop.x),
            );
            const finalPos = Vec2.add(linePos, Vec2.mul(Vec2.perp(aToB), stop.y));
            linePositions.push(finalPos);
        }
        linePositions.push(targetPos);

        this.gfx.clear();

        // render it multiple times but while increasing stroke width and decreasing opacity
        // to get a cheap "glowing" effect
        const lineCount = 3;
        for (let i = 0; i < lineCount; i++) {
            this.gfx.moveTo(sourcePos.x, sourcePos.y);

            for (let i = 0; i < linePositions.length; i++) {
                this.gfx.lineTo(linePositions[i].x, linePositions[i].y);
            }

            const t = i / (lineCount - 1);

            const alpha = MathUtils.remap(i, 0, lineCount - 1, 1, 0.1);
            const width = this.lineWidth * (1 + (t * this.lineWidth * 2));

            this.gfx.stroke({
                color: def.color,
                alpha,
                width: width / Camera.scale,
                cap: "round",
            });
        }

        this.gfx.scale = Camera.scale;

        if (DEBUG_ENABLED) {
            debugRenderer.addHitbox(this.hitbox, 0x00ff00);
            debugRenderer.addLine(this.sourcePos, this.targetPos, 0x00ff00);
        }
    }

    override free(): void {
        this.container.visible = false;
        this.sound?.fadeAndDestroy(0.3);
        this.sound = undefined;
    }

    override destroy(): void {
        this.container.destroy({
            children: true,
        });
    }
}
