import { DefinitionList, ImgDefinition } from "../utils/definitionList";
import { Vec2, Vector } from "../utils/vector";
import { type BulletDefKey } from "./bulletDefs";

interface GunDef {
    type: "gun"
    fireDelay: number
    bulletType?: BulletDefKey
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
        spread: 5.6,
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
    }
} satisfies Record<string, GunDef>);

export type WeaponDefKey = keyof typeof WeaponDefs["definitions"];
