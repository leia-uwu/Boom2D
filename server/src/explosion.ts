import { EntityType } from "../../common/src/constants";
import { type ExplosionDefKey, ExplosionDefs } from "../../common/src/defs/explosionDefs";
import { CollisionHelpers } from "../../common/src/utils/collisionHelpers";
import { CircleHitbox } from "../../common/src/utils/hitbox";
import { MathUtils } from "../../common/src/utils/math";
import { Vec2, type Vector } from "../../common/src/utils/vector";
import type { Player } from "./entities/player";
import type { Game } from "./game";

export class ExplosionManager {
    explosions: Explosion[] = [];

    constructor(readonly game: Game) {}

    addExplosion(type: ExplosionDefKey, position: Vector, source: Player) {
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
        readonly source: Player,
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
                (entity as Player).damage(damage, this.source);
            }
        }
    }
}
