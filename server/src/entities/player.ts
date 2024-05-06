import { type WebSocket } from "uWebSockets.js";
import { ServerEntity } from "./entity";
import { type PlayerData } from "../server";
import { Vec2, type Vector } from "../../../common/src/utils/vector";
import { GameBitStream, type Packet, PacketStream } from "../../../common/src/net";
import { type Game } from "../game";
import { UpdatePacket, type EntitiesNetData } from "../../../common/src/packets/updatePacket";
import { CircleHitbox, RectHitbox } from "../../../common/src/utils/hitbox";
import { Random } from "../../../common/src/utils/random";
import { MathUtils } from "../../../common/src/utils/math";
import { InputPacket } from "../../../common/src/packets/inputPacket";
import { JoinPacket } from "../../../common/src/packets/joinPacket";
import { EntityType, GameConstants } from "../../../common/src/constants";
import { GameOverPacket } from "../../../common/src/packets/gameOverPacket";
import { Obstacle } from "./obstacle";
import { WeaponDefKey } from "../../../common/src/defs/weaponDefs";
import { WeaponManager } from "../weaponManager";

export class Player extends ServerEntity {
    readonly __type = EntityType.Player;
    readonly hitbox = new CircleHitbox(GameConstants.player.radius);

    socket: WebSocket<PlayerData>;
    name = "";

    direction = Vec2.new(0, 0);

    mouseDown = false;

    moveLeft = false;
    moveRight = false;
    moveUp = false;
    moveDown = false;

    private _health = GameConstants.player.defaultHealth;

    get health(): number {
        return this._health;
    }

    set health(health: number) {
        if (health === this._health) return;
        this._health = MathUtils.clamp(health, 0, GameConstants.player.maxHealth);
        this.dirty.health = true;
    }

