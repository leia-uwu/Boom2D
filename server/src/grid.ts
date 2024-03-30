import { type Hitbox, RectHitbox } from "../../common/src/utils/hitbox";
import { MathUtils } from "../../common/src/utils/math";
import { Vec2, type Vector } from "../../common/src/utils/vector";
import { type GameObject } from "./objects/gameObject";

/**
 * A Grid to filter collision detection of game objects
 */
export class Grid {
    readonly width: number;
    readonly height: number;
    readonly cellSize = 16;

    //                        X     Y     Object ID
    //                      __^__ __^__     ___^__
    private readonly _grid: Array<Array<Map<number, GameObject>>>;

    // store the cells each game object is occupying
    // so removing the object from the grid is faster
    private readonly _objectsCells = new Map<number, Vector[]>();

    private readonly objects = new Map<number, GameObject>();

    constructor(width: number, height: number) {
        this.width = Math.floor(width / this.cellSize);
        this.height = Math.floor(height / this.cellSize);

        this._grid = Array.from(
            { length: this.width + 1 },
            () => Array.from({ length: this.height + 1 }, () => new Map())
        );
    }

    getById(id: number) {
        return this.objects.get(id);
    }

    addObject(obj: GameObject): void {
        this.objects.set(obj.id, obj);
        obj.init();
        this.updateObject(obj);
    }

    /**
     * Add an object to the grid system
     */
    updateObject(obj: GameObject): void {
        this.removeFromGrid(obj);

        const cells: Vector[] = [];

        const rect = obj.hitbox.toRectangle();
        // Get the bounds of the hitbox
        // Round it to the grid cells
        const min = this._roundToCells(Vec2.add(rect.min, obj.position));
        const max = this._roundToCells(Vec2.add(rect.max, obj.position));

        // Add it to all grid cells that it intersects
        for (let x = min.x; x <= max.x; x++) {
            const xRow = this._grid[x];
            for (let y = min.y; y <= max.y; y++) {
                xRow[y].set(obj.id, obj);
                cells.push(Vec2.new(x, y));
            }
        }
        // Store the cells this object is occupying
        this._objectsCells.set(obj.id, cells);
    }

    remove(obj: GameObject): void {
        this.objects.delete(obj.id);
        this.removeFromGrid(obj);
    }

    /**
     * Remove an object from the grid system
     */
    removeFromGrid(obj: GameObject): void {
        const cells = this._objectsCells.get(obj.id);
        if (!cells) return;

        for (const cell of cells) {
            this._grid[cell.x][cell.y].delete(obj.id);
        }
        this._objectsCells.delete(obj.id);
    }

    /**
     * Get all objects near this Hitbox
     * This transforms the Hitbox into a rectangle
     * and gets all objects intersecting it after rounding it to grid cells
     * @param Hitbox The Hitbox
     * @return A set with the objects near this Hitbox
     */
    intersectHitbox(hitbox: Hitbox): Set<GameObject> {
        const rect = hitbox.toRectangle();

        const min = this._roundToCells(rect.min);
        const max = this._roundToCells(rect.max);

        const objects = new Set<GameObject>();

        for (let x = min.x; x <= max.x; x++) {
            const xRow = this._grid[x];
            for (let y = min.y; y <= max.y; y++) {
                const objectsMap = xRow[y];
                for (const object of objectsMap.values()) {
                    objects.add(object);
                }
            }
        }

        return objects;
    }

    intersectPos(pos: Vector) {
        pos = this._roundToCells(pos);
        return [...this._grid[pos.x][pos.y].values()];
    }

    // TODO: optimize this
    intersectLineSegment(a: Vector, b: Vector) {
        return this.intersectHitbox(RectHitbox.fromLine(a, b));
    }

    /**
     * Rounds a position to this grid cells
     */
    private _roundToCells(vector: Vector): Vector {
        return {
            x: MathUtils.clamp(Math.floor(vector.x / this.cellSize), 0, this.width),
            y: MathUtils.clamp(Math.floor(vector.y / this.cellSize), 0, this.height)
        };
    }
}
