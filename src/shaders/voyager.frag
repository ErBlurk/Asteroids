precision mediump float;

uniform bool   uUseTexture;
uniform sampler2D uTexture;
uniform vec3   uLightDirection;

varying vec2   vTexCoord;
varying float  vGray;    // used here as a per-fragment “roughness”
varying vec3   vNormal;

void main() {
    // Base color: textured tinted gold or flat gold
    vec3 goldColor = vec3(1.0, 0.766, 0.336);
    vec3 base = uUseTexture
        ? texture2D(uTexture, vTexCoord).rgb * goldColor
        : goldColor;

    // Normal & light
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightDirection);

    // Diffuse + ambient
    float diff = max(dot(N, L), 0.0);
    float ambientFactor = 0.1;
    float diffuseFactor = 1.0 - ambientFactor;
    vec3 diffuse = base * (ambientFactor + diff * diffuseFactor);

    // Roughness → shininess (higher rough ⇒ lower shininess)
    float roughness = clamp(vGray, 0.0, 1.0);
    float shininess = mix(16.0, 128.0, 1.0 - roughness);

    // Specular (Phong-style, tinted by base for metallic look)
    vec3 R = reflect(-L, N);
    // approximate viewDir ≈ lightDir for a simple “headlight” highlight
    float spec = pow(max(dot(R, L), 0.0), shininess);
    float specularStrength = 0.8;
    vec3 specular = base * specularStrength * spec;

    // Final color
    vec3 color = diffuse + specular;
    gl_FragColor = vec4(color, 1.0);
}
