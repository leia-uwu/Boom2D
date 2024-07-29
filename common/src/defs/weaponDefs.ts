import { DefinitionList, type ImgDefinition } from "../utils/definitionList";
import { Vec2, type Vector } from "../utils/vector";
import type { AmmoDefKey } from "./ammoDefs";
import type { BulletDefKey } from "./bulletDefs";
import type { BaseLootDef } from "./lootDefs";
import type { ProjectileDefKey } from "./projectileDefs";

export interface GunDef extends BaseLootDef {
    type: "gun";
    key: string;
    ammo: AmmoDefKey;
    ammoPerShot: number;
    fireDelay: number;
    switchDelay: number;
    projectileType?: ProjectileDefKey;
    bulletType?: BulletDefKey;
    jitterRadius?: number;
    bulletCount: number;
    spread: number;
    lootImg: ImgDefinition;
    worldImg: ImgDefinition;
    muzzleImgs: string[];
    leftFistPos: Vector;
    barrelLength: number;
    barrelOffset: number;
    sfx: {
        shoot: string;
    };
}
export const WeaponDefs = new DefinitionList({
    pistol: {
        type: "gun",
        key: "1",
        respawnTime: 0,
        ammo: "bullet",
        ammoPerShot: 1,
        fireDelay: 0.3,
        switchDelay: 0.5,
        bulletType: "pistol_bullet",
        bulletCount: 1,
        spread: 6,
        barrelLength: 2.2,
        barrelOffset: 0,
        lootImg: {
            src: "pistol.svg"
        },
        worldImg: {
            src: "pistol-world.svg",
            position: Vec2.new(90, 0)
        },
        muzzleImgs: ["muzzle-01.svg", "muzzle-02.svg"],
        sfx: {
            shoot: "pistol-fire.mp3"
        },
        leftFistPos: Vec2.new(0, 0)
    },
    shotgun: {
        type: "gun",
        key: "2",
        respawnTime: 10,
        ammo: "shell",
        ammoPerShot: 1,
        fireDelay: 0.9,
        switchDelay: 1,
        bulletType: "shotgun_bullet",
        bulletCount: 7,
        jitterRadius: 0.3,
        spread: 10,
        barrelLength: 2.6,
        barrelOffset: 0,
        lootImg: {
            src: "shotgun.svg",
            scale: 0.8
        },
        worldImg: {
            src: "shotgun-world.svg",
            position: Vec2.new(90, 0)
        },
        muzzleImgs: ["muzzle-01.svg", "muzzle-02.svg"],
        sfx: {
            shoot: "shotgun-fire.mp3"
        },
        leftFistPos: Vec2.new(100, 5)
    },
    ak: {
        type: "gun",
        key: "3",
        respawnTime: 10,
        ammo: "bullet",
        ammoPerShot: 1,
        fireDelay: 0.06,
        switchDelay: 0.5,
        bulletType: "pistol_bullet",
        bulletCount: 1,
        spread: 6,
        barrelLength: 3,
        barrelOffset: 0,
        lootImg: {
            src: "ak.svg",
            scale: 0.8
        },
        worldImg: {
            src: "ak-world.svg",
            position: Vec2.new(90, 0)
        },
        muzzleImgs: ["muzzle-01.svg", "muzzle-02.svg"],
        sfx: {
            shoot: "ak-fire.mp3"
        },
        leftFistPos: Vec2.new(130, 5)
    },
    rocket_launcher: {
        type: "gun",
        key: "4",
        respawnTime: 15,
        ammo: "rocket",
        ammoPerShot: 1,
        fireDelay: 0.5,
        switchDelay: 0.5,
        bulletCount: 1,
        projectileType: "rocket",
        barrelLength: 2.8,
        spread: 0,
        barrelOffset: 0,
        lootImg: {
            src: "rocket-launcher.svg",
            scale: 0.8
        },
        worldImg: {
            src: "rocket-launcher-world.svg",
            position: Vec2.new(70, 0)
        },
        muzzleImgs: ["muzzle-02.svg"],
        sfx: {
            shoot: "rocket-launcher-fire.mp3"
        },
        leftFistPos: Vec2.new(120, 8)
    },
    plasma_rifle: {
        type: "gun",
        key: "5",
        respawnTime: 15,
        ammo: "cell",
        ammoPerShot: 1,
        fireDelay: 0.1,
        switchDelay: 0.5,
        projectileType: "plasma",
        bulletCount: 1,
        spread: 0,
        barrelLength: 3.1,
        barrelOffset: 0,
        lootImg: {
            src: "plasma-rifle.svg",
            scale: 0.8
        },
        worldImg: {
            src: "plasma-rifle-world.svg",
            position: Vec2.new(90, 0)
        },
        muzzleImgs: ["muzzle-01.svg", "muzzle-02.svg"],
        sfx: {
            shoot: "plasma-fire.mp3"
        },
        leftFistPos: Vec2.new(160, 8)
    }
} satisfies Record<string, GunDef>);

export type WeaponDefKey = keyof (typeof WeaponDefs)["definitions"];
