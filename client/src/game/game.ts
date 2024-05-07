import { GameBitStream, type Packet, PacketStream } from "../../../common/src/net";
import { type Application, Assets } from "pixi.js";
import { UpdatePacket } from "../../../common/src/packets/updatePacket";
import { EntityPool } from "../../../common/src/utils/entityPool";
import { type ClientEntity } from "./entities/entity";
import { Player } from "./entities/player";
import { Camera } from "./camera";
import { InputManager } from "./inputManager";
import { JoinPacket } from "../../../common/src/packets/joinPacket";
import { Projectile } from "./entities/projectile";
import { type App } from "../main";
import { GameOverPacket } from "../../../common/src/packets/gameOverPacket";
import { GameUi } from "./gameUi";
import { ParticleManager } from "./particle";
import { AudioManager } from "./audioManager";
import { EntityType } from "../../../common/src/constants";
import { Obstacle } from "./entities/obstacle";
import { BulletManager } from "./bullet";
import { WeaponDefs } from "../../../common/src/defs/weaponDefs";
import { MapPacket } from "../../../common/src/packets/mapPacke";
import { GameMap } from "./map";
import { ExplosionManager } from "./explosion";

export class Game {
    app: App;
    socket?: WebSocket;
    pixi: Application;

    running = false;

    entities = new EntityPool<ClientEntity>();

    activePlayerID = -1;

    get activePlayer(): Player | undefined {
        return this.entities.get(this.activePlayerID) as Player;
    }

    playerNames = new Map<number, string>();

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
        this.ui.setupUi();
    }

    async init(): Promise<void> {
        await this.loadAssets();
        this.pixi.ticker.add(this.render.bind(this));
        this.pixi.renderer.on("resize", this.resize.bind(this));
        this.pixi.stage.addChild(this.camera.container);
        this.camera.resize();
    }

    async loadAssets(): Promise<void> {
        // imports all svg assets from public dir
        // and sets an alias with the file name
        // so for example you can just do:
        // new Sprite("player.svg")
        // instead of:
        // new Sprite("./game/img/player.svg")

        const promises: Array<ReturnType<typeof Assets["load"]>> = [];
        const imgs = import.meta.glob("/public/game/img//**/*.svg");

        for (const file in imgs) {
            const path = file.split("/");
            const name = path[path.length - 1];
            const src = `.${file.replace("/public", "")}`;

            const promise = Assets.load({
                alias: name,
                src
            });
            promises.push(promise);
        }

        await Promise.all(promises);
    }

    connect(address: string): void {
        this.app.uiManager.playButton.disabled = true;

        this.socket = new WebSocket(address);

        this.socket.binaryType = "arraybuffer";

        this.socket.onmessage = msg => {
            this.onMessage(msg.data);
        };

        this.socket.onopen = () => {
            const joinPacket = new JoinPacket();
            joinPacket.name = this.app.uiManager.nameInput.value;
            this.sendPacket(joinPacket);
        };

        this.socket.onclose = () => {
            this.endGame();
        };

        this.socket.onerror = error => {
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
                case packet instanceof GameOverPacket:
                    this.ui.showGameOverScreen(packet);
                    break;
                case packet instanceof MapPacket:
                    this.map.updateFromPacket(packet);
                    break;
            }
        }
    }

    startGame(): void {
        if (this.running) return;
        const ui = this.app.uiManager;
        ui.gameDiv.style.display = "";
        ui.homeDiv.style.display = "none";
        this.running = true;
    }

    endGame(): void {
        if (this.socket?.readyState !== this.socket?.CLOSED) this.socket?.close();
        const ui = this.app.uiManager;
        ui.gameDiv.style.display = "none";
        ui.homeDiv.style.display = "";
        ui.playButton.disabled = false;
        this.running = false;

        // reset stuff
        for (const entity of this.entities) {
            entity.destroy();
        }
        this.entities.clear();
        this.camera.clear();
    }

    lastUpdateTime = 0;
    serverDt = 0;

    static typeToEntity = {
        [EntityType.Player]: Player,
        [EntityType.Projectile]: Projectile,
        [EntityType.Obstacle]: Obstacle
    };

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

        for (const id of packet.deletedEntities) {
            this.entities.get(id)?.destroy();
            this.entities.deleteByID(id);
        }

        for (const newPlayer of packet.newPlayers) {
            this.playerNames.set(newPlayer.id, newPlayer.name);
        }
        for (const id of packet.deletedPlayers) {
            this.playerNames.delete(id);
        }

        for (const entityData of packet.fullEntities) {
            let entity = this.entities.get(entityData.id);
            let isNew = false;

            if (!entity) {
                isNew = true;
                entity = new Game.typeToEntity[entityData.__type](this, entityData.id);
                this.entities.add(entity);
            }
            entity.updateFromData(entityData.data, isNew);
        }

        for (const entityPartialData of packet.partialEntities) {
            const entity = this.entities.get(entityPartialData.id);

            if (!entity) {
                console.warn(`Unknown partial dirty entity with ID ${entityPartialData.id}`);
                continue;
            }
            entity.updateFromData(entityPartialData.data, false);
        }

        this.ui.updateUi(packet.playerData, packet.playerDataDirty);

        for (const bulletParams of packet.bullets) {
            this.bulletManager.fireBullet(bulletParams);
        }

        for (const explosion of packet.explosions) {
            this.explosionManager.addExplosion(explosion.type, explosion.position);
        }

        for (const shot of packet.shots) {
            const player = this.entities.get(shot.id);
            if (!player) continue;
            const def = WeaponDefs.typeToDef(shot.weapon);
            this.audioManager.play(def.sfx.shoot, {
                position: player.position,
                maxRange: 96
            });
        }
    }

    sendPacket(packet: Packet) {
        if (this.socket && this.socket.readyState === this.socket.OPEN) {
            const packetStream = new PacketStream(GameBitStream.alloc(128));
            packetStream.serializeClientPacket(packet);
            this.socket.send(packetStream.getBuffer());
        }
    }

    resize(): void {
        this.camera.resize();
    }

    now = Date.now();

    render(): void {
        if (!this.running) return;

        const now = Date.now();
        const dt = (now - this.now) / 1000;
        this.now = now;

        for (const entity of this.entities) {
            entity.render(dt);
        }
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
