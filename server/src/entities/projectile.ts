import { EntityType } from "../../../common/src/constants";
import { ProjectileDefKey, ProjectileDefs } from "../../../common/src/defs/projectileDefs";
import { type EntitiesNetData } from "../../../common/src/packets/updatePacket";
import { CircleHitbox } from "../../../common/src/utils/hitbox";
import { MathUtils } from "../../../common/src/utils/math";
import { Random } from "../../../common/src/utils/random";
import { Vec2, type Vector } from "../../../common/src/utils/vector";
import { type Game } from "../game";
import { ServerEntity } from "./entity";
import { Player } from "./player";

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

    constructor(game: Game, type: ProjectileDefKey, position: Vector, direction: Vector, source: Player) {
        super(game, position);
        this.type = type;
        this.direction = direction;
        const def = ProjectileDefs.typeToDef(type);
        this.hitbox = new CircleHitbox(def.radius, position);
        this.source = source;
    }

    tick(dt: number): void {
        // HACK: don't update in the first tick to send the correct initial position to clients
        if (this.isNew) {
            this.isNew = false;
            return;
        }
        if (this.dead) {
            this.destroy();
            return;
        }

        const def = ProjectileDefs.typeToDef(this.type);

        const speed = Vec2.mul(this.direction, def.speed);
        this.position = Vec2.add(this.position, Vec2.mul(speed, dt));
        this.game.grid.updateEntity(this);
        this.setDirty();

        const entities = this.game.grid.intersectsHitbox(this.hitbox);
        for (const entity of entities) {
            if (!(entity.__type === EntityType.Player || entity.__type === EntityType.Obstacle)) continue;
            if (entity === this.source) continue;

            if (entity.hitbox.collidesWith(this.hitbox)) {
                if (entity.__type === EntityType.Player) {
                    (entity as Player).damage(Random.int(def.damage.min, def.damage.max), this.source);
                }
                this.dead = true;
            }
        }

        if (this.position.x <= 0 || this.position.x >= this.game.map.width
            || this.position.y <= 0 || this.position.y >= this.game.map.height) {
            this.dead = true;
        }
        this.position.x = MathUtils.clamp(this.position.x, 0, this.game.map.width);
        this.position.y = MathUtils.clamp(this.position.y, 0, this.game.map.height);
    }

    destroy() {
        this.game.grid.remove(this);
    }

    get data(): Required<EntitiesNetData[EntityType.Projectile]> {
        return {
            position: this.position,
            full: {
                type: this.type,
                shooterId: this.source.id
            }
        };
    }
}
