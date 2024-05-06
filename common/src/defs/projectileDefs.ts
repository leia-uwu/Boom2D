import { DefinitionList, ImgDefinition } from "../utils/definitionList";
import { ExplosionDefKey } from "./explosionDefs";

export interface ProjectileDef {
    radius: number
    speed: number
    damage: {
        min: number
        max: number
    }
    explosion?: ExplosionDefKey
    img: ImgDefinition & { spin?: boolean }
    particles?: {
        spawnDelay: number
        spawnOffset: number
        amount: number
        hue: {
            min: number
            max: number
        }
        speed: {
            min: number
            max: number
        }
    }
}

export const ProjectileDefs = new DefinitionList({
    plasma: {
        radius: 0.5,
        speed: 50,
        damage: {
            min: 5,
            max: 20
        },
        img: {
            spin: true,
            src: "plasma-projectile.svg",
            tint: 0x00ffff
        },
        explosion: "plasma"
    },
    rocket: {
        radius: 0.5,
        speed: 40,
        damage: {
            min: 5,
            max: 40
        },
        explosion: "rocket",
        img: {
            src: "rocket-projectile.svg"
        },
        particles: {
            spawnDelay: 0.01,
            amount: 10,
            spawnOffset: 1.5,
            hue: {
                min: 0,
                max: 25
            },
            speed: {
                min: 2,
                max: 5
            }
        }
    }
} satisfies Record<string, ProjectileDef>);

export type ProjectileDefKey = keyof typeof ProjectileDefs["definitions"];
