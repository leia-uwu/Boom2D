import { GameConstants } from "../../common/src/constants";
import { BulletManager } from "./bullet";
import type { ServerConfig } from "./config";
import { EntityManager } from "./entities/entity";
import { PlayerManager } from "./entities/player";
import { ExplosionManager } from "./explosion";
import { Grid } from "./grid";
import { GameMap } from "./map";

export class Game {
    grid = new Grid(GameConstants.maxPosition, GameConstants.maxPosition);
    entityManager = new EntityManager(this.grid);

    map: GameMap;

    playerManager = new PlayerManager(this);
    bulletManager = new BulletManager(this);
    explosionManager = new ExplosionManager(this);

    now = Date.now();

    timer: Timer;

    constructor(config: ServerConfig) {
        this.map = new GameMap(this, config.map);
        this.timer = setInterval(this.tick.bind(this), 1000 / config.tps);
    }

    tick(): void {
        const now = Date.now();
        const dt = (now - this.now) / 1000;
        this.now = now;

        // update entities
        this.entityManager.tick(dt);
        this.bulletManager.tick(dt);
        this.explosionManager.tick();

        // Cache entity serializations, calculate visible objects for players, send packets etc
        this.entityManager.serializeEntities();
        this.playerManager.sendPackets();

        // reset stuff
        this.entityManager.flush();
        this.playerManager.flush();
        this.bulletManager.flush();
        this.explosionManager.flush();
    }
}
