import { MapObjectType } from "@common/baseMap";
import { DamageType, EntityType } from "@common/constants";
import {
    type ProjectileDef,
    type ProjectileDefKey,
    ProjectileDefs,
} from "@common/defs/projectileDefs";
import type { EntitiesNetData } from "@common/packets/updatePacket";
import { CircleHitbox } from "@common/utils/hitbox";
import { MathUtils } from "@common/utils/math";
import { Random } from "@common/utils/random";
import { Vec2, type Vector } from "@common/utils/vector";
import type { Game } from "../game";
import type { Beam } from "./beam";
import { AbstractServerEntity, EntityHandle, EntityPool, type ServerEntity } from "./entity";
import type { Player } from "./player";

export class ProjectileManager extends EntityPool<Projectile> {
    override readonly type = EntityType.Projectile;

    constructor(game: Game) {
        super(game, Projectile);
    }
}

export class Projectile extends AbstractServerEntity<EntityType.Projectile> {
    readonly __type = EntityType.Projectile;
    hitbox!: CircleHitbox;

    type!: ProjectileDefKey;
    direction!: Vector;
    source!: EntityHandle<Player>;

    dead = false;

    isNew = true;

    override get position(): Vector {
        return this.hitbox.position;
    }

    override set position(pos: Vector) {
        this.hitbox.position = pos;
        this._position = pos;
    }

    tracerTicker = 0;

    activeBeams!: Set<EntityHandle<Beam>>;

    init(
        position: Vector,
        type: ProjectileDefKey,
        direction: Vector,
        source: EntityHandle<Player>,
    ) {
        const def = ProjectileDefs.typeToDef(type);
        this.hitbox = new CircleHitbox(def.radius, position);
        this.type = type;
        this.direction = direction;
        this.source = source;

        this.isNew = true;
        this.dead = false;

        this.activeBeams = new Set();
        this.tracerTicker = 0;
    }

    update(dt: number): void {
        // HACK: don't update in the first tick to send the correct initial position to clients
        if (this.isNew) {
            this.isNew = false;
            return;
        }
        if (this.dead) {
            this.destroy();
            return;
        }

        const def = ProjectileDefs.typeToDef(this.type) as ProjectileDef;

        const speed = Vec2.mul(this.direction, def.speed);
        this.position = Vec2.add(this.position, Vec2.mul(speed, dt));
        this.game.grid.updateEntity(this);
        this.setDirty();

        const entities = this.game.grid.intersectsHitbox(this.hitbox);
        for (const entity of entities) {
            if (
                !(
                    entity.__type === EntityType.Player
                    || entity.__type === EntityType.Obstacle
                )
            ) {
                continue;
            }
            if (entity.getHandle() === this.source) continue;
            if (entity.__type === EntityType.Player && entity.dead) continue;

            const intersection = entity.hitbox.getIntersection(this.hitbox);

            if (intersection) {
                if (entity.__type === EntityType.Player) {
                    entity.damage({
                        type: DamageType.Player,
                        amount: Random.int(def.damage.min, def.damage.max),
                        position: Vec2.add(
                            entity.position,
                            Vec2.mul(intersection.normal, entity.hitbox.radius),
                        ),
                        direction: intersection.normal,
                        sourceEntity: this.source,
                    });
                }
                this.dead = true;

                this.position = Vec2.sub(
                    this.position,
                    Vec2.mul(this.direction, intersection.pen),
                );
                break;
            }
        }

        if (!this.dead) {
            const walls = this.game.map.intersectsHitbox(this.hitbox);
            for (const wall of walls) {
                if (wall.type !== MapObjectType.Wall) continue;

                const intersection = wall.hitbox.getIntersection(this.hitbox);

                if (intersection) {
                    this.dead = true;
                    this.position = Vec2.sub(
                        this.position,
                        Vec2.mul(this.direction, intersection.pen),
                    );
                    break;
                }
            }
        }

        if (def.beams && !this.dead) {
            this.tracerTicker += dt;

            if (this.tracerTicker > def.beams.rate) {
                const activeTargets = new Set<EntityHandle<ServerEntity>>();
                for (const beamHandler of this.activeBeams) {
                    const beam = beamHandler.get();
                    if (
                        !beam || beam.__type !== EntityType.Beam
                        || beam.sourceTarget?.id !== this.id
                        || !beam.targetEntity?.get()
                    ) {
                        this.activeBeams.delete(beamHandler);
                        continue;
                    }
                    activeTargets.add(beam.targetEntity);
                }

                this.tracerTicker = 0;

                const hitbox = new CircleHitbox(def.beams.distance, this.position);
                const entities = this.game.grid.intersectsHitbox(hitbox);

                for (const entity of entities) {
                    if (!entity.hitbox.collidesWith(hitbox)) continue;
                    if (entity.__type !== EntityType.Player) continue;
                    if (entity.getHandle() === this.source) continue;
                    if (entity.dead) continue;
                    if (activeTargets.has(entity.getHandle())) continue;

                    const beam = this.game.beamManager.allocEntity(
                        this.position,
                        entity.position,
                        def.beams.type,
                    );
                    beam.trackEntities(this.getHandle(), entity.getHandle());
                    this.activeBeams.add(beam.getHandle());
                }
            }
        }

        if (
            this.position.x <= 0
            || this.position.x >= this.game.map.width
            || this.position.y <= 0
            || this.position.y >= this.game.map.height
        ) {
            this.dead = true;
        }
        this.position.x = MathUtils.clamp(this.position.x, 0, this.game.map.width);
        this.position.y = MathUtils.clamp(this.position.y, 0, this.game.map.height);
    }

    override destroy() {
        super.destroy();
        const def = ProjectileDefs.typeToDef(this.type) as ProjectileDef;
        if (def.explosion) {
            this.game.explosionManager.addExplosion(
                def.explosion,
                this.position,
                this.source,
            );
        }
    }

    get data(): Required<EntitiesNetData[EntityType.Projectile]> {
        return {
            position: this.position,
            full: {
                type: this.type,
                direction: this.direction,
            },
        };
    }
}
