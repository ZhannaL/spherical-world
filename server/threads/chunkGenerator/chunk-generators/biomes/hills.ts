import { Biome } from '../biome';
import { ChunkGenerator, BlockPositionData } from '../../types';
import { AIR, TALL_GRASS, FLOWER_YELLOW, FLOWER_RED, TORCH } from '../../../../../common/blocks';

const generateWithSurroundingChunks = (
  generator: ChunkGenerator,
  { chunk, height, x, z }: BlockPositionData,
) => {
  const s = generator.simplexFoliage(x, z);
  chunk.generateAt(x, height, z, () => {
    if (s < 0) return AIR;
    if (s < 0.9) return TALL_GRASS;
    if (s < 0.93) return FLOWER_YELLOW;
    if (s < 0.95) return FLOWER_RED;
    if (s < 0.99) return TORCH;
    return AIR;
  });
  if (s > 0.99) generator.generateTree(chunk, x, height, z);
  return chunk;
};

export const hills: Biome = {
  generateWithSurroundingChunks,
};