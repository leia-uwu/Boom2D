import type { Application } from "pixi.js";
import { EntityType } from "../../../common/src/constants";
import { type Packet, PacketStream } from "../../../common/src/net";
import { DeathPacket } from "../../../common/src/packets/deathPacket";
import { DebugPacket } from "../../../common/src/packets/debugPacket";
import { JoinedPacket } from "../../../common/src/packets/joinedPacket";
import { JoinPacket } from "../../../common/src/packets/joinPacket";
import { KillPacket } from "../../../common/src/packets/killPacket";
import { MapPacket } from "../../../common/src/packets/mapPacket";
import { PingPacket } from "../../../common/src/packets/pingPacket";
import { QuitPacket } from "../../../common/src/packets/quitPacket";
import { UpdatePacket } from "../../../common/src/packets/updatePacket";
import { assert } from "../../../common/src/utils/util";
import { ClientConfig } from "../config";
import type { App } from "../main";
import { settings } from "../settings";
import { AudioManager } from "./audioManager";
import { BulletManager } from "./bullet";
import { Camera } from "./camera";
import { DEBUG_ENABLED, debugRenderer } from "./debug";
import { type ClientEntity, EntityManager } from "./entities/entity";
import { LootManager } from "./entities/loot";
import { ObstacleManager } from "./entities/obstacle";
import { type Player, PlayerManager } from "./entities/player";
import { ProjectileManager } from "./entities/projectile";
import { ExplosionManager } from "./explosion";
import { InputManager } from "./inputManager";
import { GameMap } from "./map";
import { ParticleManager } from "./particle";
import { ResourceManager } from "./resourceManager";
import { GameUi } from "./ui/gameUi";

export class Game {
    app: App;
    socket?: WebSocket;
    pixi: Application;

    inGame = false;

    activePlayerID = 0;

    get activePlayer(): Player | undefined {
        return this.entityManager.getById(this.activePlayerID) as Player;
    }

    resourceManager = new ResourceManager();
    ui = new GameUi(this);
    camera = new Camera(this);
    map = new GameMap(this);

    inputManager = new InputManager(this);
    audioManager = new AudioManager(this);
    particleManager = new ParticleManager(this);
    bulletManager = new BulletManager(this);
    explosionManager = new ExplosionManager(this);

    playerManager = new PlayerManager();
    lootManager = new LootManager();
    obstacleManager = new ObstacleManager();
    projectileManager = new ProjectileManager();

    entityManager: EntityManager;

    constructor(app: App) {
        this.app = app;
        this.pixi = app.pixi;

        this.entityManager = new EntityManager(this, {
            [EntityType.Player]: this.playerManager,
            [EntityType.Loot]: this.lootManager,
            [EntityType.Obstacle]: this.obstacleManager,
            [EntityType.Projectile]: this.projectileManager,
        });
    }

    async init(): Promise<void> {
        await this.loadAssets();
        this.ui.init();
        this.pixi.ticker.add(this.update.bind(this));
        this.pixi.renderer.on("resize", this.resize.bind(this));

        this.pixi.stage.addChild(this.camera.container, this.ui);

        if (DEBUG_ENABLED) {
            this.camera.addObject(debugRenderer.graphics);
        }

        this.resize();
        this.connect();
    }

    async loadAssets(): Promise<void> {
        this.audioManager.loadSounds();
        await this.resourceManager.loadAssets();
    }

    join(): void {
        const joinPacket = new JoinPacket();
        joinPacket.name = this.app.ui.nameInput.value;
        this.sendPacket(joinPacket);
    }

    connect(): void {
        const server = ClientConfig.servers[settings.get("server")];
        const address = `ws${server.https ? "s" : ""}://${server.address}/play`;

        this.resetGame();
        if (this.socket) {
            this.socket.onclose = () => {};
            this.socket.onmessage = () => {};
            this.socket.onerror = () => {};
            this.socket.close();
            this.socket = undefined;
        }

        this.socket = new WebSocket(address);

        this.socket.binaryType = "arraybuffer";

        this.socket.onmessage = (msg) => {
            this.onMessage(msg.data);
        };

        this.socket.onclose = () => {
            this.quitGame();
            this.resetGame();
            this.connect();
        };

        this.socket.onerror = (error) => {
            console.error(error);
            this.quitGame();
            this.resetGame();
            this.connect();
        };
    }

    resetGame() {
        this.entityManager.clear();
        this.playerManager.clear();
        this.particleManager.clear();
        this.ui.clear();
    }

    onMessage(data: ArrayBuffer): void {
        const packetStream = new PacketStream(data);
        while (true) {
            const packet = packetStream.deserializeServerPacket();
            if (packet === undefined) break;

            switch (true) {
                case packet instanceof JoinedPacket:
                    this.startGame(packet);
                    break;
                case packet instanceof UpdatePacket:
                    this.updateFromPacket(packet);
                    break;
                case packet instanceof DeathPacket:
                    this.ui.deathUi.show(
                        this.playerManager.getPlayerInfo(this.activePlayerID).name,
                        packet,
                    );
                    break;
                case packet instanceof MapPacket:
                    this.map.updateFromPacket(packet);
                    break;
                case packet instanceof KillPacket:
                    this.ui.killFeedUi.addMsg(
                        packet,
                        this.playerManager,
                        this.activePlayerID,
                    );
                    break;
                case packet instanceof PingPacket:
                    this.ui.debugUi.onPingPacket();
                    break;
                case packet instanceof DebugPacket:
                    this.ui.debugUi.updateServerInfo(packet);
                    break;
            }
        }
    }

