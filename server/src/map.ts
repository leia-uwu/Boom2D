import { BaseGameMap, BaseWall } from "../../common/src/baseMap";
import { MapDefKey, MapDefs } from "../../common/src/defs/mapDefs";
import { PacketStream } from "../../common/src/net";
import { MapPacket } from "../../common/src/packets/mapPacke";
import { CircleHitbox, RectHitbox } from "../../common/src/utils/hitbox";
import { Vec2 } from "../../common/src/utils/vector";
import { Game } from "./game";

export class GameMap extends BaseGameMap {
    serializedData = new PacketStream(new ArrayBuffer(1 << 14));

    constructor(readonly game: Game, readonly name: MapDefKey) {
        super();
        const def = MapDefs.typeToDef(name);

        const walls: BaseWall[] = [
            {
                hitbox: new CircleHitbox(5, Vec2.new(50, 50))
            },
            {
                hitbox: RectHitbox.fromRect(10, 10, Vec2.new(10, 10))
            }
        ];

        this.init(def.width, def.height, walls);

        const packet = new MapPacket();
        packet.width = this.width;
        packet.height = this.height;
        packet.walls = walls;

        this.serializedData.serializeServerPacket(packet);
    }
}
