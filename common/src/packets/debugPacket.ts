import { EntityType } from "../constants";
import type { GameBitStream, Packet } from "../net";

export enum DebugFlags {
    Tps = 1 << 0,
    Objects = 1 << 1
}

export class DebugPacket implements Packet {
    flags = 0;

    tpsAvg = 0;
    tpsMin = 0;
    tpsMax = 0;

    msptAvg = 0;

    entityCounts = {
        [EntityType.Player]: 0,
        [EntityType.Projectile]: 0,
        [EntityType.Obstacle]: 0,
        [EntityType.Loot]: 0
    };

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
            for (const type in this.entityCounts) {
                // @ts-expect-error
                stream.writeUint16(this.entityCounts[type]);
            }

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
            for (const type in this.entityCounts) {
                // @ts-expect-error
                this.entityCounts[type] = stream.readUint16();
            }

            this.bullets = stream.readUint16();
        }
    }
}
