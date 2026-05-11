import { DefinitionList } from "../utils/definitionList";

export interface BeamDef {
    maxLength: number;
    color: number;
    lineWidth: number;
    zIndex: number;
    sound?: string;
    rayParticles?: {
        spawnDelay: number;
        amount: number;
        type: string;
    };
    hitParticles?: {
        spawnDelay: number;
        amount: number;
        type: string;
    };
    damage?: {
        rate: number;
        amount: { min: number; max: number };
    };
}

export type BeamDefKey = "bfg_beam";

const rawDefs: Record<BeamDefKey, BeamDef> = {
    bfg_beam: {
        maxLength: 12,
        color: 0x00ff00,
        lineWidth: 4,
        zIndex: 3,
        sound: "bfg-beam.mp3",
        rayParticles: {
            spawnDelay: 0.1,
            amount: 1,
            type: "bfg_beam_ray",
        },
        hitParticles: {
            spawnDelay: 0.05,
            amount: 1,
            type: "bfg_beam_target",
        },
        damage: {
            rate: 0.1,
            amount: {
                min: 10,
                max: 20,
            },
        },
    },
};

export const BeamDefs = new DefinitionList(rawDefs);
