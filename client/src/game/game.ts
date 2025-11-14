import { EntityType, GameConstants } from "@common/constants";
import { type Packet, PacketStream } from "@common/net";
import { DeathPacket } from "@common/packets/deathPacket";
import { DebugPacket } from "@common/packets/debugPacket";
import { JoinedPacket } from "@common/packets/joinedPacket";
import { JoinPacket } from "@common/packets/joinPacket";
import { KillPacket } from "@common/packets/killPacket";
import { MapPacket } from "@common/packets/mapPacket";
import { QuitPacket } from "@common/packets/quitPacket";
import { UpdatePacket } from "@common/packets/updatePacket";
import { MathUtils } from "@common/utils/math";
import { assert } from "@common/utils/util";
import type * as PIXI from "pixi.js";
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
import { hitParticleManager } from "./hitParticles";
import { InputManager } from "./inputManager";
import { GameMap } from "./map";
import { ParticleManager } from "./particle";
import { ResourceManager } from "./resourceManager";
import { GameUi } from "./ui/gameUi";

export class Game {
    app: App;
    socket?: WebSocket;
    pixi: PIXI.Application;

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
    hitManager = new hitParticleManager();
    bulletManager = new BulletManager(this);
    explosionManager = new ExplosionManager(this);

    playerManager = new PlayerManager();
    lootManager = new LootManager();
    obstacleManager = new ObstacleManager();
    projectileManager = new ProjectileManager();

    entityManager: EntityManager;

    ping = 0;

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
        this.inputManager.init();
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
        const now = performance.now();
        this.serverDt = (now - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = now;

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

        for (let i = 0; i < packet.hits.length; i++) {
            this.hitManager.addHit(packet.hits[i], this.camera);
        }

        if (packet.cameraPositionDirty) {
            this.camera.position = packet.cameraPosition;
        } else if (this.activePlayer) {
            this.camera.position = this.activePlayer.position;
        }

        if (
            packet.updateSequence === this.inputManager.inputSequence
            && this.inputManager.sequenceInFlight
        ) {
            this.inputManager.sequenceInFlight = false;
            const now = performance.now();
            this.ping = now - this.inputManager.lastSequenceTime;
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

    deltaTimes: number[] = [];
    fpsTicker = 0;
    fps = 0;

    update(ticker: PIXI.Ticker): void {
        const dt = MathUtils.clamp(ticker.deltaMS / 1000, 0.001, 1 / 8) * GameConstants.gameSpeed;

        this.deltaTimes.push(dt);
        this.fpsTicker += dt;

        this.inputManager.update(dt);
        this.entityManager.update(dt);
        this.bulletManager.update(dt);
        this.particleManager.update(dt);
        this.hitManager.update(dt);
        this.explosionManager.update(dt);
        this.audioManager.update();

        this.camera.render(dt);
        this.ui.render(dt);
        debugRenderer.render();

        debugRenderer.flush();
        this.inputManager.flushInputs();

        if (this.fpsTicker > 2) {
            this.fpsTicker = 0;
            const avgDt = this.deltaTimes.reduce((a, b) => a + b) / this.deltaTimes.length;
            this.fps = Math.round(1 / avgDt);
            this.deltaTimes.length = 0;
        }
    }
}
