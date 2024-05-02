import { DefinitionList } from "../utils/definitionList";

export interface MapDef {
    width: number
    height: number
}

export const MapDefs = new DefinitionList({
    main: {
        width: 80,
        height: 80
    }
} satisfies Record<string, MapDef>);

export type MapDefKey = keyof typeof MapDefs["definitions"];
