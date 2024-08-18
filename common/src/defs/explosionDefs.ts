import { DefinitionList, type ImgDefinition } from "../utils/definitionList";

export interface ExplosionDef {
    radius: number;
    damage: number;
    img: ImgDefinition & {
        animDuration: number;
        animScale: number;
    };
    particles?: {
        type: string;
        amount: number;
    };
    sound?: string;
}

export type ExplosionDefKey = "rocket" | "plasma" | "bfg";

const rawDefs: Record<ExplosionDefKey, ExplosionDef> = {
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
        sound: "rocket-explosion.mp3"
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
    },
    bfg: {
        radius: 10,
        damage: 100,
        img: {
            animDuration: 1,
            animScale: 2,
            src: "glow-particle.svg",
            tint: 0x00ff00
        },
        particles: {
            type: "bfg_explosion",
            amount: 100
        },
        sound: "bfg-explosion.mp3"
    }
};

export const ExplosionDefs = new DefinitionList(rawDefs);
