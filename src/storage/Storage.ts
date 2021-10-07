import {v4 as uuidv4} from 'uuid';

import {StorageType} from './StorageType';

export class StorageError extends Error {}

export enum StorageEntryType {
    DIRECTORY = 'DIRECTORY',
    FILE = 'FILE'
}

export abstract class StorageEntry<DirectoryHandle, FileHandle> {

    protected storage: Storage<DirectoryHandle, FileHandle>;
    protected parent: StorageDirectory<DirectoryHandle, FileHandle> | null;
    protected type: StorageEntryType;
    protected handle: DirectoryHandle | FileHandle;

    constructor(
        storage: Storage<DirectoryHandle, FileHandle>,
        parent: StorageDirectory<DirectoryHandle, FileHandle> | null,
        handle: DirectoryHandle | FileHandle,
        type: StorageEntryType
    ) {
        this.storage = storage;
        this.parent = parent;
        this.handle = handle;
        this.type = type;
    }

    getStorage() {
        return this.storage;
    }

    getParent() {
        return this.parent;
    }

    getHandle() {
        return this.handle;
    }

    getType() {
        return this.type;
    }

    abstract getName(): string;

    getExtension() {
        const name = this.getName();
        return name.substring(name.indexOf('.') + 1, name.length);
    }

    getPath(): string[] {
        if (!this.parent) {
            return [];
        }
        return this.parent.getParent() ? [...this.parent.getPath(), this.getName()] : [this.getName()];
    }

    abstract delete(): Promise<void>;
}

// TODO: copy, move

export abstract class StorageDirectory<DirectoryHandle, FileHandle> extends StorageEntry<DirectoryHandle, FileHandle> {

    protected handle: DirectoryHandle;

    constructor(storage: Storage<DirectoryHandle, FileHandle>, parent: StorageDirectory<DirectoryHandle, FileHandle> | null, handle: DirectoryHandle) {
        super(storage, parent, handle, StorageEntryType.DIRECTORY);
    }

    getHandle() {
        return this.handle;
    }

    abstract getEntries(force?: boolean): Promise<StorageEntry<DirectoryHandle, FileHandle>[]>;

    abstract getEntry(name: string, force?: boolean): Promise<StorageEntry<DirectoryHandle, FileHandle> | undefined>;

    abstract createDirectory(name: string): Promise<StorageDirectory<DirectoryHandle, FileHandle>>;

    abstract createFile(name: string): Promise<StorageFile<DirectoryHandle, FileHandle>>;

    async print(indent = '') {
        console.log(`${indent}${this.getName()} (${this.getType().substring(0, 1)})`);
        indent += '|  ';

        for (const entry of await this.getEntries()) {
            if (entry instanceof StorageDirectory) {
                await entry.print(indent);
            } else {
                console.log(`${indent}${entry.getName()} (${entry.getType().substring(0, 1)})`);
            }
        }
    }
}

export abstract class StorageFile<DirectoryHandle, FileHandle> extends StorageEntry<DirectoryHandle, FileHandle> {

    protected parent: StorageDirectory<DirectoryHandle, FileHandle>;
    protected handle: FileHandle;

    constructor(storage: Storage<DirectoryHandle, FileHandle>, parent: StorageDirectory<DirectoryHandle, FileHandle>, handle: FileHandle) {
        super(storage, parent, handle, StorageEntryType.FILE);
    }

    getParent() {
        return this.parent;
    }

    getHandle() {
        return this.handle;
    }

    abstract read(): Promise<string>;

    async readJSON() {
        return JSON.parse(await this.read());
    }

    abstract write(content: string): Promise<void>;

    async writeJSON(content: unknown) {
        await this.write(JSON.stringify(content));
    }
}

export abstract class Storage<DirectoryHandle, FileHandle> {

    private id: string;

    static getType(): StorageType {
        throw new Error('Not implemented.');
    }

    static getName() {
        return this.name.replace('Storage', '');
    }

    static getAddText() {
        return `Add ${this.getName()} storage`;
    }

    constructor(id?: string) {
        this.id = id || uuidv4();
    }

    getID() {
        return this.id;
    }

    getType() {
        return (this.constructor as typeof Storage).getType();
    }

    getName() {
        return (this.constructor as typeof Storage).getName();
    }

    abstract serialize(): Record<string, unknown>;

    abstract deserialize(data: Record<string, unknown>): void;

    abstract getRoot(): Promise<StorageDirectory<DirectoryHandle, FileHandle>>;

    abstract hasPermission(): Promise<boolean>;

    abstract requestPermission(): Promise<boolean>;

    abstract add(): Promise<void>;

    async getEntry(path: string[]) {
        let current = await this.getRoot();
        for (let i = 0; i < path.length; i++) {
            const entry = await current.getEntry(path[i]);
            if (!entry) {
                throw new StorageError(`Entry "${path[i]}" in path "${path.join('/')}" does not exist.`);
            }
            if (i < path.length - 1) {
                if (!(entry instanceof StorageDirectory)) {
                    throw new StorageError(`Entry "${path[i]}" in path "${path.join('/')}" is not a directory.`);
                }
                current = entry;
                continue;
            }

            return entry as StorageFile<unknown, unknown>;
        }
        throw new Error('Unreachable code.');
    }
}
