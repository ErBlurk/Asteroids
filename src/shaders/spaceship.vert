precision mediump float;

attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;

uniform mat4 uModelMatrix;
uniform mat3 uNormalMatrix;
uniform mat4 uViewProjectionMatrix; 
uniform bool uSwapYZ;

varying vec2 vTexCoord;
varying vec3 vNormal;

void main() {
    vec3 pos = aPosition;
    vec3 normal = aNormal;
    
    // If swapYZ is true, swap Y and Z components for both position and normal
    if (uSwapYZ) {
        pos = vec3(pos.x, pos.z, pos.y);
        normal = vec3(normal.x, normal.z, normal.y);
    }
    
    vTexCoord = aTexCoord;
    
    vNormal = normalize(uNormalMatrix * normal);
    
    gl_Position = uViewProjectionMatrix * uModelMatrix * vec4(pos, 1.0);
}