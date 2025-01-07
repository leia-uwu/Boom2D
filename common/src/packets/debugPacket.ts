import type { EntityType } from "../constants";
import type { GameBitStream, Packet } from "../net";

export enum DebugFlags {
    Tps = 1 << 0,
    Objects = 1 << 1,
}

export class DebugPacket implements Packet {
    flags = 0;

    tpsAvg = 0;
    tpsMin = 0;
    tpsMax = 0;

    msptAvg = 0;

    entityCounts: Array<{
        type: EntityType;
        active: number;
        allocated: number;
    }> = [];

    bullets = 0;

    serialize(stream: GameBitStream): void {
        const flags = this.flags;
        stream.writeUint8(flags);

        if (flags & DebugFlags.Tps) {
            stream.writeUint16(this.tpsAvg);
            stream.writeUint16(this.tpsMin);
            stream.writeUint16(this.tpsMax);

            stream.writeFloat(this.msptAvg, 0, 100, 16);
        }

        if (flags & DebugFlags.Objects) {
            stream.writeArray(this.entityCounts, 8, (count) => {
                stream.writeUint8(count.type);
                stream.writeUint16(count.active);
                stream.writeUint16(count.allocated);
            });

            stream.writeUint16(this.bullets);
        }
    }
    deserialize(stream: GameBitStream): void {
        const flags = (this.flags = stream.readUint8());

        if (flags & DebugFlags.Tps) {
            this.tpsAvg = stream.readUint16();
            this.tpsMin = stream.readUint16();
            this.tpsMax = stream.readUint16();

            this.msptAvg = stream.readFloat(0, 100, 16);
        }

        if (flags & DebugFlags.Objects) {
            stream.readArray(this.entityCounts, 8, () => {
                return {
                    type: stream.readUint8(),
                    active: stream.readUint16(),
                    allocated: stream.readUint16(),
                };
            });

            this.bullets = stream.readUint16();
        }
    }
}
