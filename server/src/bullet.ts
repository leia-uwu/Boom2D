import { BaseBullet, type BulletParams } from "../../common/src/baseBullet";
import { BulletDefs } from "../../common/src/defs/bulletDefs";
import type { Shot } from "../../common/src/packets/updatePacket";
import { Random } from "../../common/src/utils/random";
import { Vec2 } from "../../common/src/utils/vector";
import { Player } from "./entities/player";
import type { Game } from "./game";

export class BulletManager {
    bullets: ServerBullet[] = [];
    newBullets: ServerBullet[] = [];
    shots: Shot[] = [];

    activeCount = 0;

    constructor(readonly game: Game) {}

    update(dt: number) {
        let activeCount = 0;
        for (let i = 0; i < this.bullets.length; i++) {
            const bullet = this.bullets[i];
            if (bullet.active) {
                bullet.update(dt);
                activeCount++;
            }
        }

        // free some bullets if pool is too big
        if (this.bullets.length > 128 && activeCount < this.bullets.length / 2) {
            const compact = [];
            for (let i = 0; i < this.bullets.length; i++) {
                const bullet = this.bullets[i];
                if (bullet.active) {
                    compact.push(bullet);
                }
            }
            this.bullets = compact;
        }

        if (activeCount !== this.activeCount) {
            this.game.debugObjCountDirty = true;
            this.activeCount = activeCount;
        }
    }

    fireBullet(player: Player, params: BulletParams) {
        let bullet: ServerBullet | undefined = undefined;

        for (let i = 0; i < this.bullets.length; i++) {
            if (!this.bullets[i].active) {
                bullet = this.bullets[i];
                break;
            }
        }

        if (!bullet) {
            bullet = new ServerBullet(this.game);
            this.bullets.push(bullet);
        }

        bullet.init(params, player);
        this.newBullets.push(bullet);
        return bullet;
    }

    flush() {
        this.newBullets.length = 0;
        this.shots.length = 0;
    }
}

export class ServerBullet extends BaseBullet {
    game!: Game;
    shooter!: Player;

    constructor(game: Game) {
        super();
        this.game = game;
    }

    init(params: BulletParams, shooter: Player) {
        this._init(params);
        this.shooter = shooter;
    }

    override update(dt: number) {
        super.update(dt);

        if (
            this.position.x < 0 ||
            this.position.y < 0 ||
            this.position.x > this.game.map.width ||
            this.position.y > this.game.map.height ||
            this.dead
        ) {
            this.active = false;
            return;
        }

        const def = BulletDefs.typeToDef(this.type);

        const objs = this.game.grid.intersectLineSegment(
            this.lastPosition,
            this.position
        );

        const collisions = this.checkCollisions(objs, this.game.map);

        for (let i = 0; i < collisions.length; i++) {
            const collision = collisions[i];
            const { entity, position } = collision;
            const damage = Random.int(def.damage.min, def.damage.max);

            switch (true) {
                case entity instanceof Player:
                    entity.damage(damage, this.shooter);
                    break;
            }

            this.position = position;
            this.active = false;
            break;
        }

        if (this.distanceTraveled > def.maxDistance) {
            this.active = false;
            this.position = Vec2.clone(this.finalPosition);
        }
    }
}
