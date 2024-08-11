import { BaseHitbox, type Hitbox, type HitboxJSON, RectHitbox } from "./utils/hitbox";
import { MathUtils } from "./utils/math";
import type { Vector } from "./utils/vector";

export enum MapObjectType {
    Wall,
    Floor
}

export interface BaseMapObject {
    type: MapObjectType
    hitbox: HitboxJSON;
    color: number;
    texture: string
}

export class MapObject {
    type: MapObjectType;
    hitbox: Hitbox;
    color: number;
    texture: string;
    // cache rectangle bounds
    rect: RectHitbox;
    constructor(obj: BaseMapObject) {
        this.hitbox = BaseHitbox.fromJSON(obj.hitbox);
        this.color = obj.color;
        this.rect = this.hitbox.toRectangle();
        this.type = obj.type;
        this.texture = obj.texture;
    }
}


/**
 * This class manages map walls and floors
 */
export class BaseGameMap {
    width = 0;
    height = 0;

    objects: MapObject[] = [];

    gridWidth = 0;
    gridHeight = 0;
    cellSize = 16;

    private _grid: Array<Array<Array<MapObject>>> = [];

    /**
     * Get all walls and floors near this Hitbox
     * This transforms the Hitbox into a rectangle
     * and gets all walls and floors intersecting it after rounding it to grid cells
     * @param Hitbox The Hitbox
     * @return A set with the walls and floors near this Hitbox
     */
    intersectsHitbox(hitbox: Hitbox) {
        const rect = hitbox.toRectangle();

        const min = this._roundToCells(rect.min);
        const max = this._roundToCells(rect.max);

        const objects = new Set<MapObject>();

        for (let x = min.x; x <= max.x; x++) {
            const xRow = this._grid[x];
            for (let y = min.y; y <= max.y; y++) {
                const cell = xRow[y];
                for (let i = 0; i < cell.length; i++) {
                    objects.add(cell[i]);
                }
            }
        }

        return objects;
    }

    intersectPos(pos: Vector) {
        pos = this._roundToCells(pos);
        return this._grid[pos.x][pos.y];
    }

    // TODO: optimize this
    intersectLineSegment(a: Vector, b: Vector) {
        return this.intersectsHitbox(RectHitbox.fromLine(a, b));
    }

    protected init(
        width: number,
        height: number,
        objects: BaseMapObject[],
    ) {
        this.width = width;
        this.height = height;
        this.gridWidth = Math.ceil(width / this.cellSize);
        this.gridHeight = Math.ceil(height / this.cellSize);

        this._resetGrid();
        this.objects = [];
        for (const baseWall of objects) {
            const wall = new MapObject(baseWall);
            this.objects.push(wall);
            this._addObject(wall);
        }

    }

    private _resetGrid() {
        this._grid = Array.from({ length: this.gridWidth + 1 }, () =>
            Array.from({ length: this.gridHeight + 1 }, () => {
                return []
            })
        );
    }

    private _addObject(wall: MapObject): void {
        const rect = wall.rect;
        // Get the bounds of the hitbox
        // Round it to the grid cells
        const min = this._roundToCells(rect.min);
        const max = this._roundToCells(rect.max);

        // Add it to all grid cells that it intersects
        for (let x = min.x; x <= max.x; x++) {
            const xRow = this._grid[x];
            for (let y = min.y; y <= max.y; y++) {
                xRow[y].push(wall);
            }
        }
    }

    /**
     * Rounds a position to this grid cells
     */
    private _roundToCells(vector: Vector): Vector {
        return {
            x: MathUtils.clamp(Math.floor(vector.x / this.cellSize), 0, this.gridWidth),
            y: MathUtils.clamp(Math.floor(vector.y / this.cellSize), 0, this.gridHeight)
        };
    }
}
