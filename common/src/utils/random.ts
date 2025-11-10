import { Vec2, type Vector } from "./vector";

// https://en.wikipedia.org/wiki/Lehmer_random_number_generator
export class ParkMillerRandom {
    rng = 0;

    constructor(seed: number) {
        this.rng = seed;
    }

    get(): number {
        this.rng = (this.rng * 16807) % 2147483647;
        return this.rng / 2147483647;
    }
}

export class WeightedGenerator<T extends { weight: number }> {
    private generator: RandomGenerator;
    private total = 0;

    data: T[];

    constructor(generator: RandomGenerator, data: T[]) {
        this.generator = generator;
        this.data = data;

        for (let i = 0; i < data.length; i++) {
            this.total += data[i].weight;
        }
    }

    next(): T {
        let rng = this.generator.float(0, this.total);
        let idx = 0;
        while (rng > this.data[idx].weight) {
            rng -= this.data[idx].weight;
            idx++;
        }
        return this.data[idx];
    }
}

export abstract class RandomGenerator {
    abstract get(): number;

    float(min: number, max: number): number {
        return this.get() * (max - min) + min;
    }

    int(min: number, max: number): number {
        return Math.floor(this.float(min, max + 1));
    }

    boolean(): boolean {
        return this.get() < 0.5;
    }

    itemInArray<T>(array: T[]): T {
        return array[this.int(0, array.length - 1)];
    }

    vector(minX: number, maxX: number, minY: number, maxY: number): Vector {
        return Vec2.new(
            this.float(minX, maxX),
            this.float(minY, maxY),
        );
    }

    /**
     * Random direction vector
     */
    unitVector(): Vector {
        return Vec2.normalizeSafe(
            Vec2.new(this.float(-0.5, 0.5), this.float(-0.5, 0.5)),
            Vec2.new(1, 0),
        );
    }

    pointInsideCircle(position: Vector, maxRadius: number, minRadius = 0): Vector {
        const angle = this.float(0, Math.PI * 2);
        const length = this.float(minRadius, maxRadius);
        return {
            x: position.x + Math.cos(angle) * length,
            y: position.y + Math.sin(angle) * length,
        };
    }

    weightedGenerator<T extends { weight: number }>(data: T[]): WeightedGenerator<T> {
        return new WeightedGenerator<T>(this, data);
    }
}

/**
 * Default random generator using Math.random()
 */
export class DefaultRandom extends RandomGenerator {
    constructor() {
        super();
    }

    override get() {
        return Math.random();
    }
}
export const Random = new DefaultRandom();

/**
 * Park–Miller random generator
 *
 * https://en.wikipedia.org/wiki/Lehmer_random_number_generator
 */
export class SeededRandom extends RandomGenerator {
    private seededRand: ParkMillerRandom;

    constructor(seed: number) {
        super();
        this.seededRand = new ParkMillerRandom(seed);
    }

    override get() {
        return this.seededRand.get();
    }
}
