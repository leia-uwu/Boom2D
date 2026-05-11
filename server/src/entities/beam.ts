import { DamageType, EntityType } from "@common/constants";
import { type BeamDefKey, BeamDefs } from "@common/defs/beamDefs";
import type { EntitiesNetData } from "@common/packets/updatePacket";
import { type Hitbox, RectHitbox } from "@common/utils/hitbox";
import { Random } from "@common/utils/random";
import { assert } from "@common/utils/util";
import { Vec2, type Vector } from "@common/utils/vector";
import type { Game } from "../game";
import { AbstractServerEntity, EntityPool } from "./entity";

export class BeamManager extends EntityPool<Beam> {
    override readonly type = EntityType.Beam;
    constructor(game: Game) {
        super(game, Beam);
    }
}

export class Beam extends AbstractServerEntity {
    override readonly __type = EntityType.Beam;

    type!: BeamDefKey;
    override hitbox!: Hitbox;

    sourcePos = Vec2.new(0, 0);
    targetPos = Vec2.new(0, 0);

    trackingEntities = false;
    sourceTargetId = 0;
    targetEntityid = 0;

    maxLength!: number;

    damage?: {
        rate: number;
        min: number;
        max: number;
        ticker: number;
    };

    init(sourcePos: Vector, targetPos: Vector, type: BeamDefKey) {
        this.updatePositions(sourcePos, targetPos);

        this.type = type;
        const def = BeamDefs.typeToDef(type);
        this.maxLength = def.maxLength;

        if (def.damage) {
            this.damage = {
                rate: def.damage.rate,
                min: def.damage.amount.min,
                max: def.damage.amount.max,
                ticker: 0,
            };
        } else {
            this.damage = undefined;
        }
    }

    updatePositions(sourcePos: Vector, targetPos: Vector) {
        if (Vec2.equals(this.sourcePos, sourcePos) && Vec2.equals(this.targetPos, targetPos)) {
            return;
        }

        this.sourcePos = sourcePos;
        this.targetPos = targetPos;

        this._position = Vec2.midpoint(sourcePos, targetPos);

        this.hitbox = RectHitbox.fromLine(sourcePos, targetPos);

        this.game.grid.updateEntity(this);
        this.setDirty();
    }

    trackEntities(sourceId: number, targetId: number) {
        assert(this.game.entityManager.getById(sourceId));
        assert(this.game.entityManager.getById(targetId));

        this.sourceTargetId = sourceId;
        this.targetEntityid = targetId;
        this.trackingEntities = true;
    }

    update(dt: number) {
        if (!this.trackingEntities) return;
        const sourceEntity = this.game.entityManager.getById(this.sourceTargetId);
        const targetEntity = this.game.entityManager.getById(this.targetEntityid);

        // just remove ourselves if any of the 2 entities dont exist anymore
        if (!sourceEntity || !targetEntity) {
            this.destroy();
            return;
        }
        if (targetEntity.__type === EntityType.Player && targetEntity.dead) {
            this.destroy();
            return;
        }
        const dist = Vec2.distance(sourceEntity.position, targetEntity.position);
        if (dist > (this.maxLength + 1)) {
            this.destroy();
            return;
        }

        this.updatePositions(sourceEntity.position, targetEntity.position);

        let damageSource = sourceEntity;
        if (sourceEntity.__type === EntityType.Projectile && sourceEntity.source) {
            damageSource = sourceEntity.source;
        }

        if (this.damage && targetEntity.__type === EntityType.Player) {
            this.damage.ticker += dt;
            if (this.damage.ticker > this.damage.rate) {
                this.damage.ticker = 0;

                targetEntity.damage({
                    type: DamageType.Player,
                    amount: Random.int(this.damage.min, this.damage.max),
                    position: this.targetPos,
                    direction: Vec2.normalize(Vec2.sub(this.targetPos, this.sourcePos)),
                    sourceEntity: damageSource,
                });
            }
        }
    }

    get data(): Required<EntitiesNetData[EntityType.Beam]> {
        return {
            sourcePos: this.sourcePos,
            targetPos: this.targetPos,
            full: {
                type: this.type,
            },
        };
    }
}
