import { EntityType } from "../../common/src/constants";
import { type GunDef, type WeaponDefKey, WeaponDefs } from "../../common/src/defs/weaponDefs";
import { CollisionHelpers } from "../../common/src/utils/collisionHelpers";
import { MathUtils } from "../../common/src/utils/math";
import { Random } from "../../common/src/utils/random";
import { Vec2 } from "../../common/src/utils/vector";
import type { Player } from "./entities/player";

enum WeaponState {
    Idle,
    Firing,
    Cooldown,
    Switching,
}

export class WeaponManager {
    constructor(readonly player: Player) {}

    stateTicker = 0;

    state = WeaponState.Idle;

    weaponToSwitch = "" as WeaponDefKey;

    fireGun() {
        const game = this.player.game;
        const weaponDef = this.getCurrentWeapDef();

        this.player.ammo[weaponDef.ammo] -= weaponDef.ammoPerShot;
        this.player.dirty.ammo = true;

        const dir = this.player.direction;

        const gunStartPos = this.player.position;
        const gunEndPos = Vec2.add(
            Vec2.add(gunStartPos, Vec2.mul(Vec2.perp(dir), weaponDef.barrelOffset)),
            Vec2.mul(dir, weaponDef.barrelLength),
        );

        const entities = this.player.game.grid.intersectLineSegment(
            gunStartPos,
            gunEndPos,
        );

        const intersection = CollisionHelpers.lineOfSightCheck(
            entities,
            this.player.game.map,
            gunStartPos,
            gunEndPos,
            [EntityType.Obstacle],
        );

        const jitter = weaponDef.jitterRadius ?? 0;

        let bulletSpawnPos = intersection.position;
        if (intersection.distance < intersection.originalDistance) {
            bulletSpawnPos = Vec2.sub(bulletSpawnPos, Vec2.mul(dir, 0.1 + jitter));
        }

        if (weaponDef.bulletType) {
            for (let i = 0; i < weaponDef.bulletCount; i++) {
                const deviation = Random.float(-0.5, 0.5) * weaponDef.spread;

                const shotDir = Vec2.rotate(dir, MathUtils.degreesToRadians(deviation));

                let bulletPos = Vec2.clone(bulletSpawnPos);

                // Add shotgun jitter
                if (jitter > 0) {
                    const offset = Vec2.mul(
                        Vec2.new(
                            Random.float(-jitter, jitter),
                            Random.float(-jitter, jitter),
                        ),
                        1.11,
                    );
                    bulletPos = Vec2.add(bulletPos, offset);
                }

                game.bulletManager.fireBullet(this.player, {
                    initialPosition: bulletPos,
                    direction: shotDir,
                    type: weaponDef.bulletType,
                    shooterId: this.player.id,
                });
            }
        }

        if (weaponDef.projectileType) {
            game.projectileManager.allocEntity(
                bulletSpawnPos,
                weaponDef.projectileType,
                dir,
                this.player,
            );
        }
    }

    update(dt: number) {
        if (this.stateTicker > 0) {
            this.stateTicker -= dt;
        }

        if (this.stateTicker <= 0) {
            const weaponDef = this.getCurrentWeapDef();

            switch (this.state) {
                case WeaponState.Switching:
                    this.state = WeaponState.Idle;
                    break;
                case WeaponState.Firing:
                    this.fireGun();
                    this.state = WeaponState.Cooldown;
                    this.stateTicker = weaponDef.fireCooldown;
                    break;
                case WeaponState.Cooldown:
                    this.state = WeaponState.Idle;
                    break;
            }
            // separated from switch case to avoid waiting for next tick to fire guns
            // so the fire rate is more accurate
            if (
                this.state === WeaponState.Idle
                && this.player.mouseDown
                && this.player.ammo[weaponDef.ammo] >= weaponDef.ammoPerShot
            ) {
                this.state = WeaponState.Firing;
                this.stateTicker = weaponDef.fireDelay ?? 0;

                if (this.stateTicker <= 0) {
                    this.fireGun();
                    this.state = WeaponState.Cooldown;
                    this.stateTicker = weaponDef.fireCooldown;
                }

                this.player.game.bulletManager.shots.push({
                    id: this.player.id,
                    weapon: this.player.activeWeapon,
                });
            }
        }

        if (this.weaponToSwitch) {
            this.player.activeWeapon = this.weaponToSwitch;
            this.weaponToSwitch = "" as WeaponDefKey;
            this.player.setFullDirty();
            this.state = WeaponState.Switching;
            this.stateTicker = this.getCurrentWeapDef().switchDelay;
        }
    }

    getCurrentWeapDef() {
        return WeaponDefs.typeToDef(this.player.activeWeapon) as GunDef;
    }
}
