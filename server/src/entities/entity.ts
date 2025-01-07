import { EntityType, GameConstants, type ValidEntityType } from "../../../common/src/constants";
import { GameBitStream } from "../../../common/src/net";
import type { DebugPacket } from "../../../common/src/packets/debugPacket";
import {
    type EntitiesNetData,
    EntitySerializations,
} from "../../../common/src/packets/updatePacket";
import type { Hitbox } from "../../../common/src/utils/hitbox";
import { assert } from "../../../common/src/utils/util";
import type { Vector } from "../../../common/src/utils/vector";
import type { Game } from "../game";
import type { Loot } from "./loot";
import type { Obstacle } from "./obstacle";
import type { Player } from "./player";
import type { Projectile } from "./projectile";

export abstract class AbstractServerEntity<T extends ValidEntityType = ValidEntityType> {
    abstract readonly __type: T;

    active = false;
    registered = false;

    declare id: number;
    declare __arrayIdx: number;

    __gridCells: Vector[] = [];

    readonly game: Game;

    abstract hitbox: Hitbox;

    _position!: Vector;

    get position() {
        return this._position;
    }
    set position(pos: Vector) {
        this._position = pos;
    }

    partialStream!: GameBitStream;
    fullStream!: GameBitStream;

    constructor(game: Game) {
        this.game = game;
    }

    abstract update(dt: number): void;

    initCache(): void {
        // + 3 for entity id (2 bytes) and entity type (1 byte)
        this.partialStream = GameBitStream.alloc(
            EntitySerializations[this.__type].partialSize + 3,
        );
        this.fullStream = GameBitStream.alloc(EntitySerializations[this.__type].fullSize);
    }

    serializePartial(): void {
        this.partialStream.index = 0;
        this.partialStream.writeUint16(this.id);
        this.partialStream.writeUint8(this.__type);
        EntitySerializations[this.__type].serializePartial(
            this.partialStream,
            this.data as EntitiesNetData[typeof this.__type],
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
        if (!this.active) {
            console.warn("Tried to destroy entity twice");
            return;
        }
        // @ts-expect-error
        this.game.entityManager.typeToPool[this.__type].freeEntity(this);

        this.game.grid.removeFromGrid(this as unknown as ServerEntity);
        this.game.entityManager.deletedEntities.push(this as unknown as ServerEntity);
    }

    abstract get data(): Required<EntitiesNetData[ValidEntityType]>;
}

export type ServerEntity = Player | Projectile | Obstacle | Loot;

export abstract class EntityPool<T extends ServerEntity> {
    abstract type: T["__type"];

    pool: T[] = [];
    activeCount = 0;

    constructor(
        public game: Game,
        public entityCtr: new(game: Game) => T,
    ) {}

    allocEntity(...params: Parameters<T["init"]>) {
        let entity: T | undefined = undefined;
        for (let i = 0; i < this.pool.length; i++) {
            if (!this.pool[i].active && !this.pool[i].registered) {
                entity = this.pool[i];
                break;
            }
        }
        if (!entity) {
            entity = new this.entityCtr(this.game) as T;
            entity.initCache();
            this.pool.push(entity);
        }
        this.activeCount++;
        entity.active = true;
        (entity.init as (...p: typeof params) => void)(...params);

        // @ts-expect-error
        entity.__type = this.type;

        this.game.entityManager.register(entity);
        entity.serializeFull();
        this.game.grid.addEntity(entity);

        return entity;
    }

    freeEntity(entity: T) {
        entity.active = false;

        this.activeCount--;

        // free some entities if pool is too big
        if (this.pool.length > 128 && this.activeCount < this.pool.length / 2) {
            const compact: T[] = [];
            for (let i = 0; i < this.pool.length; i++) {
                const entity = this.pool[i];
                if (entity.active) {
                    compact.push(entity);
                }
            }
            this.pool = compact;
            this.activeCount = this.pool.length;
        }
    }
}

export class EntityManager {
    entities: Array<ServerEntity> = [];
    idToEntity: Array<ServerEntity | null> = new Array(GameConstants.maxEntityId).fill(
        null,
    );

    dirtyPart = new Uint8Array(GameConstants.maxEntityId);
    dirtyFull = new Uint8Array(GameConstants.maxEntityId);

    deletedEntities: ServerEntity[] = [];

    idNext = 1;
    freeIds: number[] = [];

    typeToPool: {
        [EntityType.Player]: EntityPool<Player>;
        [EntityType.Projectile]: EntityPool<Projectile>;
        [EntityType.Obstacle]: EntityPool<Obstacle>;
        [EntityType.Loot]: EntityPool<Loot>;
    };

    counts: DebugPacket["entityCounts"] = [];

    constructor(
        readonly game: Game,
        pools: (typeof this)["typeToPool"],
    ) {
        this.typeToPool = pools;
    }

    getById(id: number) {
        return this.idToEntity[id] ?? undefined;
    }

    allocId() {
        let id = 1;
        if (this.idNext <= GameConstants.maxEntityId) {
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
        const id = this.allocId();
        entity.id = id;
        entity.__arrayIdx = this.entities.length;
        entity.registered = true;
        this.entities[entity.__arrayIdx] = entity;
        this.idToEntity[id] = entity;
        this.dirtyPart[id] = 1;
        this.dirtyFull[id] = 1;
        this.updateCounts();
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

        this.dirtyPart[entity.id] = 0;
        this.dirtyFull[entity.id] = 0;

        entity.id = 0;
        entity.registered = false;
        // @ts-expect-error type is readonly for proper type to entity class casting
        entity.__type = EntityType.Invalid;

        this.updateCounts();
    }

    updateCounts() {
        this.game.debugObjCountDirty = true;

        this.counts = Object.entries(this.typeToPool).map(([type, pool]) => {
            return {
                type: parseInt(type),
                active: pool.activeCount,
                allocated: pool.pool.length,
            };
        });
    }

    update(dt: number): void {
        for (let i = 0; i < this.entities.length; i++) {
            if (this.entities[i].active) {
                this.entities[i]?.update(dt);
            }
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
    }
}
