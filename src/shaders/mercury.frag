precision mediump float;

uniform bool uUseTexture;
uniform sampler2D uTexture;
uniform vec3 uLightDirection;

varying vec2 vTexCoord;
varying float vGray;
varying vec3 vNormal;

void main() {
    vec3 base = uUseTexture ? texture2D(uTexture, vTexCoord).rgb : vec3(0.5);

    float diff = max(dot(normalize(vNormal), normalize(uLightDirection)), 0.0);
    float ambient = 0.1;
    float intensity = ambient + diff * (1.0 - ambient);

    gl_FragColor = vec4(base * intensity, 1.0);
}
