import { DefinitionList, ImgDefinition } from "../utils/definitionList";

export interface ExplosionDef {
    radius: number
    damage: number
    img: ImgDefinition & {
        animDuration: number
        animScale: number
    }
    particles?: {
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
            amount: 50,
            hue: {
                min: 0,
                max: 25
            },
            speed: {
                min: 5,
                max: 10
            }
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
            amount: 4,
            hue: {
                min: 160,
                max: 200
            },
            speed: {
                min: 2,
                max: 5
            }
        }
    }
} satisfies Record<string, ExplosionDef>);

export type ExplosionDefKey = keyof typeof ExplosionDefs["definitions"];
