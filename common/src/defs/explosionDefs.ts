import { DefinitionList } from "../utils/definitionList";

interface ExplosionDef {
    radius: number
    damage: number
}

export const ExplosionDefs = new DefinitionList({
    barrel: {
        radius: 15,
        damage: 120
    }
} satisfies Record<string, ExplosionDef>);

export type ExplosionDefKey = keyof typeof ExplosionDefs["definitions"];
