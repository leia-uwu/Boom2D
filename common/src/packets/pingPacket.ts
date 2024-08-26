import type { GameBitStream, Packet } from "../net";

export class PingPacket implements Packet {
    serialize(_stream: GameBitStream): void {}
    deserialize(_stream: GameBitStream): void {}
}
