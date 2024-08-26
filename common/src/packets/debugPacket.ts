import type { GameBitStream, Packet } from "../net";

export class DebugPacket implements Packet {
    tps = 0;
    entities = 0;
    players = 0;
    bullets = 0;

    serialize(stream: GameBitStream): void {
        stream.writeUint8(this.tps);
        stream.writeUint16(this.entities);
        stream.writeUint8(this.players);
        stream.writeUint16(this.bullets);
    }
    deserialize(stream: GameBitStream): void {
        this.tps = stream.readUint8();
        this.entities = stream.readUint16();
        this.players = stream.readUint8();
        this.bullets = stream.readUint16();
    }
}
