import type { GameBitStream, Packet } from "../net";

export class KillPacket implements Packet {
    killedId = 0;
    killerId = 0;

    serialize(stream: GameBitStream): void {
        stream.writeUint16(this.killedId);
        stream.writeUint16(this.killerId);
    }
    deserialize(stream: GameBitStream): void {
        this.killedId = stream.readUint16();
        this.killerId = stream.readUint16();
    }
}
