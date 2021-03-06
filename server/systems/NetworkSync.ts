import type { World } from '../../common/ecs/World';
import type { System } from '../../common/ecs/System';
import type { Server } from '../server';
import { send } from '../network/socket';
import { Transform, Network, Inventory } from '../components';
import { ServerToClientMessage } from '../../common/protocol';

const getComponentsToUpdate = (world: World, playerId: string) =>
  [...world.components.entries()]
    .map(([constructor, data]) => [world.componentTypes.get(constructor), data])
    .filter(([constructor]) => constructor.componentName === 'transform')
    .map(([constructor, data]) =>
      constructor.componentName === 'transform'
        ? {
            type: constructor.componentName,
            data: [...data.entries()]
              .filter(([id]) => id !== playerId)
              .map(([_, value]) => [_, value.serialize()]),
          }
        : { type: constructor.componentName, data: [...data.entries()] },
    );

const RENDER_DISTANCE = 8;
const VISIBILITY = RENDER_DISTANCE + 2; // 1 chunk around will have loaded lights but not vbo, and another 1 will have no lights loaded

const calcPlayerMovement = (server: Server, transform: Transform, network) => {
  const [x, , z] = transform.translation;

  const chunkX = Math.floor(x / 16) * 16;
  const chunkZ = Math.floor(z / 16) * 16;

  const chunkXold: number = transform.chunkX ?? chunkX;
  const chunkZold: number = transform.chunkZ ?? chunkZ;

  if (chunkX < chunkXold && transform.chunkXLoad > 0) {
    for (let i = -VISIBILITY; i < VISIBILITY + 1; i += 1) {
      server.terrain.sendChunk(
        { socket: network.socket },
        chunkX - (VISIBILITY - 1) * 16,
        chunkZ + i * 16,
      );
      send(network.socket, {
        type: ServerToClientMessage.unloadChunk,
        data: { x: chunkX + (VISIBILITY + 1) * 16, z: chunkZ + i * 16 },
      });
    }
  } else if (chunkX > chunkXold && transform.chunkXLoad < 0) {
    for (let i = -VISIBILITY; i < VISIBILITY + 1; i += 1) {
      server.terrain.sendChunk(
        { socket: network.socket },
        chunkX + (VISIBILITY - 1) * 16,
        chunkZ + i * 16,
      );
      send(network.socket, {
        type: ServerToClientMessage.unloadChunk,
        data: { x: chunkX - (VISIBILITY + 1) * 16, z: chunkZ + i * 16 },
      });
    }
  }
  if (chunkZ < chunkZold && transform.chunkZLoad > 0) {
    for (let i = -VISIBILITY; i < VISIBILITY + 1; i += 1) {
      server.terrain.sendChunk(
        { socket: network.socket },
        chunkX + i * 16,
        chunkZ - (VISIBILITY - 1) * 16,
      );
      send(network.socket, {
        type: ServerToClientMessage.unloadChunk,
        data: { x: chunkX + i * 16, z: chunkZ + (VISIBILITY + 1) * 16 },
      });
    }
  } else if (chunkZ > chunkZold && transform.chunkZLoad < 0) {
    for (let i = -VISIBILITY; i < VISIBILITY + 1; i += 1) {
      server.terrain.sendChunk(
        { socket: network.socket },
        chunkX + i * 16,
        chunkZ + (VISIBILITY - 1) * 16,
      );
      send(network.socket, {
        type: ServerToClientMessage.unloadChunk,
        data: { x: chunkX + i * 16, z: chunkZ - (VISIBILITY + 1) * 16 },
      });
    }
  }
  transform.chunkX = chunkX;
  transform.chunkZ = chunkZ;

  if (chunkX < chunkXold) {
    transform.chunkXLoad = 1;
  } else if (chunkX > chunkXold) {
    transform.chunkXLoad = -1;
  }
  if (chunkZ < chunkZold) {
    transform.chunkZLoad = 1;
  } else if (chunkZ > chunkZold) {
    transform.chunkZLoad = -1;
  }
};

export default (world: World, server: Server): System => {
  const players = world.createSelector([Transform, Network, Inventory]);

  const networkSystem = () => {
    for (const { network, id, transform } of players) {
      send(network.socket, {
        type: ServerToClientMessage.syncGameData,
        data: {
          components: getComponentsToUpdate(world, id),
          newObjects: world.lastAddedObjects.filter((el) => el.networkSync),
          deletedObjects: world.lastDeletedObjects,
        },
      });
      calcPlayerMovement(server, transform, network);
    }
    for (const { id, payload } of world.networkQueue) {
      world.objects.get(id).network.socket.send(payload);
    }

    world.networkQueue = [];
    world.lastAddedObjects = [];
    world.lastDeletedObjects = [];
  };
  return networkSystem;
};