    startGame(packet: JoinedPacket): void {
        if (this.inGame) return;
        this.app.ui.homeDiv.style.display = "none";
        this.ui.visible = true;
        this.inGame = true;
        this.ui.deathUi.hide();
        this.ui.debugUi.sendPingTicker = 0;

        this.activePlayerID = packet.playerId;
    }

    quitGame(): void {
        this.ui.visible = false;
        const ui = this.app.ui;
        ui.homeDiv.style.display = "";
        ui.playButton.disabled = false;
        this.inGame = false;
        const quitPacket = new QuitPacket();
        this.sendPacket(quitPacket);
    }

    lastUpdateTime = 0;
    serverDt = 0;

    /**
     * Process a game update packet
     */
    updateFromPacket(packet: UpdatePacket): void {
        this.serverDt = (Date.now() - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = Date.now();

        if (packet.playerDataDirty.zoom) {
            this.camera.zoom = packet.playerData.zoom;
        }

        for (let i = 0; i < packet.deletedEntities.length; i++) {
            const id = packet.deletedEntities[i];
            this.entityManager.deleteEntity(id);
        }

        for (let i = 0; i < packet.newPlayers.length; i++) {
            const newPlayer = packet.newPlayers[i];
            this.playerManager.playerInfos.set(newPlayer.id, {
                name: newPlayer.name,
            });
        }

        for (let i = 0; i < packet.deletedPlayers.length; i++) {
            this.playerManager.playerInfos.delete(packet.deletedPlayers[i]);
        }

        for (let i = 0; i < packet.fullEntities.length; i++) {
            const entityData = packet.fullEntities[i];
            assert(entityData.__type, "Invalid entity type");

            let entity: ClientEntity | undefined = this.entityManager.getById(
                entityData.id,
            );

            if (entity === undefined) {
                entity = this.entityManager.createEntity(
                    entityData.__type,
                    entityData.id,
                    entityData.data,
                );
            } else {
                this.entityManager.updateFullEntity(entityData.id, entityData.data);
            }
        }

        for (let i = 0; i < packet.partialEntities.length; i++) {
            const entityData = packet.partialEntities[i];
            this.entityManager.updatePartialEntity(entityData.id, entityData.data);
        }

        this.ui.updateUi(packet.playerData, packet.playerDataDirty);

        for (let i = 0; i < packet.bullets.length; i++) {
            this.bulletManager.fireBullet(packet.bullets[i]);
        }

        for (let i = 0; i < packet.explosions.length; i++) {
            const explosion = packet.explosions[i];
            this.explosionManager.addExplosion(explosion.type, explosion.position);
        }

        for (let i = 0; i < packet.shots.length; i++) {
            const shot = packet.shots[i];
            const player = this.entityManager.getById(shot.id);
            if (player?.__type !== EntityType.Player) continue;
            (player as Player).shootEffect(shot.weapon);
        }

        if (packet.leaderboardDirty) {
            this.ui.leaderBoardUi.update(
                packet.leaderboard,
                this.playerManager,
                this.activePlayerID,
            );
        }

        if (packet.cameraPositionDirty) {
            this.camera.position = packet.cameraPosition;
        } else if (this.activePlayer) {
            this.camera.position = this.activePlayer.position;
        }
    }

    sendPacket(packet: Packet) {
        if (this.socket && this.socket.readyState === this.socket.OPEN) {
            const packetStream = PacketStream.alloc(128);
            packetStream.serializeClientPacket(packet);
            this.socket.send(packetStream.getBuffer());
        }
    }

    resize(): void {
        this.camera.resize();
        this.ui.resize();
    }

    now = Date.now();

    deltaTimes: number[] = [];
    fpsTicker = 0;
    fps = 0;

    update(): void {
        const now = Date.now();
        const dt = (now - this.now) / 1000;
        this.now = now;

        this.deltaTimes.push(dt);
        this.fpsTicker += dt;

        this.inputManager.update(dt);
        this.entityManager.update(dt);
        this.bulletManager.update(dt);
        this.particleManager.update(dt);
        this.explosionManager.update(dt);
        this.audioManager.update();

        this.camera.render(dt);
        this.ui.render(dt);
        debugRenderer.render();

        debugRenderer.flush();

        if (this.fpsTicker > 2) {
            this.fpsTicker = 0;
            const avgDt = this.deltaTimes.reduce((a, b) => a + b) / this.deltaTimes.length;
            this.fps = Math.round(1 / avgDt);
            this.deltaTimes.length = 0;
        }
    }
}
