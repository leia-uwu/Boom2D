import { DefinitionList, ImgDefinition } from "../utils/definitionList";
import { ExplosionDefKey } from "./explosionDefs";
import { type ParticleDefKey } from "../../../client/src/game/particle";

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
        type: ParticleDefKey
    }
}

export const ProjectileDefs = new DefinitionList({
    plasma: {
        radius: 0.25,
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
        radius: 0.3,
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
            spawnOffset: 1.5,
            amount: 10,
            type: "rocket_trail"
        }
    }
} satisfies Record<string, ProjectileDef>);

export type ProjectileDefKey = keyof typeof ProjectileDefs["definitions"];
