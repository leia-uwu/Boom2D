import type { BaseWall } from "../baseMap";
import type { GameBitStream, Packet } from "../net";

export class MapPacket implements Packet {
    width = 0;
    height = 0;
    walls: BaseWall[] = [];

    serialize(stream: GameBitStream): void {
        stream.writeUint16(this.width);
        stream.writeUint16(this.height);

        stream.writeArray(this.walls, 16, (wall) => {
            stream.writeHitbox(wall.hitbox);
            stream.writeBits(wall.color, 24);
        });
    }

    deserialize(stream: GameBitStream): void {
        this.width = stream.readUint16();
        this.height = stream.readUint16();

        stream.readArray(this.walls, 16, () => {
            return {
                hitbox: stream.readHitbox(),
                color: stream.readBits(24)
            };
        });
    }
}
