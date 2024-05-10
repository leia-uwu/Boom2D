import { BaseWall } from "../baseMap";
import { DefinitionList } from "../utils/definitionList";
import { PolygonHitbox } from "../utils/hitbox";
import { Vec2 } from "../utils/vector";

export interface MapDef {
    width: number
    height: number
    walls: BaseWall[]
}

export const MapDefs = new DefinitionList({
    main: {
        width: 128,
        height: 128,
        walls: [
            {
                hitbox: new PolygonHitbox([
                    Vec2.new(-10, -10),
                    Vec2.new(10, 10),
                    Vec2.new(11, 30)
                ]).transform(Vec2.new(10, 10))
            }
        ]
    }
} satisfies Record<string, MapDef>);

export type MapDefKey = keyof typeof MapDefs["definitions"];
