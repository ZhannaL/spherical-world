// @flow
import { promisify } from 'util';
import fs from 'fs-extra';
import zlib from 'zlib';
import type ChunkMap from './ChunkMap';
import type Terrain from './Terrain';
import type ChunkGenerator from './ChunkGenerator';
import IO from '../../common/fp/monads/io';
import { profileChunkGeneration } from '../../common/profileUtils';
import { generate, generateObjects } from './ChunkGenerator';
import { getGeoId } from '../../common/chunk';

const profileChunkGenerationBase = profileChunkGeneration();
const profileChunkGenerationFoliage = profileChunkGeneration('Foliage generation');

const {
  readFile,
  outputFile,
} : {
  readFile: (string) => Promise<Buffer>, /** stupid eslint */ // eslint-disable-line
  outputFile: (string, Buffer | string) => Promise<void>, /** stupid eslint  */ // eslint-disable-line
} = fs;

const deflate: (Buffer) => Promise<Buffer> = promisify(zlib.deflate);

class Chunk {
  terrain: Terrain;
  +x: number;
  +z: number;
  +geoId: string;
  fileName: string;
  metaFileName: string;
  filePath: string;
  metaPath: string;
  data: Buffer;
  chunkGenerator: ChunkGenerator;
  changesCount: number;
  terrainGenerated: boolean = false;
  objectsGenerated: boolean = false;
  northChunk: Chunk;
  southChunk: Chunk;
  westChunk: Chunk;
  eastChunk: Chunk;
  heightMap: ChunkMap<number>;
  rainfall: ChunkMap<number>;
  temperature: ChunkMap<number>;

  constructor(terrain: Terrain, x: number, z: number) {
    this.terrain = terrain;
    this.x = x;
    this.z = z;
    this.chunkGenerator = terrain.chunkGenerator;
    this.geoId = getGeoId(x, z);
    this.fileName = `${this.geoId}.bin`;
    this.metaFileName = `${this.geoId}.meta.json`;
    this.filePath = `./map/${this.terrain.locationName}/${this.fileName}`;
    this.metaPath = `./map/${this.terrain.locationName}/${this.metaFileName}`;
  }

  async load(): Promise<Chunk> {
    this.data = await readFile(this.filePath);
    return this;
  }

  async getCompressedData(): Promise<Buffer> {
    return deflate(this.data);
  }

  async generate(): Promise<Chunk> {
    if (this.terrainGenerated) {
      return this;
    }
    this.data = Buffer.alloc(65536);
    await new Promise((resolve) => {
      generate(this.chunkGenerator, this)
        .map(resolve)
        .map(profileChunkGenerationBase)
        .run();
    });
    // await this.northChunk.generateObjects();
    // await this.southChunk.generateObjects();
    // await this.westChunk.generateObjects();
    // await this.eastChunk.generateObjects();
    // await this.northChunk.westChunk.generateObjects();
    // await this.northChunk.westChunk.generateObjects();
    // await this.southChunk.westChunk.generateObjects();
    // await this.southChunk.eastChunk.generateObjects();

    // if (this.northChunk) {
    //   await this.northChunk.generateObjects();
    //   if (this.northChunk.westChunk) {
    //     await this.northChunk.westChunk.generateObjects();
    //   }
    //   if (this.northChunk.westChunk) {
    //     await this.northChunk.westChunk.generateObjects();
    //   }
    // }
    // if (this.southChunk) {
    //   await this.southChunk.generateObjects();
    //   if (this.southChunk.westChunk) {
    //     await this.southChunk.westChunk.generateObjects();
    //   }
    //   if (this.southChunk.eastChunk) {
    //     await this.southChunk.eastChunk.generateObjects();
    //   }
    // }
    // if (this.westChunk) {
    //   await this.westChunk.generateObjects();
    // }
    // if (this.eastChunk) {
    //   await this.eastChunk.generateObjects();
    // }
    this.terrainGenerated = true;
    return this;
  }