    private _armor = GameConstants.player.defaultArmor;

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
        shotgun: true,
        ak: true,
        rocket_launcher: true,
        plasma_rifle: true
    };

    activeWeapon: WeaponDefKey = "pistol";

    dead = false;

    kills = 0;

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
        weapons: true
    };

    private _zoom = GameConstants.player.defaultZoom;

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

    constructor(game: Game, socket: WebSocket<PlayerData>) {
        const pos = Random.vector(0, game.map.width, 0, game.map.height);
        super(game, pos);
        this.position = pos;
        this.socket = socket;
    }

    tick(dt: number): void {
        const oldPos = Vec2.clone(this.position);

        const movement = Vec2.new(0, 0);
        if (this.moveUp) movement.y--;
        if (this.moveDown) movement.y++;
        if (this.moveLeft) movement.x--;
        if (this.moveRight) movement.x++;

        if (movement.x * movement.y !== 0) { // If the product is non-zero, then both of the components must be non-zero
            movement.x *= Math.SQRT1_2;
            movement.y *= Math.SQRT1_2;
        }

        this.position = Vec2.add(this.position, Vec2.mul(movement, GameConstants.player.speed * dt));

        const entities = this.game.grid.intersectsHitbox(this.hitbox);

        for (const entity of entities) {
            if (!(entity instanceof Player || entity instanceof Obstacle)) continue;
            if (entity === this) continue;

            const collision = this.hitbox.getIntersection(entity.hitbox);
            if (collision) {
                this.position = Vec2.sub(this.position, Vec2.mul(collision.dir, collision.pen));
            }
        }

        const rad = this.hitbox.radius;
        this.position.x = MathUtils.clamp(this.position.x, rad, this.game.map.width - rad);
        this.position.y = MathUtils.clamp(this.position.y, rad, this.game.map.height - rad);

        this.weaponManager.tick(dt);

        if (!Vec2.equals(this.position, oldPos)) {
            this.setDirty();
            this.game.grid.updateEntity(this);
        }
    }

    damage(amount: number, source: Player) {
        this.health -= amount;

        if (this.health <= 0) {
            this.dead = true;
            this.game.grid.remove(this);

            if (source !== this) {
                source.kills++;
            }

            const gameOverPacket = new GameOverPacket();
            gameOverPacket.kills = this.kills;
            this.sendPacket(gameOverPacket);
        }
    }

    sendPackets() {
        // calculate visible, deleted, and dirty entities
        // and send them to the client
        const updatePacket = new UpdatePacket();

        const radius = this.zoom + 10;
        const rect = RectHitbox.fromCircle(radius, this.position);
        const newVisibleEntities = this.game.grid.intersectsHitbox(rect);

        for (const entity of this.visibleEntities) {
            if (!newVisibleEntities.has(entity)) {
                updatePacket.deletedEntities.push(entity.id);
            }
        }

        for (const entity of newVisibleEntities) {
            if (!this.visibleEntities.has(entity)) {
                updatePacket.serverFullEntities.push(entity);
            }
        }

        for (const entity of this.game.fullDirtyEntities) {
            if (newVisibleEntities.has(entity)
                && !updatePacket.serverFullEntities.includes(entity)
                && !updatePacket.deletedEntities.includes(entity.id)) {
                updatePacket.serverFullEntities.push(entity);
            }
        }

        for (const entity of this.game.partialDirtyEntities) {
            if (newVisibleEntities.has(entity)
                && !updatePacket.serverFullEntities.includes(entity)
                && !updatePacket.deletedEntities.includes(entity.id)) {
                updatePacket.serverPartialEntities.push(entity);
            }
        }
        this.visibleEntities = newVisibleEntities;

        updatePacket.playerData = this;
        updatePacket.playerDataDirty = this.dirty;

        updatePacket.newPlayers = this.firstPacket ? [...this.game.players] : this.game.newPlayers;
        updatePacket.deletedPlayers = this.game.deletedPlayers;

        for (const bullet of this.game.bulletManager.newBullets) {
            if (rect.isPointInside(bullet.initialPosition)
                || rect.isPointInside(bullet.finalPosition)
                || rect.intersectsLine(bullet.initialPosition, bullet.finalPosition)) {
                updatePacket.bullets.push(bullet);
            }
        }

        for (const explosion of this.game.explosionManager.explosions) {
            if (rect.isPointInside(explosion.position) || rect.collidesWith(explosion.hitbox)) {
                updatePacket.explosions.push(explosion);
            }
        }
        for (const shot of this.game.shots) {
            const player = this.game.grid.getById(shot.id)!;
            if (rect.isPointInside(player.position)) {
                updatePacket.shots.push(shot);
            }
        }

        this.packetStream.stream.index = 0;
        this.packetStream.serializeServerPacket(updatePacket);

        if (this.firstPacket) {
            const mapStream = this.game.map.serializedData.stream;
            this.packetStream.stream.writeBytes(mapStream, 0, mapStream.byteIndex);
        }

        for (const packet of this.packetsToSend) {
            this.packetStream.serializeServerPacket(packet);
        }

        this.packetsToSend.length = 0;
        const buffer = this.packetStream.getBuffer();
        this.sendData(buffer);
        this.firstPacket = false;
    }

    packetStream = new PacketStream(GameBitStream.alloc(1 << 16));

    readonly packetsToSend: Packet[] = [];

    sendPacket(packet: Packet): void {
        this.packetsToSend.push(packet);
    }

    sendData(data: ArrayBuffer): void {
        try {
            this.socket.send(data, true, false);
        } catch (error) {
            console.error("Error sending data:", error);
        }
    }

    processMessage(message: ArrayBuffer): void {
        const packetStream = new PacketStream(message);

        const packet = packetStream.deserializeClientPacket();

        if (packet === undefined) return;

        switch (true) {
            case packet instanceof JoinPacket: {
                this.join(packet);
                break;
            }
            case packet instanceof InputPacket: {
                this.processInput(packet);
                break;
            }
        }
    }

    join(packet: JoinPacket): void {
        this.name = packet.name.trim();
        if (!this.name) this.name = GameConstants.player.defaultName;

        this.socket.getUserData().joined = true;
        this.game.players.add(this);
        this.game.grid.addEntity(this);

        console.log(`"${this.name}" joined the game`);
    }

    processInput(packet: InputPacket): void {
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

        if (packet.weaponToSwitch && this.weapons[packet.weaponToSwitch]) {
            this.weaponManager.weaponToSwitch = packet.weaponToSwitch;
        }
    }

    get data(): Required<EntitiesNetData[EntityType.Player]> {
        return {
            position: this.position,
            direction: this.direction,
            full: {
                activeWeapon: this.activeWeapon
            }
        };
    }
}
