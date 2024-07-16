import { BaseGameMap } from "../../common/src/baseMap";
import { type LootDefKey, LootDefs } from "../../common/src/defs/lootDefs";
import { type MapDefKey, MapDefs } from "../../common/src/defs/mapDefs";
import { PacketStream } from "../../common/src/net";
import { MapPacket } from "../../common/src/packets/mapPacke";
import { Random } from "../../common/src/utils/random";
import { Loot } from "./entities/loot";
import { Obstacle } from "./entities/obstacle";
import type { Game } from "./game";

export class GameMap extends BaseGameMap {
    serializedData = new PacketStream(new ArrayBuffer(1 << 14));

    constructor(
        readonly game: Game,
        readonly name: MapDefKey
    ) {
        super();
        const def = MapDefs.typeToDef(name);

        this.init(def.width, def.height, def.walls);

        const packet = new MapPacket();
        packet.width = this.width;
        packet.height = this.height;
        packet.walls = this.walls;

        const keys = Object.keys(LootDefs.definitions);
        for (let i = 0; i < 100; i++) {
            const lootType = keys[Random.int(0, keys.length - 1)] as LootDefKey;
            const position = Random.vector(0, this.width, 0, this.height);
            const loot = new Loot(this.game, position, lootType);
            this.game.entityManager.register(loot);
        }

        for (let i = 0; i < 100; i++) {
            const position = Random.vector(0, this.width, 0, this.height);
            const obstacle = new Obstacle(this.game, position, "barrel");
            this.game.entityManager.register(obstacle);
        }

        this.serializedData.serializeServerPacket(packet);
    }
}
