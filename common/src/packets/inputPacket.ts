import { WeaponDefKey, WeaponDefs } from "../defs/weaponDefs";
import { type GameBitStream, type Packet } from "../net";
import { Vec2 } from "../utils/vector";

export class InputPacket implements Packet {
    moveLeft = false;
    moveRight = false;
    moveUp = false;
    moveDown = false;

    direction = Vec2.new(0, 0);
    mouseDown = false;

    weaponToSwitch = "" as WeaponDefKey;

    serialize(stream: GameBitStream): void {
        stream.writeBoolean(this.moveLeft);
        stream.writeBoolean(this.moveRight);
        stream.writeBoolean(this.moveUp);
        stream.writeBoolean(this.moveDown);

        stream.writeBoolean(this.mouseDown);
        stream.writeUnit(this.direction, 16);

        WeaponDefs.write(stream, this.weaponToSwitch);
    }

    deserialize(stream: GameBitStream): void {
        this.moveLeft = stream.readBoolean();
        this.moveRight = stream.readBoolean();
        this.moveUp = stream.readBoolean();
        this.moveDown = stream.readBoolean();

        this.mouseDown = stream.readBoolean();
        this.direction = stream.readUnit(16);

        this.weaponToSwitch = WeaponDefs.read(stream);
    }

    static readonly fieldsToCompare = ["moveLeft", "moveRight", "moveUp", "moveDown", "mouseDown", "weaponToSwitch"] as const;
    /**
     * Compare two input packets to test if they need to be resent
     * @param that The previous input packet
     */
    didChange(that: InputPacket): boolean {
        for (const key of InputPacket.fieldsToCompare) {
            if (this[key] !== that[key]) return true;
        }

        if (!Vec2.equals(this.direction, that.direction)) return true;

        return false;
    }
}
