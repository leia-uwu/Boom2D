/**
 * 2D vector
 */
export interface Vector {
    x: number
    y: number
}

/**
 * Vector util functions
 */
export const Vec2 = {
    /**
    * Creates a new Vector
    * @param x - The horizontal (x-axis) coordinate
    * @param y - The vertical (y-axis) coordinate
    * @returns A new Vector object with the provided x and y coordinates
    */
    new(x: number, y: number): Vector {
        return { x, y };
    },

    /**
    * Adds two Vectors together
    * @param a - The first Vector
    * @param b - The second Vector
    * @returns A new Vector resulting from the addition of vectors a and b
    */
    add(a: Vector, b: Vector): Vector {
        return Vec2.new(a.x + b.x, a.y + b.y);
    },

    /**
    * Adds two vectors together
    * @param a - The first Vector
    * @param x - The x-coordinate of the second vector
    * @param y - The y-coordinate of the second vector
    * @returns A new Vector resulting from the addition of a, and x and y
    */
    add2(a: Vector, x: number, y: number): Vector {
        return Vec2.new(a.x + x, a.y + y);
    },

    /**
    * Subtracts one Vector from another
    * @param a - The Vector to be subtracted from
    * @param b - The Vector to subtract
    * @returns A new Vector resulting from the subtraction of vector b from vector a
    */
    sub(a: Vector, b: Vector): Vector {
        return Vec2.new(a.x - b.x, a.y - b.y);
    },

    /**
    * Subtracts one Vector from another
    * @param a - The Vector to be subtracted from
    * @param x - The x-coordinate of the second vector
    * @param y - The y-coordinate of the second vector
    * @returns A new Vector resulting from the subtraction of and x and y from vector a
    */
    sub2(a: Vector, x: number, y: number): Vector {
        return Vec2.new(a.x - x, a.y - y);
    },

    /**
    * Multiplies a Vector by a scalar
    * @param a - The Vector to be multiplied
    * @param n - The scalar value to multiply the Vector by
    * @returns A new Vector resulting from the multiplication of vector a and scalar n
    */
    mul(a: Vector, n: number): Vector {
        return Vec2.new(a.x * n, a.y * n);
    },

    /**
    * Divides a Vector by a scalar
    * @param a - The Vector to be divided
    * @param n - The scalar value to divide the Vector by
    * @returns A new Vector resulting from the division of vector a and scalar n
    */
    div(a: Vector, n: number): Vector {
        return Vec2.new(a.x / n, a.y / n);
    },

    /**
    * Clones a Vector
    * @param vector - The Vector to be cloned
    * @returns A new Vector with the same coordinates as the input Vector
    */
    clone(vector: Vector): Vector {
        return Vec2.new(vector.x, vector.y);
    },

    /**
    * Inverts a Vector
    * @param a - The Vector to be inverted
    * @returns A new Vector resulting from inverting vector a
    */
    invert(a: Vector): Vector {
        return Vec2.new(-a.x, -a.y);
    },

    /**
    * Rotates a Vector by a given angle
    * @param vector - The Vector to be rotated
    * @param angle - The angle in radians to rotate the Vector by
    * @returns A new Vector resulting from the rotation of the input Vector by the given angle
    */
    rotate(vector: Vector, angle: number): Vector {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return Vec2.new(vector.x * cos - vector.y * sin, vector.x * sin + vector.y * cos);
    },

    /**
     * Calculates the squared length of a Vector
     * @param a: The Vector
     * @returns The squared length of Vector a
     */
    lengthSqr(a: Vector): number {
        return a.x * a.x + a.y * a.y;
    },

    /**
     * Calculates the length of a Vector
     * @param a: The Vector
     * @returns The length of Vector a
     */
    length(a: Vector): number {
        return Math.sqrt(Vec2.lengthSqr(a));
    },

    /**
    * Gets the distance between two vectors
    * @param a - The first Vector
    * @param b - The second Vector
    * @returns The distance between Vector a and b
    */
    distance(a: Vector, b: Vector): number {
        const diff = Vec2.sub(a, b);
        return Vec2.length(diff);
    },

    /**
     * Normalizes a Vector
     * @param a: The Vector to be normalized
     * @returns A new Vector resulting from normalizing the input Vector
     */
    normalize(a: Vector): Vector {
        const eps = 0.000001;
        const len = Vec2.length(a);
        return {
            x: len > eps ? a.x / len : a.x,
            y: len > eps ? a.y / len : a.y
        };
    },

    normalizeSafe(a: Vector, b?: Vector): Vector {
        b = b ?? Vec2.new(1.0, 0.0);
        const eps = 0.000001;
        const len = Vec2.length(a);
        return {
            x: len > eps ? a.x / len : b.x,
            y: len > eps ? a.y / len : b.y
        };
    },

    /**
     * Interpolate between two Vectors
     * @param start The start Vector
     * @param end The end Vector
     * @param interpFactor The interpolation factor ranging from 0 to 1
     */
    vecLerp(start: Vector, end: Vector, interpFactor: number): Vector {
        return Vec2.add(Vec2.mul(start, 1 - interpFactor), Vec2.mul(end, interpFactor));
    },

    /**
     * Performs a dot product between two vectors
     * @param a The first Vector
     * @param b The second vector
     * @returns The result of performing the dot product between the two Vectors
     */
    dot(a: Vector, b: Vector): number {
        return a.x * b.x + a.y * b.y;
    }
};
