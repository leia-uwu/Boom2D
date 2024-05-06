import { DefinitionList, ImgDefinition } from "../utils/definitionList";

export interface ProjectileDef {
    radius: number
    speed: number
    damage: {
        min: number
        max: number
    }
    img: ImgDefinition
}

export const ProjectileDefs = new DefinitionList({
    plasma: {
        radius: 0.5,
        speed: 50,
        damage: {
            min: 5,
            max: 40
        },
        img: {
            src: "plasma-projectile.svg",
            tint: 0x00ffff
        }
    }
} satisfies Record<string, ProjectileDef>);

export type ProjectileDefKey = keyof typeof ProjectileDefs["definitions"];
