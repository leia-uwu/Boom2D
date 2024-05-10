import { BaseHitbox, Hitbox, HitboxJSON, RectHitbox } from "./utils/hitbox";
import { MathUtils } from "./utils/math";
import { Vector } from "./utils/vector";

export interface BaseWall {
    hitbox: HitboxJSON
}

export class Wall {
    hitbox: Hitbox;
    // cache rectangle bounds
    rect: RectHitbox;
    constructor(hitbox: HitboxJSON) {
        this.hitbox = BaseHitbox.fromJSON(hitbox);
        this.rect = this.hitbox.toRectangle();
    }
}

interface GridCell {
    walls: Wall[]
}

/**
 * This class manages map walls and floors
 */
export class BaseGameMap {
    width = 0;
    height = 0;

    walls: Wall[] = [];

    gridWidth = 0;
    gridHeight = 0;
    cellSize = 16;

    private _grid: GridCell[][] = [];

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

        const walls = new Set<Wall>();

        for (let x = min.x; x <= max.x; x++) {
            const xRow = this._grid[x];
            for (let y = min.y; y <= max.y; y++) {
                const cell = xRow[y];
                for (const wall of cell.walls) {
                    walls.add(wall);
                }
            }
        }

        return {
            walls
        };
    }

    intersectPos(pos: Vector) {
        pos = this._roundToCells(pos);
        return this._grid[pos.x][pos.y];
    }

    // TODO: optimize this
    intersectLineSegment(a: Vector, b: Vector) {
        return this.intersectsHitbox(RectHitbox.fromLine(a, b));
    }

    protected init(width: number, height: number, walls: BaseWall[]) {
        this.width = width;
        this.height = height;
        this.gridWidth = Math.ceil(width / this.cellSize);
        this.gridHeight = Math.ceil(height / this.cellSize);

        this._resetGrid();
        this.walls = [];
        for (const baseWall of walls) {
            const wall = new Wall(baseWall.hitbox);
            this.walls.push(wall);
            this._addWall(wall);
        }
    }

    private _resetGrid() {
        this._grid = Array.from(
            { length: this.gridWidth + 1 },
            () => Array.from({ length: this.gridHeight + 1 }, () => {
                return {
                    walls: []
                };
            })
        );
    }

    private _addWall(wall: Wall): void {
        const rect = wall.rect;
        // Get the bounds of the hitbox
        // Round it to the grid cells
        const min = this._roundToCells(rect.min);
        const max = this._roundToCells(rect.max);

        // Add it to all grid cells that it intersects
        for (let x = min.x; x <= max.x; x++) {
            const xRow = this._grid[x];
            for (let y = min.y; y <= max.y; y++) {
                xRow[y].walls.push(wall);
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