  async generateWithSurrounding(depth: number): Promise<Chunk> {
    // if (!depth) {
    //   return this;
    // }
    // const [
    //   northChunk,
    //   southChunk,
    //   westChunk,
    //   eastChunk,
    //   northWestChunk,
    //   northEastChunk,
    //   southWestChunk,
    //   southEastChunk,
    // ] =
    const chunks = await Promise.all([
      this.terrain.ensureChunk(this.x - 16, this.z),
      this.terrain.ensureChunk(this.x + 16, this.z),
      this.terrain.ensureChunk(this.x, this.z - 16),
      this.terrain.ensureChunk(this.x, this.z + 16),
      this.terrain.ensureChunk(this.x - 16, this.z - 16),
      this.terrain.ensureChunk(this.x - 16, this.z + 16),
      this.terrain.ensureChunk(this.x + 16, this.z - 16),
      this.terrain.ensureChunk(this.x + 16, this.z + 16),
    ]);
    // await this.generate();

    if (depth) {
      await Promise.all(chunks.map((chunk: Chunk) => chunk.generateWithSurrounding(depth - 1)));
      if (depth >= 2) {
        await this.generateObjects();
        await this.northChunk.generateObjects();
        await this.southChunk.generateObjects();
        await this.westChunk.generateObjects();
        await this.eastChunk.generateObjects();
        await this.northChunk.westChunk.generateObjects();
        await this.northChunk.eastChunk.generateObjects();
        await this.southChunk.westChunk.generateObjects();
        await this.southChunk.eastChunk.generateObjects();
      }
    }
    return this;
  }

  async save(): Promise<Chunk> {
    outputFile(this.filePath, this.data);
    this.saveMeta();
    return this;
  }

  async saveMeta(): Promise<Chunk> {
    outputFile(this.filePath, JSON.stringify({
      objectsGenerated: this.objectsGenerated,
    }));
    return this;
  }

  setAt(x: number, y: number, z: number, block: number): void {
    let chunk = this;
    if (x < 0) {
      chunk = chunk.northChunk;
      x += 16;
    } else if (x > 15) {
      chunk = chunk.southChunk;
      x -= 16;
    }
    if (z < 0) {
      chunk = chunk.westChunk;
      z += 16;
    } else if (z > 15) {
      chunk = chunk.eastChunk;
      z -= 16;
    }
    chunk.data[x + (z << 4) + (y << 8)] = block;
  }

  setAtIndex(index: number, block: number): void {
    const chunk = this;
    chunk.data[index] = block;
  }

  at(x: number, y: number, z: number): number {
    let chunk = this;
    if (x < 0) {
      chunk = chunk.northChunk;
      x += 16;
    } else if (x > 15) {
      chunk = chunk.southChunk;
      x -= 16;
    }
    if (z < 0) {
      chunk = chunk.westChunk;
      z += 16;
    } else if (z > 15) {
      chunk = chunk.eastChunk;
      z -= 16;
    }
    return chunk.data[x + (z << 4) + (y << 8)];
  }

  async generateObjects(): Promise<Chunk> {
    if (this.objectsGenerated) {
      return this;
    }
    await new Promise((resolve) => {
      generateObjects(this.chunkGenerator, this)
        .map(resolve)
        .map(profileChunkGenerationFoliage)
        .run();
    });
    this.objectsGenerated = true;
    return this;
  }

  setHeightMap(heightMap: ChunkMap<number>): Chunk => IO<Chunk> {
    return chunk => IO.from(() => {
      this.heightMap = heightMap;
      return chunk;
    });
  }

  setRainfall(rainfall: ChunkMap<number>): Chunk => IO<Chunk> {
    return chunk => IO.from(() => {
      this.rainfall = rainfall;
      return chunk;
    });
  }

  setTemperature(temperature: ChunkMap<number>): Chunk => IO<Chunk> {
    return chunk => IO.from(() => {
      this.temperature = temperature;
      return chunk;
    });
  }
}

export default Chunk;
