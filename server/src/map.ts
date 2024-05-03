import { MapDefKey, MapDefs } from "../../common/src/defs/mapDefs";
import { PacketStream } from "../../common/src/net";
import { MapPacket } from "../../common/src/packets/mapPacke";
import { Random } from "../../common/src/utils/random";
import { Obstacle } from "./entities/obstacle";
import { Game } from "./game";

export class GameMap {
    readonly width: number;
    readonly height: number;
    serializedData = new PacketStream(new ArrayBuffer(1 << 14));

    constructor(readonly game: Game, readonly name: MapDefKey) {
        const def = MapDefs.typeToDef(name);
        this.width = def.width;
        this.height = def.height;

        for (let i = 0; i < 100; i++) {
            const obstacle = new Obstacle(this.game, Random.vector(0, this.width, 0, this.height), "barrel");
            this.game.grid.addEntity(obstacle);
        }

        const packet = new MapPacket();
        packet.width = this.width;
        packet.height = this.height;

        this.serializedData.serializeServerPacket(packet);
    }
}
