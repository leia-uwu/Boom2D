import { DefinitionList, ImgDefinition } from "../utils/definitionList";
import { Vec2, Vector } from "../utils/vector";
import { type BulletDefKey } from "./bulletDefs";

interface GunDef {
    type: "gun"
    fireDelay: number
    bulletType?: BulletDefKey
    bulletCount: number
    spread: number
    inventoryImg: ImgDefinition
    worldImg: ImgDefinition
    leftFistPos: Vector
    barrelLength: number
    barrelOffset: number
    sfx: {
        shot: string
    }
}
export const WeaponDefs = new DefinitionList({
    pistol: {
        type: "gun",
        fireDelay: 250,
        bulletType: "pistol_bullet",
        bulletCount: 1,
        spread: 6,
        barrelLength: 2,
        barrelOffset: 0,
        inventoryImg: {
            src: "./game/img/weapons/pistol.svg"
        },
        worldImg: {
            src: "./game/img/weapons/pistol_world.svg",
            rotation: Math.PI / 2,
            position: Vec2.new(90, 0),
            zIndex: -1
        },
        sfx: {
            shot: "pistol_fire.mp3"
        },
        leftFistPos: Vec2.new(0, 0)
    },
    shotgun: {
        type: "gun",
        fireDelay: 900,
        bulletType: "shotgun_bullet",
        bulletCount: 7,
        spread: 10,
        barrelLength: 2.5,
        barrelOffset: 0,
        inventoryImg: {
            src: "./game/img/weapons/shotgun.svg"
        },
        worldImg: {
            src: "./game/img/weapons/shotgun_world.svg",
            rotation: Math.PI / 2,
            position: Vec2.new(90, 0),
            zIndex: -1
        },
        sfx: {
            shot: "shotgun_fire.mp3"
        },
        leftFistPos: Vec2.new(100, 5)
    },
    ak: {
        type: "gun",
        fireDelay: 35,
        bulletType: "pistol_bullet",
        bulletCount: 1,
        spread: 6,
        barrelLength: 3,
        barrelOffset: 0,
        inventoryImg: {
            src: "./game/img/weapons/ak.svg"
        },
        worldImg: {
            src: "./game/img/weapons/ak_world.svg",
            rotation: Math.PI / 2,
            position: Vec2.new(90, 0),
            zIndex: -1
        },
        sfx: {
            shot: "ak_fire.mp3"
        },
        leftFistPos: Vec2.new(130, 5)
    }
} satisfies Record<string, GunDef>);

export type WeaponDefKey = keyof typeof WeaponDefs["definitions"];
