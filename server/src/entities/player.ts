import type { ServerWebSocket } from "bun";
import { EntityType, GameConstants } from "../../../common/src/constants";
import { type AmmoDefKey, AmmoDefs } from "../../../common/src/defs/ammoDefs";
import { type LootDef, LootDefs } from "../../../common/src/defs/lootDefs";
import type { WeaponDefKey } from "../../../common/src/defs/weaponDefs";
import { type Packet, PacketStream } from "../../../common/src/net";
import { DeathPacket } from "../../../common/src/packets/deathPacket";
import { InputPacket } from "../../../common/src/packets/inputPacket";
import { JoinPacket } from "../../../common/src/packets/joinPacket";
import { KillPacket } from "../../../common/src/packets/killPacket";
import { RespawnPacket } from "../../../common/src/packets/respawnPacket";
import {
    type EntitiesNetData,
    type LeaderboardEntry,
    UpdatePacket
} from "../../../common/src/packets/updatePacket";
import { CircleHitbox, RectHitbox } from "../../../common/src/utils/hitbox";
import { MathUtils } from "../../../common/src/utils/math";
import { Random } from "../../../common/src/utils/random";
import { Vec2, type Vector } from "../../../common/src/utils/vector";
import type { Game } from "../game";
import type { PlayerData } from "../server";
import { WeaponManager } from "../weaponManager";
import { ServerEntity } from "./entity";
import type { Loot } from "./loot";
import { Obstacle } from "./obstacle";

export class PlayerManager {
    players: Player[] = [];

    newPlayers: Player[] = [];
    deletedPlayers: number[] = [];

    leaderBoardDirty = true;
    leaderBoard: LeaderboardEntry[] = [];

    constructor(readonly game: Game) {}

    addPlayer(socket: ServerWebSocket<PlayerData>, joinPacket: JoinPacket): Player {
        const player = new Player(
            this.game,
            socket,
            joinPacket.name.trim() || GameConstants.player.defaultName
        );
        this.game.entityManager.register(player);

        this.newPlayers.push(player);
        this.players.push(player);
        this.newPlayers.push(player);

        this.resetPlayer(player);
        this.updateLeaderBoard();

        this.game.logger.log(`"${player.name}" joined the game`);
        return player;
    }

    resetPlayer(player: Player) {
        player.position = Random.vector(0, this.game.map.width, 0, this.game.map.height);
        player.health = GameConstants.player.defaultHealth;
        player.armor = GameConstants.player.defaultArmor;
        player.dead = false;
        this.game.grid.updateEntity(player);
        player.setFullDirty();
    }

    removePlayer(player: Player): void {
        player.destroy();
        this.deletedPlayers.push(player.id);
        this.game.logger.log(`"${player.name}" left game`);
    }

    sendPackets() {
        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i];
            // ignore disconnected sockets
            if (player.socket.readyState !== 1) continue;
            player.sendPackets();
        }
    }

    processPacket(buff: ArrayBuffer, socket: ServerWebSocket<PlayerData>) {
        const packetStream = new PacketStream(buff);

        const packet = packetStream.deserializeClientPacket();
        if (packet === undefined) return;

        let player = socket.data.entity;

        if (!player && packet instanceof JoinPacket) {
            socket.data.entity = this.addPlayer(socket, packet);
            return;
        }

        if (!player) {
            socket.close();
            return;
        }

        switch (true) {
            case packet instanceof InputPacket: {
                player.processInput(packet);
                break;
            }
            case packet instanceof RespawnPacket: {
                if (!player.dead) break;
                this.resetPlayer(player);
                break;
            }
        }
    }

    updateLeaderBoard() {
        const count = Math.min(this.players.length, GameConstants.leaderboardMaxEntries);

        const newBoard = [...this.players]
            .sort((a, b) => {
                return b.kills - a.kills;
            })
            .map((p) => {
                return {
                    kills: p.kills,
                    playerId: p.id
                };
            })
            .slice(0, count);

        if (this.isLeaderBoardDirty(newBoard)) {
            this.leaderBoardDirty = true;
            this.leaderBoard = newBoard;
        }
    }

    isLeaderBoardDirty(newBoard: LeaderboardEntry[]) {
        if (this.leaderBoard.length !== newBoard.length) {
            return true;
        }
        for (let i = 0; i < newBoard.length; i++) {
            const newItem = newBoard[i];
            const oldItem = this.leaderBoard[i];
            if (oldItem.kills !== newItem.kills) return true;
            if (oldItem.playerId !== newItem.playerId) return true;
        }
        return false;
    }

    flush() {
        this.deletedPlayers.length = 0;
        this.newPlayers.length = 0;
        this.leaderBoardDirty = false;

        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i];
            for (const key in player.dirty) {
                player.dirty[key as keyof Player["dirty"]] = false;
            }

            // delete unregistered players
            if (!player.__type) {
                this.players.splice(i, 1);
                continue;
            }
        }
    }
}

