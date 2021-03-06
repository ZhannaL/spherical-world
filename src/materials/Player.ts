import type { ShaderLibrary } from '../engine/ShaderLibrary';
import type TextureLibrary from '../engine/Texture/TextureLibrary';
import { SimpleMaterial } from '../engine/Material/SimpleMaterial';

export default (textureLibrary: TextureLibrary, shaderLibrary: ShaderLibrary): SimpleMaterial =>
  new SimpleMaterial({
    name: 'player',
    shader: shaderLibrary.get('diffuse'),
    diffuse: textureLibrary.get('player'),
  });
