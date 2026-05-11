import { DamageType, EntityType } from "@common/constants";
import { type ExplosionDefKey, ExplosionDefs } from "@common/defs/explosionDefs";
import { CollisionHelpers } from "@common/utils/collisionHelpers";
import { CircleHitbox } from "@common/utils/hitbox";
import { MathUtils } from "@common/utils/math";
import { Vec2, type Vector } from "@common/utils/vector";
import type { EntityHandle } from "./entities/entity";
import type { Player } from "./entities/player";
import type { Game } from "./game";

export class ExplosionManager {
    explosions: Explosion[] = [];

    constructor(readonly game: Game) {}

    addExplosion(type: ExplosionDefKey, position: Vector, source: EntityHandle<Player>) {
        const explosion = new Explosion(type, position, source);
        this.explosions.push(explosion);
    }

    update() {
        for (let i = 0; i < this.explosions.length; i++) {
            this.explosions[i].explode(this.game);
        }
    }

    flush() {
        this.explosions.length = 0;
    }
}

class Explosion {
    hitbox: CircleHitbox;
    constructor(
        readonly type: ExplosionDefKey,
        readonly position: Vector,
        readonly source: EntityHandle<Player>,
    ) {
        const def = ExplosionDefs.typeToDef(this.type);
        this.hitbox = new CircleHitbox(def.radius, position);
    }

    explode(game: Game) {
        const def = ExplosionDefs.typeToDef(this.type);

        const entities = game.grid.intersectsHitbox(this.hitbox);

        for (const entity of entities) {
            if (entity.__type !== EntityType.Player) continue;
            if ((entity as Player).dead) continue;
            if (!entity.hitbox.collidesWith(this.hitbox)) continue;

            const intersection = CollisionHelpers.lineOfSightCheck(
                entities,
                game.map,
                this.position,
                entity.position,
                [EntityType.Obstacle],
            );

            if (!intersection.entity && !intersection.wall) {
                const dist = Vec2.distance(this.position, entity.position);
                const damage = MathUtils.remap(dist, 0, def.radius, def.damage, 0);

                const direction = Vec2.normalize(Vec2.sub(this.position, entity.position));
                const position = Vec2.add(
                    entity.position,
                    Vec2.mul(direction, entity.hitbox.radius),
                );

                entity.damage({
                    amount: damage,
                    sourceEntity: this.source,
                    type: DamageType.Player,
                    position: position,
                    direction: direction,
                });
            }
        }
    }
}
