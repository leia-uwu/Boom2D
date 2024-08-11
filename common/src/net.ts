import { BitStream } from "bit-buffer";
import { GameConstants } from "./constants";
import { DeathPacket } from "./packets/deathPacket";
import { InputPacket } from "./packets/inputPacket";
import { JoinPacket } from "./packets/joinPacket";
import { JoinedPacket } from "./packets/joinedPacket";
import { KillPacket } from "./packets/killPacket";
import { MapPacket } from "./packets/mapPacke";
import { QuitPacket } from "./packets/quitPacket";
import { RespawnPacket } from "./packets/respawnPacket";
import { UpdatePacket } from "./packets/updatePacket";
import { type HitboxJSON, HitboxType } from "./utils/hitbox";
import { MathUtils } from "./utils/math";
import { assert } from "./utils/util";
import type { Vector } from "./utils/vector";

export class GameBitStream extends BitStream {
    static alloc(size: number): GameBitStream {
        return new GameBitStream(new ArrayBuffer(size));
    }
    /**
     * Write a floating point number to the stream
     * @param value The number
     * @param min The minimum number
     * @param max The maximum number
     * @param bitCount The number of bits to write
     */
    writeFloat(value: number, min: number, max: number, bitCount: number): void {
        assert(
            bitCount > 0 || bitCount <= 31,
            `bit count out of range: ${bitCount}, range: [0, 31]`
        );

        assert(
            value < max || value > min,
            `Value out of range: ${value}, range: [${min}, ${max}]`
        );
        const range = (1 << bitCount) - 1;
        const clamped = MathUtils.clamp(value, min, max);
        this.writeBits(((clamped - min) / (max - min)) * range + 0.5, bitCount);
    }

    /**
     * Read a floating point number from the stream
     * @param min The minimum number
     * @param max The maximum number
     * @param bitCount The number of bits to read
     * @return The floating point number
     */
    readFloat(min: number, max: number, bitCount: number): number {
        assert(
            bitCount > 0 || bitCount <= 31,
            `bit count out of range: ${bitCount}, range: [0, 31]`
        );
        const range = (1 << bitCount) - 1;
        return min + ((max - min) * this.readBits(bitCount)) / range;
    }

    /**
     * Write a position Vector to the stream.
     * @param vector The Vector.
     * @param minX The minimum X position.
     * @param minY The minimum Y position.
     * @param maxX The maximum X position.
     * @param maxY The maximum Y position.
     * @param bitCount The number of bits to write.
     */
    writeVector(
        vector: Vector,
        minX: number,
        minY: number,
        maxX: number,
        maxY: number,
        bitCount: number
    ): void {
        this.writeVector2(vector.x, vector.y, minX, minY, maxX, maxY, bitCount);
    }

    /**
     * Write a position Vector to the stream.
     * @param x The X position.
     * @param y The Y position.
     * @param minX The minimum X position.
     * @param minY The minimum Y position.
     * @param maxX The maximum X position.
     * @param maxY The maximum Y position.
     * @param bitCount The number of bits to write.
     * @return The position Vector.
     */
    writeVector2(
        x: number,
        y: number,
        minX: number,
        minY: number,
        maxX: number,
        maxY: number,
        bitCount: number
    ): void {
        this.writeFloat(x, minX, maxX, bitCount);
        this.writeFloat(y, minY, maxY, bitCount);
    }

    /**
     * Read a position Vector from the stream.
     * @param minX The minimum X position.
     * @param minY The minimum Y position.
     * @param maxX The maximum X position.
     * @param maxY The maximum Y position.
     * @param bitCount The number of bits to read
     */
    readVector(
        minX: number,
        minY: number,
        maxX: number,
        maxY: number,
        bitCount: number
    ): Vector {
        return {
            x: this.readFloat(minX, maxX, bitCount),
            y: this.readFloat(minY, maxY, bitCount)
        };
    }

    /**
     * Write a position Vector to the stream with the game default max and minimum X and Y.
     * @param vector The Vector to write.
     */
    writePosition(vector: Vector): void {
        this.writePosition2(vector.x, vector.y);
    }

