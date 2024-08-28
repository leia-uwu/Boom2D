import type { ServerWebSocket } from "bun";
import { GameConstants } from "../../common/src/constants";
import { type Packet, PacketStream } from "../../common/src/net";
import { DebugPacket } from "../../common/src/packets/debugPacket";
import { DebugTogglePacket } from "../../common/src/packets/debugTogglePacket";
import { InputPacket } from "../../common/src/packets/inputPacket";
import { JoinPacket } from "../../common/src/packets/joinPacket";
import { PingPacket } from "../../common/src/packets/pingPacket";
import { QuitPacket } from "../../common/src/packets/quitPacket";
import { RespawnPacket } from "../../common/src/packets/respawnPacket";
import { UpdatePacket } from "../../common/src/packets/updatePacket";
import { RectHitbox } from "../../common/src/utils/hitbox";
import { MathUtils } from "../../common/src/utils/math";
import { Random } from "../../common/src/utils/random";
import { Vec2, type Vector } from "../../common/src/utils/vector";
import type { ServerEntity } from "./entities/entity";
import type { Player } from "./entities/player";
import type { Game } from "./game";
import type { ClientData } from "./server";

export class ClientManager {
    clients: Client[] = [];
    game: Game;

    zoom = 1;

    constructor(game: Game) {
        this.game = game;
    }

    sendPackets(dt: number) {
        for (let i = 0; i < this.clients.length; i++) {
            const client = this.clients[i];
            // ignore disconnected sockets
            if (client.socket.readyState !== 1) continue;
            client.sendPackets(dt);
        }
    }

    addClient(socket: ServerWebSocket<ClientData>) {
        const client = new Client(this.game, socket);
        this.clients.push(client);
        socket.data.client = client;
        return client;
    }

    removeClient(socket: ServerWebSocket<ClientData>) {
        const client = socket.data.client;
        this.clients.splice(this.clients.indexOf(client), 1);
        if (client.player) {
            client.game.playerManager.removePlayer(client.player);
        }
    }
}

export class Client {
    game: Game;
    socket: ServerWebSocket<ClientData>;
    position: Vector;

    speed = 4;
    direction = Random.unitVector();

    player?: Player;
    zoom: number = GameConstants.player.defaultZoom;

    debug = false;

    constructor(game: Game, socket: ServerWebSocket<ClientData>) {
        this.game = game;
        this.socket = socket;
        this.position = Random.vector(0, game.map.width, 0, game.map.height);
    }

    processPacket(buff: ArrayBuffer) {
        const packetStream = new PacketStream(buff);

        const packet = packetStream.deserializeClientPacket();
        if (packet === undefined) return;

        let player = this.player;

        if (!player && packet instanceof JoinPacket) {
            this.player = this.game.playerManager.addPlayer(this, packet);
            return;
        }

        if (!player) return;

        switch (true) {
            case packet instanceof InputPacket: {
                player.processInput(packet);
                break;
            }
            case packet instanceof RespawnPacket: {
                if (!player.dead) break;
                this.game.playerManager.resetPlayer(player);
                break;
            }
            case packet instanceof QuitPacket: {
                this.game.playerManager.removePlayer(player);
                this.player = undefined;
                break;
            }
            case packet instanceof PingPacket: {
                const stream = new PacketStream(new ArrayBuffer(1));
                stream.serializeServerPacket(new PingPacket());
                this.sendData(stream.getBuffer());
                break;
            }
            case packet instanceof DebugTogglePacket: {
                if (this.game.config.allowDebugging) {
                    this.debug = packet.enable;
                }
                break;
            }
        }
    }

