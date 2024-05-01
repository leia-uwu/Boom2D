import { type GameBitStream, type Packet } from "../net";
import { Vec2 } from "../utils/vector";

export class InputPacket implements Packet {
    moveLeft = false;
    moveRight = false;
    moveUp = false;
    moveDown = false;

    direction = Vec2.new(0, 0);
    mouseDown = false;

    serialize(stream: GameBitStream): void {
        stream.writeBoolean(this.moveLeft);
        stream.writeBoolean(this.moveRight);
        stream.writeBoolean(this.moveUp);
        stream.writeBoolean(this.moveDown);

        stream.writeBoolean(this.mouseDown);
        stream.writeUnit(this.direction, 16);
    }

    deserialize(stream: GameBitStream): void {
        this.moveLeft = stream.readBoolean();
        this.moveRight = stream.readBoolean();
        this.moveUp = stream.readBoolean();
        this.moveDown = stream.readBoolean();

        this.mouseDown = stream.readBoolean();
        this.direction = stream.readUnit(16);
    }
}