export class Player extends ServerEntity {
    readonly __type = EntityType.Player;
    readonly hitbox = new CircleHitbox(GameConstants.player.radius);

    socket: ServerWebSocket<PlayerData>;
    name = "";

    direction = Vec2.new(0, 0);

    mouseDown = false;

    moveLeft = false;
    moveRight = false;
    moveUp = false;
    moveDown = false;

    private _health: number = GameConstants.player.defaultHealth;

    get health(): number {
        return this._health;
    }

    set health(health: number) {
        if (health === this._health) return;
        this._health = MathUtils.clamp(health, 0, GameConstants.player.maxHealth);
        this.dirty.health = true;
    }

    private _armor: number = GameConstants.player.defaultArmor;

    get armor(): number {
        return this._armor;
    }

    set armor(armor: number) {
        if (armor === this._armor) return;
        this._armor = MathUtils.clamp(armor, 0, GameConstants.player.maxHealth);
        this.dirty.armor = true;
    }

    readonly weaponManager = new WeaponManager(this);

    weapons: Record<WeaponDefKey, boolean> = {
        pistol: true,
        shotgun: false,
        ak: false,
        rocket_launcher: false,
        plasma_rifle: false,
        bfg: false
    };

    ammo: Record<AmmoDefKey, number> = {
        bullet: 50,
        shell: 0,
        rocket: 0,
        cell: 0
    };

    activeWeapon: WeaponDefKey = "pistol";

    dead = false;

    kills = 0;
    damageDone = 0;
    damageTaken = 0;

    firstPacket = true;

    /**
     * Entities the player can see
     */
    visibleEntities = new Set<ServerEntity>();

    // what needs to be sent again to the client
    readonly dirty = {
        id: true,
        zoom: true,
        health: true,
        armor: true,
        weapons: true,
        ammo: true
    };

    private _zoom: number = GameConstants.player.defaultZoom;

    get zoom(): number {
        return this._zoom;
    }

    set zoom(zoom: number) {
        if (this._zoom === zoom) return;
        this._zoom = zoom;
        this.dirty.zoom = true;
    }

    get position(): Vector {
        return this.hitbox.position;
    }

    set position(pos: Vector) {
        this.hitbox.position = pos;
        this._position = pos;
    }

    constructor(game: Game, socket: ServerWebSocket<PlayerData>, name: string) {
        const pos = Vec2.new(0, 0);
        super(game, pos);
        this.position = pos;
        this.socket = socket;
        this.name = name;
    }

    tick(dt: number): void {
        if (this.dead) return;

        const oldPos = Vec2.clone(this.position);

        const movement = Vec2.new(0, 0);
        if (this.moveUp) movement.y--;
        if (this.moveDown) movement.y++;
        if (this.moveLeft) movement.x--;
        if (this.moveRight) movement.x++;

        if (movement.x * movement.y !== 0) {
            // If the product is non-zero, then both of the components must be non-zero
            movement.x *= Math.SQRT1_2;
            movement.y *= Math.SQRT1_2;
        }

        this.position = Vec2.add(
            this.position,
            Vec2.mul(movement, GameConstants.player.speed * dt)
        );

        const entities = this.game.grid.intersectsHitbox(this.hitbox);

        for (const entity of entities) {
            if (!(entity instanceof Player || entity instanceof Obstacle)) continue;
            if (entity === this) continue;

            const collision = this.hitbox.getIntersection(entity.hitbox);
            if (collision) {
                this.position = Vec2.sub(
                    this.position,
                    Vec2.mul(collision.dir, collision.pen)
                );
            }
        }

        const wallsAndFloors = this.game.map.intersectsHitbox(this.hitbox);

        for (const wall of wallsAndFloors.walls) {
            const collision = this.hitbox.getIntersection(wall.hitbox);
            if (collision) {
                this.position = Vec2.sub(
                    this.position,
                    Vec2.mul(collision.dir, collision.pen)
                );
            }
        }

        const rad = this.hitbox.radius;
        this.position.x = MathUtils.clamp(
            this.position.x,
            rad,
            this.game.map.width - rad
        );
        this.position.y = MathUtils.clamp(
            this.position.y,
            rad,
            this.game.map.height - rad
        );

        this.weaponManager.tick(dt);

        for (const entity of entities) {
            if (!entity.hitbox.collidesWith(this.hitbox)) continue;

            if (entity.__type === EntityType.Loot) {
                this.pickupLoot(entity as Loot);
            }
        }

        if (!Vec2.equals(this.position, oldPos)) {
            this.setDirty();
            this.game.grid.updateEntity(this);
        }
    }

