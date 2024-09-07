import { EntityType } from "../../../common/src/constants";
import { type LootDefKey, LootDefs } from "../../../common/src/defs/lootDefs";
import type { EntitiesNetData } from "../../../common/src/packets/updatePacket";
import { CircleHitbox } from "../../../common/src/utils/hitbox";
import type { Vector } from "../../../common/src/utils/vector";
import type { Game } from "../game";
import { AbstractServerEntity, EntityPool } from "./entity";

export class LootManager extends EntityPool<Loot> {
    override readonly type = EntityType.Loot;
    constructor(readonly game: Game) {
        super(game, Loot);
    }
}

export class Loot extends AbstractServerEntity {
    override readonly __type = EntityType.Loot;

    type!: LootDefKey;
    override hitbox!: CircleHitbox;
    canPickup = true;

    respawnTicker = 0;

    init(position: Vector, type: LootDefKey) {
        this.position = position;
        this.type = type;
        const def = LootDefs.typeToDef(type);
        this.hitbox = new CircleHitbox(def.lootRadius);
        this.hitbox.position = this.position;
    }

    update(dt: number) {
        if (this.respawnTicker <= 0 && !this.canPickup) {
            this.respawnTicker = LootDefs.typeToDef(this.type).respawnTime;
        }

        if (this.respawnTicker > 0) {
            this.respawnTicker -= dt;
        }

        if (!this.canPickup && this.respawnTicker <= 0) {
            this.canPickup = true;
            this.setDirty();
        }
    }

    get data(): Required<EntitiesNetData[EntityType.Loot]> {
        return {
            canPickup: this.canPickup,
            full: {
                position: this.position,
                type: this.type
            }
        };
    }
}
