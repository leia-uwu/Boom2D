import { DefinitionList, type ImgDefinition } from "../utils/definitionList";
import type { BeamDefKey } from "./beamDefs";
import type { ExplosionDefKey } from "./explosionDefs";

export interface ProjectileDef {
    radius: number;
    speed: number;
    damage: {
        min: number;
        max: number;
    };
    explosion?: ExplosionDefKey;
    img: ImgDefinition & { spin?: boolean };
    particles?: {
        spawnDelay: number;
        spawnOffset: number;
        amount: number;
        type: string;
        randomPlacement?: boolean;
    };
    beams?: {
        // targeting distance
        // note: should be equal or smaller than the maxLength on the beam definition
        // preferably smaller, so if an entity gets targeted and quickly gets away from the range
        // the beam wont just appear for like 2 frames
        distance: number;
        type: BeamDefKey;
        rate: number;
    };
}
export type ProjectileDefKey = "rocket" | "plasma" | "bfg";

const rawDefs: Record<ProjectileDefKey, ProjectileDef> = {
    rocket: {
        radius: 0.3,
        speed: 40,
        damage: {
            min: 5,
            max: 40,
        },
        explosion: "rocket",
        img: {
            src: "rocket-projectile.svg",
        },
        particles: {
            spawnDelay: 0.01,
            spawnOffset: 1.5,
            amount: 10,
            type: "rocket_trail",
        },
    },
    plasma: {
        radius: 0.25,
        speed: 50,
        damage: {
            min: 5,
            max: 20,
        },
        explosion: "plasma",
        img: {
            spin: true,
            src: "plasma-projectile.svg",
            tint: 0x00ffff,
        },
    },
    bfg: {
        radius: 1,
        speed: 40,
        damage: {
            min: 25,
            max: 50,
        },
        explosion: "bfg",
        img: {
            spin: true,
            src: "bfg-projectile.svg",
            tint: 0x00ff00,
        },
        particles: {
            spawnDelay: 0.01,
            spawnOffset: 0,
            amount: 10,
            type: "bfg_trail",
            randomPlacement: true,
        },
        beams: {
            distance: 8,
            type: "bfg_beam",
            rate: 0.2,
        },
    },
};

export const ProjectileDefs = new DefinitionList<ProjectileDefKey, ProjectileDef>(
    rawDefs,
);
