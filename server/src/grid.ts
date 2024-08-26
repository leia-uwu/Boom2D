import { type Hitbox, RectHitbox } from "../../common/src/utils/hitbox";
import { MathUtils } from "../../common/src/utils/math";
import { Vec2, type Vector } from "../../common/src/utils/vector";
import type { ServerEntity } from "./entities/entity";

/**
 * A Grid to filter collision detection of game entities
 */
export class Grid {
    readonly width: number;
    readonly height: number;
    readonly cellSize = 16;

    //                        X     Y
    //                      __^__ __^__
    private readonly _grid: Array<Array<Set<ServerEntity>>>;

    constructor(width: number, height: number) {
        this.width = Math.floor(width / this.cellSize);
        this.height = Math.floor(height / this.cellSize);

        this._grid = Array.from({ length: this.width + 1 }, () =>
            Array.from({ length: this.height + 1 }, () => new Set())
        );
    }

    addEntity(entity: ServerEntity): void {
        this.updateEntity(entity);
    }

    /**
     * Add a entity to the grid system
     */
    updateEntity(entity: ServerEntity): void {
        this.removeFromGrid(entity);
        const cells = entity.__gridCells;

        const rect = entity.hitbox.toRectangle();

        // Get the bounds of the hitbox
        // Round it to the grid cells
        const min = this._roundToCells(rect.min);
        const max = this._roundToCells(rect.max);

        // Add it to all grid cells that it intersects
        for (let x = min.x; x <= max.x; x++) {
            const xRow = this._grid[x];
            for (let y = min.y; y <= max.y; y++) {
                xRow[y].add(entity);
                cells.push(Vec2.new(x, y));
            }
        }
    }

    /**
     * Remove a entity from the grid system
     */
    removeFromGrid(entity: ServerEntity): void {
        const cells = entity.__gridCells;

        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            this._grid[cell.x][cell.y].delete(entity);
        }
        cells.length = 0;
    }

    /**
     * Get all entities near this Hitbox
     * This transforms the Hitbox into a rectangle
     * and gets all entities intersecting it after rounding it to grid cells
     * @param Hitbox The Hitbox
     * @return A set with the entities near this Hitbox
     */
    intersectsHitbox(hitbox: Hitbox): Set<ServerEntity> {
        const rect = hitbox.toRectangle();

        const min = this._roundToCells(rect.min);
        const max = this._roundToCells(rect.max);

        const entities = new Set<ServerEntity>();

        for (let x = min.x; x <= max.x; x++) {
            const xRow = this._grid[x];
            for (let y = min.y; y <= max.y; y++) {
                const cellEntities = xRow[y];
                for (const entity of cellEntities) {
                    entities.add(entity);
                }
            }
        }

        return entities;
    }

    intersectPos(pos: Vector) {
        pos = this._roundToCells(pos);
        return [...this._grid[pos.x][pos.y]];
    }

    // TODO: optimize this
    intersectLineSegment(a: Vector, b: Vector) {
        return this.intersectsHitbox(RectHitbox.fromLine(a, b));
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
