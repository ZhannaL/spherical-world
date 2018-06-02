// @flow
import Material from './Material';

const materialLibraryProvider = () => {
  class MaterialLibrary {
    materials: Map<string, Material> = new Map();

    get(materialName: string): ?Material {
      return this.materials.get(materialName);
    }

    add(...materials: Material[]) {
      for (const material of materials) {
        this.materials.set(material.name, material);
      }
    }
  }
  return MaterialLibrary;
};

/* ::
export const MaterialLibrary = materialLibraryProvider();
*/

export default materialLibraryProvider;
