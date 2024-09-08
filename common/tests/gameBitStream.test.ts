import { expect, test } from "bun:test";
import { GameBitStream } from "../src/net";

function equalAbs(a: number, b: number) {
    return Math.abs(a - b) < 0.001;
}

test("Clamped Floats", () => {
    const stream = GameBitStream.alloc(100);

    stream.writeFloat(69.1, 0, 100, 16);
    stream.writeFloat(-1.1, -10, 10, 16);

    stream.index = 0;
    expect(equalAbs(stream.readFloat(0, 100, 16), 69.1)).toBe(true);
    expect(equalAbs(stream.readFloat(-10, 10, 16), -1.1)).toBe(true);
});

test("Arrays", () => {
    const stream = GameBitStream.alloc(100);

    const arr = ["bleh", "meow", ":3"];

    stream.writeArray(arr, 8, (item) => {
        stream.writeASCIIString(item);
    });

    stream.index = 0;

    const newArr: string[] = [];
    stream.readArray(newArr, 8, () => {
        return stream.readASCIIString();
    });

    expect(newArr).toEqual(arr);
});
