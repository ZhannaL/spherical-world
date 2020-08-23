import { vec3 } from 'gl-matrix';
import type { World } from '../../common/ecs/World';
import { blocksInfo } from '../blocks/blockInfo';
import type { System } from '../../common/ecs/System';
import { Transform, BlockRemover, Player, Visual, Raytracer, Joint } from '../components';
import {
  PLAYER_ATTACKED,
  PLAYER_STOPED_ATTACK,
  PLAYER_START_PUT_BLOCK,
  PLAYER_PUT_BLOCK,
} from '../player/events';
import { getGeoId } from '../../common/chunk';
import { ClientToServerMessage } from '../../common/protocol';
// import { Sound } from '../Sound';

// import woodHit from '../sounds/wood_hit.wav';

// const blockRemoveSound = new Sound({ src: woodHit });

const getPutBlockEvents = (world: World, picker) =>
  world.events
    .filter((e) => e.type === PLAYER_START_PUT_BLOCK)
    .subscribe(() => {
      const { emptyBlock, face, hasEmptyBlock } = picker[0].raytracer;
      if (hasEmptyBlock) {
        const inventory = world.objects.get(picker[0].transform.parent).inventory.data;
        const item = inventory.items[inventory.selectedItem];
        if (!item || !item.count) {
          return;
        }
        item.count -= 1;
        if (!item.count) {
          const { [inventory.selectedItem]: toRemove, ...newItems } = inventory.items;
          inventory.items = newItems;
        } else {
          inventory.items = { ...inventory.items };
        }
        world.createEventAndDispatch(
          PLAYER_PUT_BLOCK,
          {
            flags: face,
            geoId: getGeoId(...emptyBlock.coordinates),
            position: Array.from(emptyBlock.position),
            positionInChunk: Array.from(emptyBlock.positionInChunk),
            blockId: item.itemTypeId,
            itemId: item.id,
          },
          true,
        );
      }
    });

const getPlayerAttackEvents = (world: World) =>
  world.events
    .filter((e) => e.type === PLAYER_ATTACKED || e.type === PLAYER_STOPED_ATTACK)
    .map((e) => e.type === PLAYER_ATTACKED)
    .subscribeQueue();

export default (world: World): System => {
  const removers = world.createSelector([Transform, BlockRemover, Visual, Joint]);
  const picker = world.createSelector([Transform, Player, Raytracer, Visual]);

  const playerAttackEvents = getPlayerAttackEvents(world);
  getPutBlockEvents(world, picker);

  const raytracerRegistry = world.components.get('raytracer');
  if (!raytracerRegistry) {
    throw new Error();
  }

  const blockRemove = (delta: number) => {
    for (const { visual, blockRemover, id, joint } of removers) {
      if (!joint.raytracer) {
        joint.raytracer = raytracerRegistry.get(joint.parent);
      }
      const { block } = joint.raytracer;
      if (id === id) {
        // TODO: main player ID
        const { removing } = blockRemover;
        playerAttackEvents.events.forEach((possibleRemoving) => {
          blockRemover.removing = possibleRemoving;
        });
        if (removing !== blockRemover.removing) {
          world.createEventAndDispatch(
            ClientToServerMessage.playerStartedDestroyingBlock,
            block.position,
            true,
          );
        }
      }
      if (
        blockRemover.removing &&
        block.block &&
        vec3.exactEquals(block.position, blockRemover.position)
      ) {
        // blockRemoveSound.audioData.play();
        visual.enabled = true;
        blockRemover.removedPart += (1 / blocksInfo[block.block].baseRemoveTime) * delta;
        if (blockRemover.removedPart >= 1) {
          blockRemover.removedPart = 0;
          world.createEventAndDispatch(
            ClientToServerMessage.playerDestroyedBlock,
            {
              geoId: getGeoId(...block.coordinates),
              positionInChunk: Array.from(block.positionInChunk),
              position: Array.from(block.position),
            },
            true,
          );
        }
      } else {
        visual.enabled = false;
        blockRemover.removedPart = 0;
      }
      blockRemover.position = block.position;
      const maxFrames = visual.glObject.material.diffuse.frames;
      visual.glObject.material.frame = Math.floor(maxFrames * blockRemover.removedPart);
    }
    for (const { visual, raytracer } of picker) {
      visual.enabled = !!raytracer.block.block;
    }
    playerAttackEvents.clear();
  };
  return blockRemove;
};
