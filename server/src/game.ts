import { GameConstants } from "../../common/src/constants";
import { type Packet, PacketStream } from "../../common/src/net";
import { BulletManager } from "./bullet";
import { ClientManager } from "./client";
import type { ServerConfig } from "./config";
import { EntityManager } from "./entities/entity";
import { LootManager } from "./entities/loot";
import { PlayerManager } from "./entities/player";
import { ProjectileManager } from "./entities/projectile";
import { ExplosionManager } from "./explosion";
import { Grid } from "./grid";
import { Logger } from "./logger";
import { GameMap } from "./map";

export class Game {
    grid = new Grid(GameConstants.maxPosition, GameConstants.maxPosition);

    clientManager = new ClientManager(this);

    entityManager = new EntityManager(this.grid);

    map: GameMap;

    playerManager = new PlayerManager(this);
    lootManager = new LootManager(this);
    projectileManager = new ProjectileManager(this);
    bulletManager = new BulletManager(this);
    explosionManager = new ExplosionManager(this);

    packetStream = new PacketStream(new ArrayBuffer(1 << 10));

    now = Date.now();

    tickTimes: number[] = [];
    mspt = 0;
    perfTicker = 0;
    deltaTimes: number[] = [];
    tps = 0;
    logger = new Logger("Game");

    timer: Timer;

    constructor(readonly config: ServerConfig) {
        this.map = new GameMap(this, config.map);
        this.timer = setInterval(this.update.bind(this), 1000 / config.tps);
    }

    update(): void {
        const now = Date.now();
        const dt = (now - this.now) / 1000;
        this.now = now;

        // update entities
        this.entityManager.update(dt);
        this.bulletManager.update(dt);
        this.explosionManager.update();

        // Cache entity serializations, calculate visible objects for players, send packets etc
        this.entityManager.serializeEntities();
        this.clientManager.sendPackets(dt);

        // reset stuff
        this.packetStream.stream.index = 0;
        this.entityManager.flush();
        this.playerManager.flush();
        this.bulletManager.flush();
        this.explosionManager.flush();

        this.deltaTimes.push(dt);
        this.tickTimes.push(Date.now() - this.now);

        this.perfTicker += dt;
        if (this.perfTicker > 5) {
            this.perfTicker = 0;
            const avgDt =
                this.deltaTimes.reduce((a, b) => a + b) / this.deltaTimes.length;
            this.tps = Math.round(1 / avgDt);
            this.deltaTimes.length = 0;

            this.mspt = this.tickTimes.reduce((a, b) => a + b) / this.tickTimes.length;

            this.logger.log(`Avg ms/tick: ${this.mspt.toFixed(2)}`);
            this.tickTimes = [];
        }
    }

    sendPacket(packet: Packet) {
        this.packetStream.serializeServerPacket(packet);
    }
}