    /**
     * Write a position Vector to the stream with the game default max and minimum X and Y.
     * @param x The x-coordinate of the vector to write
     * @param y The y-coordinate of the vector to write
     */
    writePosition2(x: number, y: number): void {
        this.writeVector2(
            x,
            y,
            -32,
            -32,
            GameConstants.maxPosition,
            GameConstants.maxPosition,
            16
        );
    }

    /**
     * Read a position Vector from stream with the game default max and minimum X and Y.
     * @return the position Vector.
     */
    readPosition(): Vector {
        return this.readVector(
            -32,
            -32,
            GameConstants.maxPosition,
            GameConstants.maxPosition,
            16
        );
    }

    static unitEps = 1.0001;
    /**
     * Write an unit vector to the stream
     * @param vector The Vector to write.
     * @param bitCount The number of bits to write.
     */
    writeUnit(vector: Vector, bitCount: number): void {
        this.writeVector(
            vector,
            -GameBitStream.unitEps,
            -GameBitStream.unitEps,
            GameBitStream.unitEps,
            GameBitStream.unitEps,
            bitCount
        );
    }

    /**
     * Read an unit vector from the stream
     * @param bitCount The number of bits to read.
     * @return the unit Vector.
     */
    readUnit(bitCount: number): Vector {
        return this.readVector(
            -GameBitStream.unitEps,
            -GameBitStream.unitEps,
            GameBitStream.unitEps,
            GameBitStream.unitEps,
            bitCount
        );
    }

    /**
     * Write an array to the stream
     * @param arr An array containing the items to serialize
     * @param bitCount The amount of bits to write for the array size
     * @param serializeFn The function to serialize each array item
     */
    writeArray<T>(arr: T[], bitCount: number, serializeFn: (item: T) => void): void {
        assert(
            bitCount > 0 || bitCount <= 31,
            `bit count out of range: ${bitCount}, range: [0, 31]`
        );

        this.writeBits(arr.length, bitCount);

        const maxSize = 1 << bitCount;
        for (let i = 0; i < arr.length; i++) {
            if (i > maxSize) {
                console.warn(
                    `writeArray: array overflow: max length: ${maxSize}, length: ${arr.length}`
                );
                break;
            }
            serializeFn(arr[i]);
        }
    }

    /**
     * Read an array from the stream
     * @param arr The array to add the deserialized elements;
     * @param bits The amount of bits to read for the array size
     * @param serializeFn The function to de-serialize each array item
     */
    readArray<T>(arr: T[], bitCount: number, deserializeFn: () => T): void {
        assert(
            bitCount > 0 || bitCount <= 31,
            `bit count out of range: ${bitCount}, range: [0, 31]`
        );

        const size = this.readBits(bitCount);

        for (let i = 0; i < size; i++) {
            arr.push(deserializeFn());
        }
    }

    // private field L
    declare _view: {
        _view: Uint8Array;
    };

    /**
     * Copy bytes from a source stream to this stream
     * !!!NOTE: Both streams index must be byte aligned
     * @param src The source bit stream to copy
     * @param offset The offset to start copying bytes
     * @param length The amount of bytes to copy
     */
    writeBytes(src: GameBitStream, offset: number, length: number): void {
        assert(this.index % 8 == 0, "WriteBytes: stream must be byte aligned");

        const data = new Uint8Array(src._view._view.buffer, offset, length);
        this._view._view.set(data, this.index / 8);
        this.index += length * 8;
    }

    /**
     * Writes a byte alignment to the stream
     * This is to ensure the stream index is a multiple of 8
     */
    writeAlignToNextByte(): void {
        const offset = 8 - (this.index % 8);
        if (offset < 8) this.writeBits(0, offset);
    }

    /**
     * Read a byte alignment from the stream
     */
    readAlignToNextByte(): void {
        const offset = 8 - (this.index % 8);
        if (offset < 8) this.readBits(offset);
    }

