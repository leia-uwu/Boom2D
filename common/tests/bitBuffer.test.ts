import { expect, test } from "bun:test";
import { BitStream } from "../src/bitBuffer";

test("byte aligned unsigned int", () => {
    const stream = new BitStream(new ArrayBuffer(100));

    stream.writeUint8(99);
    stream.writeUint16(999);
    stream.writeUint32(9999);

    stream.index = 0;

    expect(stream.readUint8()).toBe(99);
    expect(stream.readUint16()).toBe(999);
    expect(stream.readUint32()).toBe(9999);
});

test("byte aligned signed int", () => {
    const stream = new BitStream(new ArrayBuffer(100));

    stream.writeInt8(-99);
    stream.writeInt16(-999);
    stream.writeInt32(-9999);

    stream.index = 0;

    expect(stream.readInt8()).toBe(-99);
    expect(stream.readInt16()).toBe(-999);
    expect(stream.readInt32()).toBe(-9999);
});

test("non byte aligned unsigned int", () => {
    const stream = new BitStream(new ArrayBuffer(100));

    stream.writeBits(9, 5);
    stream.writeUint8(99);
    stream.writeBits(99, 10);
    stream.writeUint16(999);
    stream.writeBits(999, 20);
    stream.writeUint32(9999);

    stream.index = 0;

    expect(stream.readBits(5)).toBe(9);
    expect(stream.readUint8()).toBe(99);
    expect(stream.readBits(10)).toBe(99);
    expect(stream.readUint16()).toBe(999);
    expect(stream.readBits(20)).toBe(999);
    expect(stream.readUint32()).toBe(9999);
});

test("non byte aligned signed int", () => {
    const stream = new BitStream(new ArrayBuffer(100));

    stream.writeBits(-9, 5);
    stream.writeInt8(-99);
    stream.writeBits(-99, 10);
    stream.writeInt16(-999);
    stream.writeBits(-999, 20);
    stream.writeInt32(-9999);

    stream.index = 0;

    expect(stream.readBits(5, true)).toBe(-9);
    expect(stream.readInt8()).toBe(-99);
    expect(stream.readBits(10, true)).toBe(-99);
    expect(stream.readInt16()).toBe(-999);
    expect(stream.readBits(20, true)).toBe(-999);
    expect(stream.readInt32()).toBe(-9999);
});

function equalAbs(a: number, b: number) {
    return Math.abs(a - b) < 0.00001;
}

test("Floating points", () => {
    const stream = new BitStream(new ArrayBuffer(100));

    stream.writeFloat32(69.42);
    stream.writeFloat64(Math.PI);

    stream.index = 0;

    expect(equalAbs(stream.readFloat32(), 69.42)).toBe(true);
    expect(stream.readFloat64()).toBe(Math.PI);
});

test("ASCII Strings", () => {
    const stream = new BitStream(new ArrayBuffer(100));

    const str = "bananas123";
    stream.writeASCIIString(str);

    stream.index = 0;

    expect(stream.readASCIIString()).toBe(str);
});

test("UTF-8 Strings", () => {
    const stream = new BitStream(new ArrayBuffer(100));

    const str = "bananas123 🏳️‍⚧️ 🏳️‍🌈 💜";
    stream.writeUTF8String(str);

    stream.index = 0;

    expect(stream.readUTF8String()).toBe(str);
});
