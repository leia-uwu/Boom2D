import { Container } from "pixi.js";
import { GameConstants, type ValidEntityType } from "../../../../common/src/constants";
import type { EntitiesNetData } from "../../../../common/src/packets/updatePacket";
import type { Hitbox } from "../../../../common/src/utils/hitbox";
import { MathUtils } from "../../../../common/src/utils/math";
import { assert } from "../../../../common/src/utils/util";
import { Vec2 } from "../../../../common/src/utils/vector";
import type { Game } from "../game";

export abstract class ClientEntity<T extends ValidEntityType = ValidEntityType> {
    abstract __type: T;
    declare id: number;
    declare __arrayIdx: number;
    active = false;

    abstract hitbox: Hitbox;
    game: Game;
    position = Vec2.new(0, 0);

    container = new Container();

    data!: Required<EntitiesNetData[T]>;

    constructor(game: Game) {
        this.game = game;
        this.game.camera.addObject(this.container);
    }

    updateFromData(data: EntitiesNetData[T], _isNew: boolean): void {
        this.interpolationTick = 0;

        if (data.full) {
            this.data = data as unknown as Required<EntitiesNetData[T]>;
        } else {
            // save old full data to set it back if its not a full update
            const oldFull = this.data.full;
            this.data = { ...data } as unknown as Required<EntitiesNetData[T]>;
            this.data.full = oldFull;
        }
    }

    abstract init(): void;
    abstract free(): void;
    abstract destroy(): void;

    oldPosition = Vec2.new(0, 0);
    interpolationTick = 0;
    interpolationFactor = 0;

    update(dt: number): void {
        this.interpolationTick += dt;
        this.interpolationFactor = MathUtils.clamp(
            this.interpolationTick / this.game.serverDt,
            0,
            1,
        );
    }
}

export class EntityPool<T extends ClientEntity = ClientEntity> {
    pool: Array<T> = [];
    activeCount = 0;

    constructor(public entityCtr: new(game: Game) => T) {}

    allocEntity(game: Game, id: number) {
        let entity: T | undefined = undefined;
        for (let i = 0; i < this.pool.length; i++) {
            if (!this.pool[i].active) {
                entity = this.pool[i];
                break;
            }
        }
        if (!entity) {
            entity = new this.entityCtr(game);
        }
        entity.active = true;
        entity.id = id;
        entity.init();
        return entity;
    }

    freeEntity(entity: ClientEntity) {
        entity.free();
        entity.active = false;
        this.activeCount--;

        // free some entities
        if (this.pool.length > 128 && this.activeCount < this.pool.length / 2) {
            const compact = [];
            for (let i = 0; i < this.pool.length; i++) {
                if (this.pool[i].active) {
                    compact.push(this.pool[i]);
                } else {
                    this.pool[i].destroy();
                }
            }
            this.pool = compact;
        }
    }
}

export class EntityManager {
    entities: Array<ClientEntity> = [];
    idToEntity: Array<ClientEntity | null> = new Array(GameConstants.maxEntityId).fill(
        null,
    );

    constructor(
        readonly game: Game,
        readonly typeToPool: Record<ValidEntityType, EntityPool>,
    ) {}

    getById(id: number) {
        return this.idToEntity[id] ?? undefined;
    }

    createEntity(
        type: ValidEntityType,
        id: number,
        data: Required<EntitiesNetData[ValidEntityType]>,
    ) {
        assert(!this.getById(id), "Entity already created");
        const entity = this.typeToPool[type].allocEntity(this.game, id);

        entity.__arrayIdx = this.entities.length;
        this.entities[entity.__arrayIdx] = entity;
        this.idToEntity[id] = entity;

        entity.updateFromData(data, true);
        return entity;
    }

    updateFullEntity(id: number, data: Required<EntitiesNetData[ValidEntityType]>) {
        const entity = this.getById(id);

        if (!entity) {
            console.error(
                "Tried to fully update invalid entity ID:",
                id,
                "data:",
                JSON.stringify(data, null, 2),
            );
            return;
        }

        entity.updateFromData(data, false);
    }

    updatePartialEntity(id: number, data: EntitiesNetData[ValidEntityType]) {
        const entity = this.getById(id);
        if (!entity) {
            console.error(
                "Tried to partially update invalid entity, ID:",
                id,
                "data:",
                JSON.stringify(data, null, 2),
            );
            return;
        }
        entity.updateFromData(data, false);
    }

    deleteEntity(id: number) {
        const entity = this.getById(id);
        if (!entity) {
            console.error(`Tried to destroy delete entity, ID: ${id}`);
            return;
        }
        const lastEntity = this.entities.pop()!;

        if (entity !== lastEntity) {
            this.entities[entity.__arrayIdx] = lastEntity;
            lastEntity.__arrayIdx = entity.__arrayIdx;
        }
        this.typeToPool[entity.__type as ValidEntityType].freeEntity(entity);
        this.idToEntity[id] = null;
    }

    clear() {
        for (let i = 0; i < this.entities.length; i++) {
            this.entities[i]?.destroy();
        }
        this.entities.length = 0;
        this.idToEntity.fill(null);
    }

    update(dt: number) {
        for (let i = 0; i < this.entities.length; i++) {
            if (this.entities[i].active) {
                this.entities[i].update(dt);
            }
        }
    }
}
