import { MathUtils } from "./math";
import type { Vector } from "./vector";

export const Random = {
    /**
     * Generate a random floating-point value.
     * @param min The minimum value that can be generated.
     * @param max The maximum value that can be generated.
     */
    float(min: number, max: number): number {
        return Math.random() * (max - min) + min;
    },

    /**
     * Generate a random integer.
     * @param min The minimum value that can be generated.
     * @param max The maximum value that can be generated.
     */
    int(min: number, max: number): number {
        return Math.floor(Random.float(min, max + 1));
    },

    /**
     * @return A random boolean.
     */
    boolean(): boolean {
        return Math.random() < 0.5;
    },

    /**
     * Generate a vector of random direction and magnitude.
     * @param minX The minimum length in the x-direction.
     * @param maxX The maximum length in the x-direction.
     * @param minY The minimum length in the y-direction.
     * @param maxY The maximum length in the y-direction.
     */
    vector(minX: number, maxX: number, minY: number, maxY: number): Vector {
        return {
            x: Random.float(minX, maxX),
            y: Random.float(minY, maxY)
        };
    },

    /**
     * Generate a random point inside of a circle.
     * @param position The center of the circle.
     * @param radius The radius of the circle.
     * @returns A random point inside the circle radius.
     */
    pointInsideCircle(position: Vector, maxRadius: number, minRadius = 0): Vector {
        const angle = Random.float(0, Math.PI * 2);
        const length = Random.float(minRadius, maxRadius);
        return {
            x: position.x + Math.cos(angle) * length,
            y: position.y + Math.sin(angle) * length
        };
    },

    /**
     * Pick a random element from a weighted series of elements.
     * @param items The elements to choose from.
     * @param weights A legend of the elements' relative weights.
     */
    weightedRandom<T>(items: T[], weights: number[]): T {
        let i: number;
        for (i = 1; i < weights.length; i++) weights[i] += weights[i - 1];

        const random = Math.random() * weights[weights.length - 1];
        for (i = 0; i < weights.length; i++) {
            if (weights[i] > random) break;
        }
        return items[i];
    }
};

export class SeededRandom {
    rng = 0;

    constructor(seed: number) {
        this.rng = seed;
    }

    get(min = 0, max = 1): number {
        this.rng = (this.rng * 16807) % 2147483647;
        const t = this.rng / 2147483647;
        return MathUtils.lerp(min, max, t);
    }
}
