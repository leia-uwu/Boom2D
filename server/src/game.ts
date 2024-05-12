import { ServerWebSocket } from "bun";
import { Player } from "./entities/player";
import { type PlayerData } from "./server";
import { type ServerEntity } from "./entities/entity";
import { Grid } from "./grid";
import { EntityPool } from "../../common/src/utils/entityPool";
import { GameConstants } from "../../common/src/constants";
import { type ServerConfig } from "./config";
import { Shot } from "../../common/src/packets/updatePacket";
import { IDAllocator } from "./idAllocator";
import { BulletManager } from "./bullet";
import { GameMap } from "./map";
import { ExplosionManager } from "./explosion";

export class Game {
    players = new EntityPool<Player>();

    newPlayers: Player[] = [];
    deletedPlayers: number[] = [];

    partialDirtyEntities = new Set<ServerEntity>();
    fullDirtyEntities = new Set<ServerEntity>();

    bulletManager = new BulletManager(this);
    explosionManager = new ExplosionManager(this);
    shots: Shot[] = [];

    grid = new Grid(GameConstants.maxPosition, GameConstants.maxPosition);

    map: GameMap;

    mapDirty = false;

    idAllocator = new IDAllocator(16);

    now = Date.now();

    timer: Timer;

    constructor(config: ServerConfig) {
        this.map = new GameMap(this, config.map);
        this.timer = setInterval(this.tick.bind(this), 1000 / config.tps);
    }

    addPlayer(socket: ServerWebSocket<PlayerData>): Player {
        const player = new Player(this, socket);
        return player;
    }

    removePlayer(player: Player): void {
        this.players.delete(player);
        this.grid.remove(player);
        this.deletedPlayers.push(player.id);
        console.log(`"${player.name}" left game`);
    }

    tick(): void {
        const now = Date.now();
        const dt = (now - this.now) / 1000;
        this.now = now;

        // update entities
        for (const entity of this.grid.entities.values()) {
            entity.tick(dt);
        }

        this.bulletManager.tick(dt);
        this.explosionManager.tick(dt);

        // Cache entity serializations
        for (const entity of this.partialDirtyEntities) {
            if (this.fullDirtyEntities.has(entity)) {
                this.partialDirtyEntities.delete(entity);
                continue;
            }
            entity.serializePartial();
        }

        for (const entity of this.fullDirtyEntities) {
            entity.serializeFull();
        }

        // Second loop over players: calculate visible entities & send updates
        for (const player of this.players) {
            player.sendPackets();
        }

        // reset stuff
        for (const player of this.players) {
            for (const key in player.dirty) {
                player.dirty[key as keyof Player["dirty"]] = false;
            }
        }

        this.partialDirtyEntities.clear();
        this.fullDirtyEntities.clear();
        this.newPlayers.length = 0;
        this.deletedPlayers.length = 0;
        this.bulletManager.newBullets.length = 0;
        this.explosionManager.explosions.length = 0;
        this.shots.length = 0;
        this.mapDirty = false;
    }
}
