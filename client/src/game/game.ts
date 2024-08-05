import type { Application } from "pixi.js";
import { EntityType } from "../../../common/src/constants";
import { type Packet, PacketStream } from "../../../common/src/net";
import { DeathPacket } from "../../../common/src/packets/deathPacket";
import { JoinPacket } from "../../../common/src/packets/joinPacket";
import { MapPacket } from "../../../common/src/packets/mapPacke";
import { UpdatePacket } from "../../../common/src/packets/updatePacket";
import { assert } from "../../../common/src/utils/util";
import type { App } from "../main";
import { AudioManager } from "./audioManager";
import { BulletManager } from "./bullet";
import { Camera } from "./camera";
import { type ClientEntity, EntityManager } from "./entities/entity";
import { Loot } from "./entities/loot";
import { Obstacle } from "./entities/obstacle";
import { Player } from "./entities/player";
import { Projectile } from "./entities/projectile";
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

    running = false;

    entityManager = new EntityManager(this, {
        [EntityType.Player]: Player,
        [EntityType.Loot]: Loot,
        [EntityType.Obstacle]: Obstacle,
        [EntityType.Projectile]: Projectile
    });

    activePlayerID = 0;

    get activePlayer(): Player | undefined {
        return this.entityManager.getById(this.activePlayerID) as Player;
    }

    playerNames = new Map<number, string>();

    resourceManager = new ResourceManager();
    ui = new GameUi(this);
    camera = new Camera(this);
    map = new GameMap(this);
    inputManager = new InputManager(this);
    audioManager = new AudioManager(this);
    particleManager = new ParticleManager(this);
    bulletManager = new BulletManager(this);
    explosionManager = new ExplosionManager(this);

    constructor(app: App) {
        this.app = app;
        this.pixi = app.pixi;
    }

    async init(): Promise<void> {
        await this.loadAssets();
        this.ui.init();
        this.pixi.ticker.add(this.render.bind(this));
        this.pixi.renderer.on("resize", this.resize.bind(this));

        this.pixi.stage.addChild(this.camera.container, this.ui);

        this.resize();
    }

    async loadAssets(): Promise<void> {
        this.audioManager.loadSounds();
        await this.resourceManager.loadAssets();
    }

    connect(address: string): void {
        this.app.ui.playButton.disabled = true;

        this.socket = new WebSocket(address);

        this.socket.binaryType = "arraybuffer";

        this.socket.onmessage = (msg) => {
            this.onMessage(msg.data);
        };

        this.socket.onopen = () => {
            const joinPacket = new JoinPacket();
            joinPacket.name = this.app.ui.nameInput.value;
            this.sendPacket(joinPacket);
        };

        this.socket.onclose = () => {
            this.endGame();
        };

        this.socket.onerror = (error) => {
            console.error(error);
            this.endGame();
        };
    }

    onMessage(data: ArrayBuffer): void {
        const packetStream = new PacketStream(data);
        while (true) {
            const packet = packetStream.deserializeServerPacket();
            if (packet === undefined) break;

            switch (true) {
                case packet instanceof UpdatePacket:
                    this.updateFromPacket(packet);
                    this.startGame();
                    break;
                case packet instanceof DeathPacket:
                    this.ui.deathUi.show(
                        this.playerNames.get(this.activePlayerID)!,
                        packet
                    );
                    break;
                case packet instanceof MapPacket:
                    this.map.updateFromPacket(packet);
                    break;
            }
        }
    }

    startGame(): void {
        if (this.running) return;
        this.app.ui.homeDiv.style.display = "none";
        this.ui.visible = true;
        this.running = true;
        this.particleManager.init();
        this.ui.deathUi.hide();
    }

    endGame(): void {
        if (this.socket?.readyState !== this.socket?.CLOSED) {
            this.socket?.close();
        }
        this.ui.visible = false;
        const ui = this.app.ui;
        ui.homeDiv.style.display = "";
        ui.playButton.disabled = false;
        this.running = false;

        // reset stuff
        this.entityManager.clear();
        this.camera.clear();
        this.particleManager.clear();
        this.ui.deathUi.hide();
    }

    lastUpdateTime = 0;
    serverDt = 0;

    /**
     * Process a game update packet
     */
    updateFromPacket(packet: UpdatePacket): void {
        this.serverDt = (Date.now() - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = Date.now();

        if (packet.playerDataDirty.id) {
            this.activePlayerID = packet.playerData.id;
        }

        if (packet.playerDataDirty.zoom) {
            this.camera.zoom = packet.playerData.zoom;
        }

        for (let i = 0; i < packet.deletedEntities.length; i++) {
            const id = packet.deletedEntities[i];
            this.entityManager.deleteEntity(id);
        }

        for (let i = 0; i < packet.newPlayers.length; i++) {
            const newPlayer = packet.newPlayers[i];
            this.playerNames.set(newPlayer.id, newPlayer.name);
        }

        for (let i = 0; i < packet.deletedPlayers.length; i++) {
            this.playerNames.delete(packet.deletedPlayers[i]);
        }

        for (let i = 0; i < packet.fullEntities.length; i++) {
            const entityData = packet.fullEntities[i];
            assert(entityData.__type, "Invalid entity type");

            let entity: ClientEntity | undefined = this.entityManager.getById(
                entityData.id
            );

            if (entity === undefined) {
                entity = this.entityManager.createEntity(
                    entityData.__type,
                    entityData.id,
                    entityData.data
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
                this.playerNames,
                this.activePlayerID
            );
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

    render(): void {
        if (!this.running) return;

        const now = Date.now();
        const dt = (now - this.now) / 1000;
        this.now = now;

        this.ui.render(dt);

        this.entityManager.render(dt);
        this.bulletManager.tick(dt);

        this.particleManager.render(dt);
        this.explosionManager.render(dt);

        if (this.activePlayer) {
            this.camera.position = this.activePlayer.container.position;
        }
        this.audioManager.update();
        this.camera.render();
        this.inputManager.update(dt);
    }
}
