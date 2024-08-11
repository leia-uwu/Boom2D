import type { BaseMapObject } from "../baseMap";
import type { GameBitStream, Packet } from "../net";

export class MapPacket implements Packet {
    width = 0;
    height = 0;
    objects: BaseMapObject[] = [];

    serialize(stream: GameBitStream): void {
        stream.writeUint16(this.width);
        stream.writeUint16(this.height);

        stream.writeArray(this.objects, 16, (obj) => {
            stream.writeUint8(obj.type);
            stream.writeHitbox(obj.hitbox);
            stream.writeBits(obj.color, 24);
            stream.writeASCIIString(obj.texture);
        });
    }

    deserialize(stream: GameBitStream): void {
        this.width = stream.readUint16();
        this.height = stream.readUint16();

        stream.readArray(this.objects, 16, () => {
            return {
                type: stream.readUint8(),
                hitbox: stream.readHitbox(),
                color: stream.readBits(24),
                texture: stream.readASCIIString()
            };
        });
    }
}
