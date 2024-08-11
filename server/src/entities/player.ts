import { MapObjectType } from "../../../common/src/baseMap";
import { EntityType, GameConstants } from "../../../common/src/constants";
import { type AmmoDefKey, AmmoDefs } from "../../../common/src/defs/ammoDefs";
import { type LootDef, LootDefs } from "../../../common/src/defs/lootDefs";
import type { WeaponDefKey } from "../../../common/src/defs/weaponDefs";
import { DeathPacket } from "../../../common/src/packets/deathPacket";
import type { InputPacket } from "../../../common/src/packets/inputPacket";
import type { JoinPacket } from "../../../common/src/packets/joinPacket";
import { JoinedPacket } from "../../../common/src/packets/joinedPacket";
import { KillPacket } from "../../../common/src/packets/killPacket";
import type {
    EntitiesNetData,
    LeaderboardEntry
} from "../../../common/src/packets/updatePacket";
import { CircleHitbox } from "../../../common/src/utils/hitbox";
import { MathUtils } from "../../../common/src/utils/math";
import { Random } from "../../../common/src/utils/random";
import { Vec2, type Vector } from "../../../common/src/utils/vector";
import type { Client } from "../client";
import type { Game } from "../game";
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

    constructor(readonly game: Game) { }

    addPlayer(client: Client, joinPacket: JoinPacket): Player {
        const player = new Player(
            this.game,
            client,
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
        this.game.grid.updateEntity(player);
        player.health = GameConstants.player.defaultHealth;
        player.armor = GameConstants.player.defaultArmor;
        player.dead = false;
        player.setFullDirty();

        player.ammo = {
            bullet: 50,
            shell: 0,
            rocket: 0,
            cell: 0
        };

        player.weapons = {
            pistol: true,
            shotgun: false,
            ak: false,
            rocket_launcher: false,
            plasma_rifle: false,
            bfg: false
        };

        player.dirty.ammo = true;
        player.dirty.weapons = true;

        const joinedPacket = new JoinedPacket();
        joinedPacket.playerId = player.id;
        player.client.sendPacket(joinedPacket);
    }

    removePlayer(player: Player): void {
        player.destroy();
        this.deletedPlayers.push(player.id);
        this.game.logger.log(`"${player.name}" left game`);
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

    client: Client;
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
        pistol: false,
        shotgun: false,
        ak: false,
        rocket_launcher: false,
        plasma_rifle: false,
        bfg: false
    };

    ammo: Record<AmmoDefKey, number> = {
        bullet: 0,
        shell: 0,
        rocket: 0,
        cell: 0
    };

    activeWeapon: WeaponDefKey = "pistol";

    dead = false;

    kills = 0;
    damageDone = 0;
    damageTaken = 0;

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

    constructor(game: Game, client: Client, name: string) {
        const pos = Vec2.new(0, 0);
        super(game, pos);
        this.position = pos;
        this.client = client;
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
                    Vec2.mul(collision.normal, collision.pen)
                );
            }
        }

        const objects = this.game.map.intersectsHitbox(this.hitbox);

        for (const object of objects) {
            if (object.type === MapObjectType.Wall) {
                const collision = this.hitbox.getIntersection(object.hitbox);
                if (collision) {
                    this.position = Vec2.sub(
                        this.position,
                        Vec2.mul(collision.normal, collision.pen)
                    );
                }
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

        this.client.position = Vec2.clone(this.position);
        this.client.zoom = this.zoom;
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
            this.client.sendPacket(deathPacket);

            const killPacket = new KillPacket();
            killPacket.killedId = this.id;
            killPacket.killerId = source.id;
            this.game.sendPacket(killPacket);
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
