import type { GameBitStream, Packet } from "../net";

export class JoinedPacket implements Packet {
    playerId = 0;

    serialize(stream: GameBitStream): void {
        stream.writeUint16(this.playerId);
    }

    deserialize(stream: GameBitStream): void {
        this.playerId = stream.readUint16();
    }
}
