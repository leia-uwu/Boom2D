import { DefinitionList } from "../utils/definitionList";

export interface MapDef {
    width: number;
    height: number;
    image: string;
}

export type MapDefKey = "test";

export const rawDefs: Record<MapDefKey, MapDef> = {
    test: {
        width: 256,
        height: 256,
        image: "/client/assets/img/maps/test-map.svg",
    },
};

export const MapDefs = new DefinitionList<MapDefKey, MapDef>(rawDefs);
