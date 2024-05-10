import { BaseGameMap } from "../../common/src/baseMap";
import { MapDefKey, MapDefs } from "../../common/src/defs/mapDefs";
import { PacketStream } from "../../common/src/net";
import { MapPacket } from "../../common/src/packets/mapPacke";
import { Game } from "./game";

export class GameMap extends BaseGameMap {
    serializedData = new PacketStream(new ArrayBuffer(1 << 14));

    constructor(readonly game: Game, readonly name: MapDefKey) {
        super();
        const def = MapDefs.typeToDef(name);

        this.init(def.width, def.height, def.walls);

        const packet = new MapPacket();
        packet.width = this.width;
        packet.height = this.height;
        packet.walls = this.walls;

        this.serializedData.serializeServerPacket(packet);
    }
}
