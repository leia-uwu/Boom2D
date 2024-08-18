import { MapObjectType } from "../../../common/src/baseMap";
import { EntityType } from "../../../common/src/constants";
import {
    type ProjectileDef,
    type ProjectileDefKey,
    ProjectileDefs
} from "../../../common/src/defs/projectileDefs";
import type { EntitiesNetData } from "../../../common/src/packets/updatePacket";
import { CircleHitbox } from "../../../common/src/utils/hitbox";
import { MathUtils } from "../../../common/src/utils/math";
import { Random } from "../../../common/src/utils/random";
import { Vec2, type Vector } from "../../../common/src/utils/vector";
import type { Game } from "../game";
import { ServerEntity } from "./entity";
import type { Player } from "./player";

export class ProjectileManager {
    constructor(readonly game: Game) {}

    addProjectile(
        type: ProjectileDefKey,
        position: Vector,
        direction: Vector,
        source: Player
    ) {
        const projectile = new Projectile(this.game, type, position, direction, source);
        this.game.entityManager.register(projectile);
        return projectile;
    }
}

export class Projectile extends ServerEntity {
    readonly __type = EntityType.Projectile;
    hitbox: CircleHitbox;

    type: ProjectileDefKey;
    direction: Vector;
    source: Player;

    dead = false;

    isNew = true;

    get position(): Vector {
        return this.hitbox.position;
    }

    set position(pos: Vector) {
        this.hitbox.position = pos;
        this._position = pos;
    }

    tracerTicker = 0;
    damagedEntities = new Set<ServerEntity>();

    constructor(
        game: Game,
        type: ProjectileDefKey,
        position: Vector,
        direction: Vector,
        source: Player
    ) {
        super(game, position);
        this.type = type;
        this.direction = direction;
        const def = ProjectileDefs.typeToDef(type);
        this.hitbox = new CircleHitbox(def.radius, position);
        this.source = source;
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
                    entity.__type === EntityType.Player ||
                    entity.__type === EntityType.Obstacle
                )
            )
                continue;
            if (entity === this.source) continue;

            const intersection = entity.hitbox.getIntersection(this.hitbox);

            if (intersection) {
                if (entity.__type === EntityType.Player) {
                    (entity as Player).damage(
                        Random.int(def.damage.min, def.damage.max),
                        this.source
                    );
                }
                this.dead = true;

                this.position = Vec2.sub(
                    this.position,
                    Vec2.mul(this.direction, intersection.pen)
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
                        Vec2.mul(this.direction, intersection.pen)
                    );
                    break;
                }
            }
        }

        if (def.tracers && !this.dead) {
            this.tracerTicker += dt;

            if (this.tracerTicker > def.tracers.rate) {
                this.tracerTicker = 0;

                const hitbox = new CircleHitbox(def.tracers.radius, this.position);
                const entities = this.game.grid.intersectsHitbox(hitbox);

                for (const entity of entities) {
                    if (!entity.hitbox.collidesWith(hitbox)) continue;
                    if (entity.__type !== EntityType.Player) continue;
                    if (entity === this.source) continue;
                    if (this.damagedEntities.has(entity)) continue;

                    this.damagedEntities.add(entity);

                    const angle = MathUtils.angleBetweenPoints(
                        entity.position,
                        this.position
                    );
                    const direction = Vec2.new(Math.cos(angle), Math.sin(angle));
                    this.game.bulletManager.fireBullet(this.source, {
                        initialPosition: this.position,
                        direction,
                        type: def.tracers.type,
                        shooterId: this.source.id
                    });
                }
            }
        }

        if (
            this.position.x <= 0 ||
            this.position.x >= this.game.map.width ||
            this.position.y <= 0 ||
            this.position.y >= this.game.map.height
        ) {
            this.dead = true;
        }
        this.position.x = MathUtils.clamp(this.position.x, 0, this.game.map.width);
        this.position.y = MathUtils.clamp(this.position.y, 0, this.game.map.height);
    }

    destroy() {
        super.destroy();
        const def = ProjectileDefs.typeToDef(this.type) as ProjectileDef;
        if (def.explosion) {
            this.game.explosionManager.addExplosion(
                def.explosion,
                this.position,
                this.source
            );
        }
    }

    get data(): Required<EntitiesNetData[EntityType.Projectile]> {
        return {
            position: this.position,
            full: {
                type: this.type,
                direction: this.direction
            }
        };
    }
}
