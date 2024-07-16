import { EntityType } from "../../common/src/constants";
import {
    type GunDef,
    type WeaponDefKey,
    WeaponDefs
} from "../../common/src/defs/weaponDefs";
import { MathUtils } from "../../common/src/utils/math";
import { Random } from "../../common/src/utils/random";
import { Vec2 } from "../../common/src/utils/vector";
import type { Player } from "./entities/player";
import { Projectile } from "./entities/projectile";

enum WeaponState {
    Idle,
    Firing,
    Switching
}

export class WeaponManager {
    constructor(readonly player: Player) {}

    stateTicker = 0;

    state = WeaponState.Idle;

    weaponToSwitch = "" as WeaponDefKey;

    fireGun() {
        const game = this.player.game;
        const weaponDef = this.getCurrentWeapDef();

        if (this.player.ammo[weaponDef.ammo] < weaponDef.ammoPerShot) return;

        this.player.ammo[weaponDef.ammo] -= weaponDef.ammoPerShot;
        this.player.dirty.ammo = true;

        const dir = this.player.direction;

        const gunStartPos = this.player.position;
        const gunEndPos = Vec2.add(
            Vec2.add(gunStartPos, Vec2.mul(Vec2.perp(dir), weaponDef.barrelOffset)),
            Vec2.mul(dir, weaponDef.barrelLength)
        );

        const entities = this.player.game.grid.intersectLineSegment(
            gunStartPos,
            gunEndPos
        );

        let finalGunPos = Vec2.clone(gunEndPos);
        let dist = Vec2.distanceSqrt(gunStartPos, gunEndPos);

        for (const entity of entities) {
            if (entity.__type !== EntityType.Obstacle) continue;
            const intersection = entity.hitbox.intersectsLine(gunStartPos, gunEndPos);
            if (intersection) {
                const intersectionDist = Vec2.distanceSqrt(
                    gunStartPos,
                    intersection.point
                );
                if (intersectionDist < dist) {
                    finalGunPos = intersection.point;
                    dist = intersectionDist;
                }
            }
        }

        const { walls } = game.map.intersectLineSegment(gunStartPos, gunEndPos);

        for (const wall of walls) {
            const intersection = wall.hitbox.intersectsLine(gunStartPos, gunEndPos);
            if (intersection) {
                const intersectionDist = Vec2.distanceSqrt(
                    gunStartPos,
                    intersection.point
                );
                if (intersectionDist < dist) {
                    finalGunPos = intersection.point;
                    dist = intersectionDist;
                }
            }
        }

        if (weaponDef.bulletType) {
            const jitter = weaponDef.jitterRadius ?? 0;

            for (let i = 0; i < weaponDef.bulletCount; i++) {
                const deviation = Random.float(-0.5, 0.5) * weaponDef.spread;

                const shotDir = Vec2.rotate(dir, MathUtils.degreesToRadians(deviation));

                let bulletPos = Vec2.clone(finalGunPos);

                // Add shotgun jitter
                if (jitter > 0) {
                    const offset = Vec2.mul(
                        Vec2.new(
                            Random.float(-jitter, jitter),
                            Random.float(-jitter, jitter)
                        ),
                        1.11
                    );
                    bulletPos = Vec2.add(bulletPos, offset);
                }

                game.bulletManager.fireBullet(this.player, {
                    initialPosition: bulletPos,
                    direction: shotDir,
                    type: weaponDef.bulletType,
                    shooterId: this.player.id
                });
            }
        }

        if (weaponDef.projectileType) {
            const projectile = new Projectile(
                game,
                weaponDef.projectileType,
                finalGunPos,
                dir,
                this.player
            );
            game.entityManager.register(projectile);
        }

        game.bulletManager.shots.push({
            id: this.player.id,
            weapon: this.player.activeWeapon
        });
    }

    tick(dt: number) {
        if (this.stateTicker > 0) {
            this.stateTicker -= dt;
        }

        if (this.stateTicker <= 0) {
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
            this.stateTicker = this.getCurrentWeapDef().fireDelay;
            this.state = WeaponState.Firing;
            this.fireGun();
        }
    }

    getCurrentWeapDef() {
        return WeaponDefs.typeToDef(this.player.activeWeapon) as GunDef;
    }
}
