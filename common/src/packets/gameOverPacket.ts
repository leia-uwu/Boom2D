import { type GameBitStream, type Packet } from "../net";

export class GameOverPacket implements Packet {
    kills = 0;
    damageDone = 0;
    damageTaken = 0;

    serialize(stream: GameBitStream): void {
        stream.writeUint16(this.kills);
        stream.writeUint32(this.damageDone);
        stream.writeUint32(this.damageTaken);
    }

    deserialize(stream: GameBitStream): void {
        this.kills = stream.readUint16();
        this.damageDone = stream.readUint32();
        this.damageTaken = stream.readUint32();
    }
}
