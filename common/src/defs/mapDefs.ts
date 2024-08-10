import { DefinitionList } from "../utils/definitionList";

export interface MapDef {
    width: number;
    height: number;
    image: string;
}

export const MapDefs = new DefinitionList({
    test: {
        width: 256,
        height: 256,
        image: "common/maps/test-map.svg"
    }
} satisfies Record<string, MapDef>);

export type MapDefKey = keyof (typeof MapDefs)["definitions"];
