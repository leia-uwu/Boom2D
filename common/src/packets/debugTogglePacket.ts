import type { GameBitStream, Packet } from "../net";

export class DebugTogglePacket implements Packet {
    enable = false;

    serialize(stream: GameBitStream): void {
        stream.writeBoolean(this.enable);
    }
    deserialize(stream: GameBitStream): void {
        this.enable = stream.readBoolean();
    }
}
