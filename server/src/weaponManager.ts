import { WeaponDefs } from "../../common/src/defs/weaponDefs";
import { MathUtils } from "../../common/src/utils/math";
import { Random } from "../../common/src/utils/random";
import { Vec2 } from "../../common/src/utils/vector";
import { Player } from "./entities/player";

export class WeaponManager {
    constructor(readonly player: Player) { }

    shotCooldown = 0;

    fireGun() {
        const game = this.player.game;
        const weaponDef = WeaponDefs.typeToDef(this.player.activeWeapon);
        const dir = this.player.direction;

        this.shotCooldown = game.now + weaponDef.fireDelay;

        const gunPos = Vec2.add(this.player.position, Vec2.mul(Vec2.perp(dir), weaponDef.barrelOffset));

        for (let i = 0; i < weaponDef.bulletCount; i++) {
            const deviation = Random.float(-0.5, 0.5) * weaponDef.spread;

            const shotDir = Vec2.rotate(dir, MathUtils.degreesToRadians(deviation));

            const bulletPos = Vec2.add(gunPos, Vec2.mul(dir, weaponDef.barrelLength));

            game.bulletManager.fireBullet(this.player, {
                initialPosition: bulletPos,
                direction: shotDir,
                type: weaponDef.bulletType,
                shooterId: this.player.id
            });

            // const projectile = (this.game, this.position, this.direction, this);
            // this.game.grid.addEntity(projectile);
        }

        game.shots.push({
            id: this.player.id,
            weapon: this.player.activeWeapon
        });
    }

    tick() {
        if (this.player.mouseDown && this.shotCooldown < this.player.game.now) {
            this.fireGun();
        }
    }
}
