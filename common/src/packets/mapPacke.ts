import { GameBitStream, Packet } from "../net";

export class MapPacket implements Packet {
    width = 0;
    height = 0;

    serialize(stream: GameBitStream): void {
        stream.writeUint16(this.width);
        stream.writeUint16(this.height);
    }

    deserialize(stream: GameBitStream): void {
        this.width = stream.readUint16();
        this.height = stream.readUint16();
    }
}
