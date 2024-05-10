import { BaseWall } from "../baseMap";
import { GameBitStream, Packet } from "../net";

export class MapPacket implements Packet {
    width = 0;
    height = 0;
    walls: BaseWall[] = [];

    serialize(stream: GameBitStream): void {
        stream.writeUint16(this.width);
        stream.writeUint16(this.height);

        stream.writeArray(this.walls, 16, wall => {
            stream.writeHitbox(wall.hitbox);
        });
    }

    deserialize(stream: GameBitStream): void {
        this.width = stream.readUint16();
        this.height = stream.readUint16();

        stream.readArray(this.walls, 16, () => {
            return {
                hitbox: stream.readHitbox()
            };
        });
    }
}
