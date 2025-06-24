precision mediump float;

uniform bool uUseTexture;
uniform bool uUseEmissive;

uniform sampler2D uTexture;
uniform sampler2D uEmissiveTexture;

uniform vec3 uLightDirection;
uniform float uShininess;

uniform float uVelocity;

varying vec3 vNormal;
varying vec2 vTexCoord;

void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightDirection);
    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 H = normalize(L + V);

    float dotNL = dot(N, L);
    //float diff = dotNL * 0.5 + 0.5;
    float diff = max(dot(N, L), 0.0);

    // Specular tied to lit areas
    float spec = pow(max(dot(N, H), 0.0), uShininess) * diff;

    // fetch base color
    vec3 baseColor = vec3(1.0);
    if (uUseTexture) {
        baseColor = texture2D(uTexture, vTexCoord).rgb;
    }

    // ambient + diffuse (still energy-conserving)
    float ambientFactor = 0.1;
    float diffContrib    = (1.0 - ambientFactor) * diff;
    float ambientContrib = ambientFactor * (1.0 - diff);
    vec3  lightingNoSpec = baseColor * (diffContrib + ambientContrib);

    // TINT the specular by the base color, and dial it down
    float specStrength = 0.3;
    vec3  specular     = specStrength * spec * baseColor;

    vec3 finalColor = lightingNoSpec + specular;

    // Add emissive contribution if enabled
    if (uUseEmissive) {
        vec3 emissive = texture2D(uEmissiveTexture, vTexCoord).rgb;
        if (length(emissive) > 0.0) {
            finalColor = emissive * uVelocity; 
        }
    }

    gl_FragColor = vec4(finalColor, 1.0);
}