    firstPacket = true;
    visibleEntities = new Set<ServerEntity>();
    sendPackets(dt: number) {
        const game = this.game;
        // calculate visible, deleted, and dirty entities
        // and send them to the client
        const updatePacket = new UpdatePacket();

        const radius = this.zoom + 10;
        const rect = RectHitbox.fromCircle(radius, this.position);

        const newVisibleEntities = game.grid.intersectsHitbox(rect);

        for (const entity of this.visibleEntities) {
            if (!newVisibleEntities.has(entity)) {
                updatePacket.deletedEntities.push(entity.id);
            }
        }

        for (const entity of newVisibleEntities) {
            if (
                !this.visibleEntities.has(entity) ||
                game.entityManager.dirtyFull[entity.id]
            ) {
                updatePacket.serverFullEntities.push(entity);
            } else if (game.entityManager.dirtyPart[entity.id]) {
                updatePacket.serverPartialEntities.push(entity);
            }
        }

        this.visibleEntities = newVisibleEntities;

        if (this.player) {
            updatePacket.playerData = this.player;
            updatePacket.playerDataDirty = this.player.dirty;
        } else {
            updatePacket.cameraPositionDirty = true;

            this.position = Vec2.add(
                this.position,
                Vec2.mul(this.direction, this.speed * dt)
            );

            updatePacket.cameraPosition = this.position;

            if (this.position.x < 0 || this.position.x > this.game.map.width) {
                this.direction.x = -this.direction.x;
            }
            if (this.position.y < 0 || this.position.y > this.game.map.height) {
                this.direction.y = -this.direction.y;
            }
            this.position.x = MathUtils.clamp(this.position.x, 0, this.game.map.width);
            this.position.y = MathUtils.clamp(this.position.y, 0, this.game.map.height);
        }

        updatePacket.newPlayers = this.firstPacket
            ? game.playerManager.players
            : game.playerManager.newPlayers;

        updatePacket.deletedPlayers = game.playerManager.deletedPlayers;

        for (let i = 0; i < game.bulletManager.newBullets.length; i++) {
            const bullet = game.bulletManager.newBullets[i];
            if (
                rect.isPointInside(bullet.initialPosition) ||
                rect.isPointInside(bullet.finalPosition) ||
                rect.intersectsLine(bullet.initialPosition, bullet.finalPosition)
            ) {
                updatePacket.bullets.push(bullet);
            }
        }

        for (let i = 0; i < game.explosionManager.explosions.length; i++) {
            const explosion = game.explosionManager.explosions[i];
            if (
                rect.isPointInside(explosion.position) ||
                rect.collidesWith(explosion.hitbox)
            ) {
                updatePacket.explosions.push(explosion);
            }
        }

        for (let i = 0; i < game.bulletManager.shots.length; i++) {
            const shot = game.bulletManager.shots[i];
            const player = game.entityManager.getById(shot.id);
            if (player && rect.isPointInside(player.position)) {
                updatePacket.shots.push(shot);
            }
        }

        if (this.firstPacket || this.game.playerManager.leaderBoardDirty) {
            updatePacket.leaderboardDirty = true;
            updatePacket.leaderboard = this.game.playerManager.leaderBoard;
        }
        this.packetStream.serializeServerPacket(updatePacket);

        if (this.debug) {
            const debugPacket = new DebugPacket();
            debugPacket.tps = game.tps;
            debugPacket.mspt = game.mspt;
            debugPacket.entities = game.entityManager.entities.length;
            debugPacket.players = game.playerManager.players.length;
            debugPacket.bullets = game.bulletManager.activeCount;
            this.sendPacket(debugPacket);
        }

        if (this.firstPacket) {
            const mapStream = game.map.serializedData.stream;
            this.packetStream.stream.writeBytes(mapStream, 0, mapStream.byteIndex);
        }

        this.packetStream.stream.writeBytes(
            this.game.packetStream.stream,
            0,
            this.game.packetStream.stream.byteIndex
        );

        const buffer = this.packetStream.getBuffer();
        this.sendData(buffer);

        this.firstPacket = false;
        this.packetStream.stream.index = 0;
    }

    packetStream = PacketStream.alloc(1 << 16);

    sendPacket(packet: Packet): void {
        this.packetStream.serializeServerPacket(packet);
    }

    sendData(data: ArrayBuffer | Buffer): void {
        try {
            this.socket.sendBinary(data);
        } catch (error) {
            console.error("Error sending data:", error);
        }
    }
}