    pickupLoot(loot: Loot) {
        if (!loot.canPickup) return;

        const def = LootDefs.typeToDef(loot.type) as LootDef;

        let sucess = false;

        switch (def.type) {
            case "gun": {
                const weapType = loot.type as WeaponDefKey;
                if (!this.weapons[weapType]) {
                    this.weapons[weapType] = true;
                    this.dirty.weapons = true;
                    sucess = true;
                }
                break;
            }
            case "ammo-pickup": {
                for (const ammo in AmmoDefs.definitions) {
                    const amount = def.ammo[ammo as AmmoDefKey];
                    if (amount !== undefined) {
                        this.ammo[ammo as AmmoDefKey] += amount;
                    }
                }
                this.dirty.ammo = true;
                sucess = true;
                break;
            }
            case "powerup": {
                if (def.health && this.health < def.maxHealth) {
                    this.health += def.health;
                    this.health = MathUtils.min(this.health, def.maxHealth);
                    sucess = true;
                }

                if (def.armor && this.armor < def.maxArmor) {
                    this.armor += def.armor;
                    this.armor = MathUtils.min(this.armor, def.maxArmor);
                    sucess = true;
                }

                break;
            }
        }

        if (sucess) {
            loot.canPickup = false;
            loot.setDirty();
        }
    }

    damage(amount: number, source: Player) {
        if (this.dead) return;

        if (this.health - amount > GameConstants.player.maxHealth) {
            amount = -(GameConstants.player.maxHealth - this.health);
        }

        if (this.health - amount <= 0) {
            amount = this.health;
        }

        if (amount < 0) amount = 0;

        amount = Math.round(amount);

        this.health -= amount;

        if (source !== this) {
            source.damageDone += amount;
        }
        this.damageTaken += amount;

        if (this.health <= 0) {
            this.dead = true;
            this.setFullDirty();

            if (source !== this) {
                source.kills++;
            }
            this.game.playerManager.updateLeaderBoard();

            const deathPacket = new DeathPacket();
            deathPacket.kills = this.kills;
            deathPacket.damageDone = this.damageDone;
            deathPacket.damageTaken = this.damageTaken;
            this.sendPacket(deathPacket);

            const killPacket = new KillPacket();
            killPacket.killedId = this.id;
            killPacket.killerId = source.id;
            this.game.sendPacket(killPacket);
        }
    }

    sendPackets() {
        const game = this.game;
        // calculate visible, deleted, and dirty entities
        // and send them to the client
        const updatePacket = new UpdatePacket();

        const radius = this.zoom + 10;
        const rect = RectHitbox.fromCircle(radius, this.position);

        const newVisibleEntities = game.grid.intersectsHitbox(rect);

        newVisibleEntities.add(this);

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

        updatePacket.playerData = this;
        updatePacket.playerDataDirty = this.dirty;

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

        this.packetStream.stream.index = 0;
        this.packetStream.serializeServerPacket(updatePacket);

        if (this.firstPacket) {
            const mapStream = game.map.serializedData.stream;
            this.packetStream.stream.writeBytes(mapStream, 0, mapStream.byteIndex);
        }

        for (const packet of this.packetsToSend) {
            this.packetStream.serializeServerPacket(packet);
        }

        this.packetStream.stream.writeBytes(
            this.game.packetStream.stream,
            0,
            this.game.packetStream.stream.byteIndex
        );

        this.packetsToSend.length = 0;
        const buffer = this.packetStream.getBuffer();
        this.sendData(buffer);

        this.firstPacket = false;
    }

    packetStream = PacketStream.alloc(1 << 16);

    readonly packetsToSend: Packet[] = [];

    sendPacket(packet: Packet): void {
        this.packetsToSend.push(packet);
    }

    sendData(data: ArrayBuffer | Buffer): void {
        try {
            this.socket.sendBinary(data);
        } catch (error) {
            console.error("Error sending data:", error);
        }
    }

    processInput(packet: InputPacket): void {
        if (this.dead) return;
        // if the direction changed set to dirty
        if (!Vec2.equals(this.direction, packet.direction)) {
            this.setDirty();
        }
        this.moveLeft = packet.moveLeft;
        this.moveRight = packet.moveRight;
        this.moveUp = packet.moveUp;
        this.moveDown = packet.moveDown;

        this.direction = packet.direction;
        this.mouseDown = packet.mouseDown;

        if (this.weapons[packet.weaponToSwitch]) {
            this.weaponManager.weaponToSwitch = packet.weaponToSwitch;
        }
    }

    get data(): Required<EntitiesNetData[EntityType.Player]> {
        return {
            position: this.position,
            direction: this.direction,
            full: {
                activeWeapon: this.activeWeapon,
                dead: this.dead
            }
        };
    }
}
