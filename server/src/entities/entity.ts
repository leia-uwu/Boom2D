import type { EntityType } from "../../../common/src/constants";
import { GameBitStream } from "../../../common/src/net";
import {
    type EntitiesNetData,
    EntitySerializations
} from "../../../common/src/packets/updatePacket";
import type { Hitbox } from "../../../common/src/utils/hitbox";
import type { Vector } from "../../../common/src/utils/vector";
import type { Game } from "../game";

export abstract class ServerEntity<T extends EntityType = EntityType> {
    abstract __type: T;
    readonly id: number;
    game: Game;

    _position: Vector;
    get position(): Vector {
        return this._position;
    }
    set position(pos: Vector) {
        this._position = pos;
    }

    abstract hitbox: Hitbox;

    partialStream!: GameBitStream;
    fullStream!: GameBitStream;

    constructor(game: Game, pos: Vector) {
        this.game = game;
        this.id = game.idAllocator.getNextId();
        this._position = pos;
    }

    abstract tick(dt: number): void;

    init(): void {
        // + 3 for entity id (2 bytes) and entity type (1 byte)
        this.partialStream = GameBitStream.alloc(
            EntitySerializations[this.__type].partialSize + 3
        );
        this.fullStream = GameBitStream.alloc(EntitySerializations[this.__type].fullSize);
        this.serializeFull();
    }

    serializePartial(): void {
        this.partialStream.index = 0;
        this.partialStream.writeUint16(this.id);
        this.partialStream.writeUint8(this.__type);
        EntitySerializations[this.__type].serializePartial(
            this.partialStream,
            this.data as EntitiesNetData[typeof this.__type]
        );
        this.partialStream.writeAlignToNextByte();
    }

    serializeFull(): void {
        this.serializePartial();
        this.fullStream.index = 0;
        EntitySerializations[this.__type].serializeFull(this.fullStream, this.data.full);
        this.fullStream.writeAlignToNextByte();
    }

    setDirty(): void {
        this.game.partialDirtyEntities.add(this);
    }

    setFullDirty(): void {
        this.game.fullDirtyEntities.add(this);
    }

    abstract get data(): Required<EntitiesNetData[EntityType]>;
}