    writeHitbox(hitbox: HitboxJSON) {
        this.writeBits(hitbox.type, 2);

        switch (hitbox.type) {
            case HitboxType.Circle: {
                this.writeFloat(hitbox.radius, 0, GameConstants.maxPosition, 16);
                this.writePosition(hitbox.position);
                break;
            }
            case HitboxType.Rect: {
                this.writePosition(hitbox.min);
                this.writePosition(hitbox.max);
                break;
            }
            case HitboxType.Polygon: {
                this.writeArray(hitbox.verts, 16, (point) => {
                    this.writePosition(point);
                });
            }
        }
    }

    readHitbox(): HitboxJSON {
        const type = this.readBits(2) as HitboxType;

        switch (type) {
            case HitboxType.Circle: {
                const radius = this.readFloat(0, GameConstants.maxPosition, 16);
                const position = this.readPosition();
                return {
                    type: HitboxType.Circle,
                    radius,
                    position
                };
            }
            case HitboxType.Rect: {
                const min = this.readPosition();
                const max = this.readPosition();
                return {
                    type: HitboxType.Rect,
                    min,
                    max
                };
            }
            case HitboxType.Polygon: {
                const verts: Vector[] = [];
                this.readArray(verts, 16, () => {
                    return this.readPosition();
                });
                return {
                    type: HitboxType.Polygon,
                    verts
                };
            }
        }
    }
}

export interface Packet {
    serialize(stream: GameBitStream): void;
    deserialize(stream: GameBitStream): void;
}

class PacketRegister {
    private _nextTypeId = 0;
    readonly typeToId: Record<string, number> = {};
    readonly idToCtor: Array<new () => Packet> = [];

    register(...packets: Array<new () => Packet>) {
        for (const packet of packets) {
            if (this.typeToId[packet.name]) {
                console.warn(`Trying to register ${packet.name} multiple times`);
                continue;
            }
            const id = this._nextTypeId++;
            this.typeToId[packet.name] = id;
            this.idToCtor[id] = packet;
        }
    }

    serializePacket(stream: GameBitStream, packet: Packet) {
        const type = this.typeToId[packet.constructor.name];
        assert(
            type !== undefined,
            `Unknown packet type: ${packet.constructor.name}, did you forget to register it?`
        );

        stream.writeUint8(type);
        packet.serialize(stream);
        stream.writeAlignToNextByte();
    }

    deserializePacket(stream: GameBitStream): Packet | undefined {
        if (stream.length - stream.byteIndex * 8 >= 1) {
            try {
                const id = stream.readUint8();
                const packet = new this.idToCtor[id]();
                packet.deserialize(stream);
                stream.readAlignToNextByte();
                return packet;
            } catch (e) {
                console.error("Failed deserializing packet: ", e);
                return undefined;
            }
        }
        return undefined;
    }
}

const ClientToServerPackets = new PacketRegister();
ClientToServerPackets.register(JoinPacket, InputPacket, RespawnPacket, QuitPacket);

const ServerToClientPackets = new PacketRegister();
ServerToClientPackets.register(
    UpdatePacket,
    JoinedPacket,
    DeathPacket,
    MapPacket,
    KillPacket
);

export class PacketStream {
    stream: GameBitStream;
    buffer: ArrayBuffer;

    constructor(source: ArrayBuffer) {
        this.buffer = source;
        this.stream = new GameBitStream(source);
    }

    static alloc(size: number): PacketStream {
        return new PacketStream(new ArrayBuffer(size));
    }

    serializeServerPacket(packet: Packet) {
        ServerToClientPackets.serializePacket(this.stream, packet);
    }

    deserializeServerPacket(): Packet | undefined {
        return ServerToClientPackets.deserializePacket(this.stream);
    }

    serializeClientPacket(packet: Packet) {
        ClientToServerPackets.serializePacket(this.stream, packet);
    }

    deserializeClientPacket(): Packet | undefined {
        return ClientToServerPackets.deserializePacket(this.stream);
    }

    getBuffer(): ArrayBuffer {
        return this.buffer.slice(0, this.stream.byteIndex);
    }
}
