import { WeaponDefKey, WeaponDefs } from "../../common/src/defs/weaponDefs";
import { MathUtils } from "../../common/src/utils/math";
import { Random } from "../../common/src/utils/random";
import { Vec2 } from "../../common/src/utils/vector";
import { Player } from "./entities/player";

enum WeaponState {
    Idle,
    Firing,
    Switching
}

export class WeaponManager {
    constructor(readonly player: Player) { }

    stateTicker = 0;

    state = WeaponState.Idle;

    weaponToSwitch = "" as WeaponDefKey;

    fireGun() {
        const game = this.player.game;
        const weaponDef = this.getCurrentWeapDef();
        this.stateTicker = weaponDef.fireDelay;
        this.state = WeaponState.Firing;

        const dir = this.player.direction;

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
        }

        game.shots.push({
            id: this.player.id,
            weapon: this.player.activeWeapon
        });
    }

    tick(dt: number) {
        if (this.stateTicker > 0) {
            this.stateTicker -= dt;
        } else {
            this.state = WeaponState.Idle;
        }

        if (this.stateTicker <= 0 && this.weaponToSwitch) {
            this.player.activeWeapon = this.weaponToSwitch;
            this.weaponToSwitch = "" as WeaponDefKey;

            const def = this.getCurrentWeapDef();
            this.stateTicker = def.switchDelay;
            this.state = WeaponState.Switching;
            this.player.setFullDirty();
        }

        if (this.player.mouseDown && this.state === WeaponState.Idle) {
            this.fireGun();
        }
    }

    getCurrentWeapDef() {
        return WeaponDefs.typeToDef(this.player.activeWeapon);
    }
}
