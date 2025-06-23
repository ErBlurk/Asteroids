precision mediump float;

uniform bool uUseTexture;
uniform sampler2D uTexture;

uniform vec3 uLightDirection;
uniform float uShininess;

varying vec2 vTexCoord;
varying vec3 vNormal;

void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightDirection);
    vec3 V = vec3(0.0, 0.0, 1.0); 							// view direction for shininess - changing it gives weird results???
    vec3 R = reflect(L, N);

    float diff = max(dot(N, L), 0.0);
    float spec = pow(max(dot(R, V), 0.0), uShininess);

    vec3 baseColor = vec3(1.0, 1.0, 1.0);

    if (uUseTexture) {
        baseColor = texture2D(uTexture, vTexCoord).rgb;
    }

    vec3 ambient = 0.1 * baseColor;
    vec3 finalColor = ambient + baseColor * diff + vec3(spec);
    //gl_FragColor = vec4(baseColor, 1.0); 
    gl_FragColor = vec4(finalColor, 1.0);
}