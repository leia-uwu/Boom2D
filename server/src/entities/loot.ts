import { EntityType } from "@common/constants";
import { type LootDefKey, LootDefs } from "@common/defs/lootDefs";
import type { EntitiesNetData } from "@common/packets/updatePacket";
import { CircleHitbox } from "@common/utils/hitbox";
import type { Vector } from "@common/utils/vector";
import type { Game } from "../game";
import { AbstractServerEntity, EntityPool } from "./entity";

export class LootManager extends EntityPool<Loot> {
    override readonly type = EntityType.Loot;
    constructor(game: Game) {
        super(game, Loot);
    }
}

export class Loot extends AbstractServerEntity<EntityType.Loot> {
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
                type: this.type,
            },
        };
    }
}
