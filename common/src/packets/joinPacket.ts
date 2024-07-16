import { GameConstants } from "../constants";
import type { GameBitStream, Packet } from "../net";

export class JoinPacket implements Packet {
    name = "";

    serialize(stream: GameBitStream): void {
        stream.writeASCIIString(this.name, GameConstants.player.nameMaxLength);
    }

    deserialize(stream: GameBitStream): void {
        this.name = stream.readASCIIString(GameConstants.player.nameMaxLength);
    }
}
