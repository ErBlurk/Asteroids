precision mediump float;

attribute vec3 aPosition;
attribute vec2 aTexCoord;

uniform mat4 uModelViewProjection;
uniform mat4 uModelMatrix;
uniform bool uSwapYZ;

// pass these to the fragment shader
varying vec2  vTexCoord;
varying float vGray;
varying vec3  vNormal;

float rand(vec3 co) {
    return fract(sin(dot(co, vec3(12.9898,78.233,45.164))) * 43758.5453);
}

void main() {
    // 1) object-space pos (with YZ swap)
    vec3 pos = aPosition;
    if(uSwapYZ) pos = vec3(pos.x, pos.z, pos.y);

    // 2) compute a normal in world-space by transforming a zero-w vector
    vNormal = normalize((uModelMatrix * vec4(pos, 0.0)).xyz);

    // 3) standard position
    gl_Position = uModelViewProjection * uModelMatrix * vec4(pos, 1.0);

    // 4) pass through UV + fallback gray
    vTexCoord = aTexCoord;
    vGray     = clamp(rand(pos), 0.3, 0.5);
}