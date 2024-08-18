import type { GameBitStream } from "../net";
import { assert } from "./util";
import type { Vector } from "./vector";

//
// Typings shared between definition lists
//

export interface ImgDefinition {
    src: string;
    rotation?: number;
    scale?: number;
    tint?: number;
    zIndex?: number;
    position?: Vector;
    anchor?: Vector;
}

//
// Definition list
//

export class DefinitionList<Types extends string, Def extends object> {
    private readonly _typeToId = {} as unknown as Record<Types, number>;
    private readonly _idToType: Record<number, Types> = {};
    private _nextId = 0;
    private readonly _maxId: number;
    readonly bits: number;

    constructor(public definitions: Record<Types, Def>) {
        // Type 0 is reserved for sending optional types to the stream
        this._addType("" as Types);

        const keys = Object.keys(definitions) as Types[];
        // + 1 for the the above
        this._maxId = keys.length + 1;
        this.bits = Math.ceil(Math.log2(this._maxId));

        for (let i = 0; i < keys.length; i++) {
            this._addType(keys[i]);
        }
    }

    private _addType(type: Types): void {
        this._idToType[this._nextId] = type;
        this._typeToId[type] = this._nextId;
        this._nextId++;
    }

    typeToId(type: Types): number {
        const id = this._typeToId[type];
        assert(type !== undefined, `Invalid type: ${type.toString()}`);
        return id;
    }

    idToType(id: number): Types {
        const type = this._idToType[id];
        assert(type !== undefined, `Invalid id ${id}, max: ${this._maxId}`);
        return type;
    }

    /**
     * Get a definition from a type
     */
    typeToDef(type: Types): Def {
        const def = this.definitions[type];
        assert(def !== undefined, `Invalid type: ${type.toString()}`);
        return def;
    }

    /**
     * Write a definition to a stream
     */
    write(stream: GameBitStream, type: Types) {
        stream.writeBits(this.typeToId(type), this.bits);
    }

    /**
     * Read a definition from the stream
     */
    read(stream: GameBitStream): Types {
        return this.idToType(stream.readBits(this.bits));
    }

    [Symbol.iterator]() {
        return (Object.keys(this.definitions) as Array<Types>)[Symbol.iterator]();
    }
}
