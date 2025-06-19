precision mediump float;

uniform bool      uUseTexture;
uniform sampler2D uTexture;
uniform vec3      uLightDirection;  // world-space light dir (normalized)

varying vec2  vTexCoord;
varying float vGray;
varying vec3  vNormal;

void main() {
    // 1) base color: texture or smooth gray
    vec3 base = uUseTexture
        ? texture2D(uTexture, vTexCoord).rgb
        : vec3(vGray);

    // 2) Lambertian diffuse
    float diff = max(dot(normalize(vNormal), normalize(uLightDirection)), 0.0);

    // 3) add a small ambient so shadows aren't completely black
    float ambient = 0.1;
    float intensity = ambient + diff * (1.0 - ambient);

    vec3 color = base * intensity;

    gl_FragColor = vec4(color, 1.0);
}