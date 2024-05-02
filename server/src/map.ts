import { MapDefKey, MapDefs } from "../../common/src/defs/mapDefs";
import { PacketStream } from "../../common/src/net";
import { MapPacket } from "../../common/src/packets/mapPacke";
import { Game } from "./game";

export class GameMap {
    readonly width: number;
    readonly height: number;
    serializedData = new PacketStream(new ArrayBuffer(1 << 14));

    constructor(readonly game: Game, readonly name: MapDefKey) {
        const def = MapDefs.typeToDef(name);
        this.width = def.width;
        this.height = def.height;

        const packet = new MapPacket();
        packet.width = this.width;
        packet.height = this.height;

        this.serializedData.serializeServerPacket(packet);
    }
}
