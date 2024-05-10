import { DefinitionList, ImgDefinition } from "../utils/definitionList";
import { type ParticleDefKey } from "../../../client/src/game/particle";

export interface ExplosionDef {
    radius: number
    damage: number
    img: ImgDefinition & {
        animDuration: number
        animScale: number
    }
    particles?: {
        type: ParticleDefKey
        amount: number
    }
    sound?: string
}

export const ExplosionDefs = new DefinitionList({
    rocket: {
        radius: 6,
        damage: 80,
        img: {
            animDuration: 0.5,
            animScale: 2,
            src: "glow-particle.svg",
            tint: 0xff0000
        },
        particles: {
            type: "rocket_explosion",
            amount: 50
        },
        sound: "rocket_explosion.mp3"
    },
    plasma: {
        radius: 3,
        damage: 5,
        img: {
            animDuration: 0.3,
            animScale: 1.5,
            src: "glow-particle.svg",
            tint: 0x00ffff
        },
        particles: {
            type: "plasma_explosion",
            amount: 4
        }
    }
} satisfies Record<string, ExplosionDef>);

export type ExplosionDefKey = keyof typeof ExplosionDefs["definitions"];
