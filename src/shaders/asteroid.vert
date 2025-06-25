precision mediump float;

attribute vec3 aPosition;
attribute vec2 aTexCoord;

uniform mat4 uViewProjectionMatrix;
uniform mat4 uModelMatrix;
uniform bool uSwapYZ;

varying vec2 vTexCoord;
varying float vGray;
varying vec3 vNormal;

float rand(vec3 co) {
    return fract(sin(dot(co, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
}

void main() {
    vec3 pos = aPosition;
    if (uSwapYZ) pos = vec3(pos.x, pos.z, pos.y);

    // Correct: treat transformed position as a direction (w=0) to compute normal
    vec3 worldNormal = normalize((uModelMatrix * vec4(pos, 0.0)).xyz);
    vNormal = -worldNormal; // flipped here to correct lighting direction

    gl_Position = uViewProjectionMatrix * uModelMatrix * vec4(pos, 1.0);
    vTexCoord = aTexCoord;
    vGray = clamp(rand(pos), 0.3, 0.5);
}
