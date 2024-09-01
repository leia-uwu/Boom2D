import {
    EntityType,
    GameConstants,
    type ValidEntityType
} from "../../../common/src/constants";
import { GameBitStream } from "../../../common/src/net";
import {
    type EntitiesNetData,
    EntitySerializations
} from "../../../common/src/packets/updatePacket";
import type { Hitbox } from "../../../common/src/utils/hitbox";
import { assert } from "../../../common/src/utils/util";
import type { Vector } from "../../../common/src/utils/vector";
import type { Game } from "../game";

export abstract class ServerEntity<T extends ValidEntityType = ValidEntityType> {
    abstract readonly __type: T;

    active = true;

    declare id: number;
    declare __arrayIdx: number;

    __gridCells: Vector[] = [];

    readonly game: Game;

    abstract hitbox: Hitbox;

    _position: Vector;

    get position() {
        return this._position;
    }
    set position(pos: Vector) {
        this._position = pos;
    }

    destroyed = false;

    partialStream!: GameBitStream;
    fullStream!: GameBitStream;

    constructor(game: Game, pos: Vector) {
        this.game = game;
        this._position = pos;
    }

    abstract update(dt: number): void;

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
        this.game.entityManager.dirtyPart[this.id] = 1;
    }

    setFullDirty(): void {
        this.game.entityManager.dirtyFull[this.id] = 1;
    }

    destroy() {
        if (this.destroyed) {
            console.warn("Tried to destroy object twice");
            return;
        }
        this.active = false;
        this.game.grid.removeFromGrid(this);
        this.game.entityManager.deletedEntities.push(this);
        this.destroyed = true;
    }

    abstract get data(): Required<EntitiesNetData[ValidEntityType]>;
}

export class EntityManager {
    entities: Array<ServerEntity | undefined> = [];
    idToEntity: Array<ServerEntity | null> = [];

    counts = {
        [EntityType.Player]: 0,
        [EntityType.Projectile]: 0,
        [EntityType.Obstacle]: 0,
        [EntityType.Loot]: 0
    };

    idToType = new Uint8Array(GameConstants.maxEntityId);
    dirtyPart = new Uint8Array(GameConstants.maxEntityId);
    dirtyFull = new Uint8Array(GameConstants.maxEntityId);

    deletedEntities: ServerEntity[] = [];

    idNext = 1;
    freeIds: number[] = [];

    constructor(readonly game: Game) {
        for (let i = 0; i < GameConstants.maxEntityId; i++) {
            this.idToEntity[i] = null;
        }
    }

    getById(id: number) {
        return this.idToEntity[id] ?? undefined;
    }

    allocId() {
        let id = 1;
        if (this.idNext < GameConstants.maxEntityId) {
            id = this.idNext++;
        } else {
            if (this.freeIds.length > 0) {
                id = this.freeIds.shift()!;
            } else {
                assert(false, "Ran out of entity ids");
            }
        }
        return id;
    }

    freeId(id: number) {
        this.freeIds.push(id);
    }

    register(entity: ServerEntity) {
        const type = entity.__type;
        const id = this.allocId();
        entity.id = id;
        entity.__arrayIdx = this.entities.length;
        entity.init();
        this.entities[entity.__arrayIdx] = entity;
        this.idToEntity[id] = entity;
        this.idToType[id] = type;
        this.dirtyPart[id] = 1;
        this.dirtyFull[id] = 1;
        this.counts[entity.__type]++;
        this.game.debugObjCountDirty = true;

        this.game.grid.addEntity(entity);
        entity.init();
    }

    unregister(entity: ServerEntity) {
        assert(entity.id > 0);

        const lastEntity = this.entities.pop()!;
        if (entity !== lastEntity) {
            this.entities[entity.__arrayIdx] = lastEntity;
            lastEntity.__arrayIdx = entity.__arrayIdx;
        }
        this.idToEntity[entity.id] = null;

        this.freeId(entity.id);

        this.idToType[entity.id] = 0;
        this.dirtyPart[entity.id] = 0;
        this.dirtyFull[entity.id] = 0;

        this.counts[entity.__type]--;
        this.game.debugObjCountDirty = true;

        this.game.grid.removeFromGrid(entity);

        entity.id = 0;
        // @ts-expect-error type is readonly for proper type to entity class casting
        entity.__type = EntityType.Invalid;
    }

    update(dt: number): void {
        for (let i = 0; i < this.entities.length; i++) {
            this.entities[i]?.update(dt);
        }
    }

    serializeEntities() {
        for (let i = 0; i < this.entities.length; i++) {
            const entity = this.entities[i]!;
            const id = entity.id;
            if (this.dirtyFull[id]) {
                entity.serializeFull();
            } else if (this.dirtyPart[id]) {
                entity.serializePartial();
            }
        }
    }

    flush() {
        for (let i = 0; i < this.deletedEntities.length; i++) {
            this.unregister(this.deletedEntities[i]);
        }
        this.deletedEntities.length = 0;
        this.dirtyFull.fill(0);
        this.dirtyPart.fill(0);
        this.countsDirty = false;
    }
}
