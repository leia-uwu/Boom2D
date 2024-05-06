import { DefinitionList, ImgDefinition } from "../utils/definitionList";
import { Vec2, Vector } from "../utils/vector";
import { type BulletDefKey } from "./bulletDefs";
import { ProjectileDefKey } from "./projectileDefs";

export interface GunDef {
    type: "gun"
    key: string
    fireDelay: number
    switchDelay: number
    projectileType?: ProjectileDefKey
    bulletType?: BulletDefKey
    jitterRadius?: number
    bulletCount: number
    spread: number
    inventoryImg: ImgDefinition
    worldImg: ImgDefinition
    leftFistPos: Vector
    barrelLength: number
    barrelOffset: number
    sfx: {
        shoot: string
    }
}
export const WeaponDefs = new DefinitionList({
    pistol: {
        type: "gun",
        key: "1",
        fireDelay: 0.25,
        switchDelay: 0.5,
        bulletType: "pistol_bullet",
        bulletCount: 1,
        spread: 6,
        barrelLength: 2,
        barrelOffset: 0,
        inventoryImg: {
            src: "./game/img/weapons/pistol.svg"
        },
        worldImg: {
            src: "./game/img/weapons/pistol-world.svg",
            rotation: Math.PI / 2,
            position: Vec2.new(90, 0),
            zIndex: -1
        },
        sfx: {
            shoot: "pistol-fire.mp3"
        },
        leftFistPos: Vec2.new(0, 0)
    },
    shotgun: {
        type: "gun",
        key: "2",
        fireDelay: 0.9,
        switchDelay: 1,
        bulletType: "shotgun_bullet",
        bulletCount: 7,
        jitterRadius: 0.3,
        spread: 10,
        barrelLength: 2.5,
        barrelOffset: 0,
        inventoryImg: {
            src: "./game/img/weapons/shotgun.svg"
        },
        worldImg: {
            src: "./game/img/weapons/shotgun-world.svg",
            rotation: Math.PI / 2,
            position: Vec2.new(90, 0),
            zIndex: -1
        },
        sfx: {
            shoot: "shotgun-fire.mp3"
        },
        leftFistPos: Vec2.new(100, 5)
    },
    ak: {
        type: "gun",
        key: "3",
        fireDelay: 0.035,
        switchDelay: 0.5,
        bulletType: "pistol_bullet",
        bulletCount: 1,
        spread: 6,
        barrelLength: 3,
        barrelOffset: 0,
        inventoryImg: {
            src: "./game/img/weapons/ak.svg"
        },
        worldImg: {
            src: "./game/img/weapons/ak-world.svg",
            rotation: Math.PI / 2,
            position: Vec2.new(90, 0),
            zIndex: -1
        },
        sfx: {
            shoot: "ak-fire.mp3"
        },
        leftFistPos: Vec2.new(130, 5)
    },
    rocket_launcher: {
        type: "gun",
        key: "4",
        fireDelay: 0.5,
        switchDelay: 0.5,
        bulletCount: 1,
        projectileType: "rocket",
        barrelLength: 3.4,
        spread: 0,
        barrelOffset: 0,
        inventoryImg: {
            src: "./game/img/weapons/rocket-launcher.svg"
        },
        worldImg: {
            src: "./game/img/weapons/rocket-launcher-world.svg",
            rotation: Math.PI / 2,
            position: Vec2.new(90, 0),
            zIndex: -1
        },
        sfx: {
            shoot: "rocket-launcher-fire.mp3"
        },
        leftFistPos: Vec2.new(160, 8)
    },
    plasma_rifle: {
        type: "gun",
        key: "5",
        fireDelay: 0.08,
        switchDelay: 0.5,
        projectileType: "plasma",
        bulletCount: 1,
        spread: 0,
        barrelLength: 3.4,
        barrelOffset: 0,
        inventoryImg: {
            src: "./game/img/weapons/plasma-rifle.svg"
        },
        worldImg: {
            src: "./game/img/weapons/plasma-rifle-world.svg",
            rotation: Math.PI / 2,
            position: Vec2.new(90, 0),
            zIndex: -1
        },
        sfx: {
            shoot: "plasma-fire.mp3"
        },
        leftFistPos: Vec2.new(160, 8)
    }
} satisfies Record<string, GunDef>);

export type WeaponDefKey = keyof typeof WeaponDefs["definitions"];
