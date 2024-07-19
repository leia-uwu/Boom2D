import { Container } from "pixi.js";
import type { EntityType } from "../../../../common/src/constants";
import type { EntitiesNetData } from "../../../../common/src/packets/updatePacket";
import type { Hitbox } from "../../../../common/src/utils/hitbox";
import { MathUtils } from "../../../../common/src/utils/math";
import { assert } from "../../../../common/src/utils/util";
import { Vec2 } from "../../../../common/src/utils/vector";
import type { Game } from "../game";

export abstract class ClientEntity<T extends EntityType = EntityType> {
    abstract __type: T;
    declare __arrayIdx: number;
    id: number;
    abstract hitbox: Hitbox;
    game: Game;
    position = Vec2.new(0, 0);

    container = new Container();

    data!: Required<EntitiesNetData[T]>;

    constructor(game: Game, id: number) {
        this.game = game;
        this.id = id;

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

    abstract destroy(): void;

    oldPosition = Vec2.new(0, 0);
    interpolationTick = 0;
    interpolationFactor = 0;

    render(dt: number): void {
        this.interpolationTick += dt;
        this.interpolationFactor = MathUtils.clamp(
            this.interpolationTick / this.game.serverDt,
            0,
            1
        );
    }
}

const MAX_ID = 1 << 16;

type ValidEntityType = Exclude<EntityType, EntityType.Invalid>;

export class EntityManager<
    T extends Record<ValidEntityType, new (game: Game, id: number) => ClientEntity>
> {
    typeToCtr: T;

    entities: Array<ClientEntity> = [];
    idToEntity: Array<ClientEntity | null> = [];

    constructor(
        readonly game: Game,
        typeToActr: T
    ) {
        this.typeToCtr = typeToActr;

        for (let i = 0; i < MAX_ID; i++) {
            this.idToEntity[i] = null;
        }
    }

    getById(id: number) {
        return this.idToEntity[id] ?? undefined;
    }

    createEntity(
        type: ValidEntityType,
        id: number,
        data: Required<EntitiesNetData[EntityType]>
    ) {
        assert(!this.getById(id), "Entity already created");
        const entity = new this.typeToCtr[type](this.game, id);

        entity.__arrayIdx = this.entities.length;
        this.entities[entity.__arrayIdx] = entity;
        this.idToEntity[id] = entity;

        entity.updateFromData(data, true);
        return entity;
    }

    updateFullEntity(id: number, data: Required<EntitiesNetData[EntityType]>) {
        const entity = this.getById(id);

        assert(entity, "Tried to fully update invalid entity");

        entity.updateFromData(data, false);
    }

    updatePartialEntity(id: number, data: EntitiesNetData[EntityType]) {
        const entity = this.getById(id);
        assert(entity, "Tried to partially update invalid entity");
        entity.updateFromData(data, false);
    }

    deleteEntity(id: number) {
        const entity = this.getById(id);
        assert(entity, "Tried to destroy invalid entity");
        const lastEntity = this.entities.pop()!;

        if (entity !== lastEntity) {
            this.entities[entity.__arrayIdx] = lastEntity;
            lastEntity.__arrayIdx = entity.__arrayIdx;
        }

        entity.destroy();

        this.idToEntity[id] = null;
    }

    clear() {
        for (let i = 0; i < this.entities.length; i++) {
            this.entities[i]?.destroy();
        }
        this.entities.length = 0;
        for (let i = 0; i < MAX_ID; i++) {
            this.idToEntity[i] = null;
        }
    }

    render(dt: number) {
        for (let i = 0; i < this.entities.length; i++) {
            this.entities[i].render(dt);
        }
    }
}
