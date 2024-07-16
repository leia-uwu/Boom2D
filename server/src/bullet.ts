import { BaseBullet, type BulletParams } from "../../common/src/baseBullet";
import { BulletDefs } from "../../common/src/defs/bulletDefs";
import type { Shot } from "../../common/src/packets/updatePacket";
import { Random } from "../../common/src/utils/random";
import { Vec2 } from "../../common/src/utils/vector";
import { Player } from "./entities/player";
import type { Game } from "./game";

export class BulletManager {
    readonly bullets: ServerBullet[] = [];
    newBullets: ServerBullet[] = [];
    shots: Shot[] = [];

    constructor(readonly game: Game) {}

    tick(dt: number) {
        for (let i = 0; i < this.bullets.length; i++) {
            const bullet = this.bullets[i];
            bullet.tick(dt);
            if (bullet.dead) {
                this.bullets.splice(i, 1);
            }
        }
    }

    fireBullet(player: Player, params: BulletParams) {
        const bullet = new ServerBullet(this.game, player, params);
        this.bullets.push(bullet);
        this.newBullets.push(bullet);
    }

    flush() {
        this.newBullets.length = 0;
        this.shots.length = 0;
    }
}

export class ServerBullet extends BaseBullet {
    constructor(
        readonly game: Game,
        readonly shooter: Player,
        params: BulletParams
    ) {
        super(params);
    }

    override tick(dt: number) {
        super.tick(dt);

        if (
            this.position.x < 0 ||
            this.position.y < 0 ||
            this.position.x > this.game.map.width ||
            this.position.y > this.game.map.height
        ) {
            this.dead = true;
            return;
        }

        const def = BulletDefs.typeToDef(this.type);

        const objs = this.game.grid.intersectLineSegment(
            this.lastPosition,
            this.position
        );

        const collisions = this.checkCollisions(objs, this.game.map);

        for (const collision of collisions) {
            const { entity, position } = collision;
            const damage = Random.int(def.damage.min, def.damage.max);

            switch (true) {
                case entity instanceof Player:
                    entity.damage(damage, this.shooter);
                    break;
            }

            this.position = position;
            this.dead = true;
            break;
        }

        if (this.distanceTraveled > def.maxDistance) {
            this.dead = true;
            this.position = Vec2.clone(this.finalPosition);
        }
    }
}
