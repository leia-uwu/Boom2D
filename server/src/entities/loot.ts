import { EntityType } from "../../../common/src/constants";
import { type LootDefKey, LootDefs } from "../../../common/src/defs/lootDefs";
import type { EntitiesNetData } from "../../../common/src/packets/updatePacket";
import { CircleHitbox } from "../../../common/src/utils/hitbox";
import type { Vector } from "../../../common/src/utils/vector";
import type { Game } from "../game";
import { ServerEntity } from "./entity";

export class LootManager {
    constructor(readonly game: Game) {}

    addLoot(type: LootDefKey, position: Vector) {
        const loot = new Loot(this.game, type, position);
        this.game.entityManager.register(loot);
        return loot;
    }
}

export class Loot extends ServerEntity {
    override readonly __type = EntityType.Loot;

    type: LootDefKey;
    override hitbox: CircleHitbox;
    canPickup = true;

    respawnTicker = 0;

    constructor(game: Game, type: LootDefKey, position: Vector) {
        super(game, position);
        this.type = type;
        const def = LootDefs.typeToDef(type);
        this.hitbox = new CircleHitbox(def.lootRadius);
        this.hitbox.position = this.position;
    }

    tick(dt: number) {
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
