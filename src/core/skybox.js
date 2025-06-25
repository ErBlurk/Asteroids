///////////////////////////////////////////////////////////////////////////////////
// Initialize a cube with a four color gradient and use it as a skybox
///////////////////////////////////////////////////////////////////////////////////

import { Matrix4 } from "../utils/Math/Matrix4.js";

export class SkyBox
{
    constructor(gl, renderer)
    {
        this.gl = gl;
        this.renderer = renderer;
        this.initShader();
        this.initCube();
    }

    /*
     * Initialize the vertex and fragment shaders, compile, bind, etc.
     */
    initShader()
    {
        const gl = this.gl;

        const vert = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vert, vsSource);
        gl.compileShader(vert);

        const frag = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(frag, fsSource);
        gl.compileShader(frag);

        this.program = gl.createProgram();
        gl.attachShader(this.program, vert);
        gl.attachShader(this.program, frag);
        gl.linkProgram(this.program);

        this.attribLoc = gl.getAttribLocation(this.program, "aPosition");
        this.uniformLoc = gl.getUniformLocation(this.program, "uViewProjInverse");
    }

    /*
     * Build a cube (from default positions)
     */
    initCube() {
        const gl = this.gl;
        const vertices = new Float32Array([
            -1, -1,  1,  1, -1,  1, -1,  1,  1,     // first face, first triangle, three xyz positions
            -1,  1,  1,  1, -1,  1,  1,  1,  1,     // second triangle

            -1, -1, -1, -1,  1, -1,  1, -1, -1,     // second face, second triangle
            -1,  1, -1,  1, -1, -1,  1,  1, -1,

            -1,  1, -1, -1,  1,  1,  1,  1, -1,
            -1,  1,  1,  1,  1,  1,  1,  1, -1,

            -1, -1, -1,  1, -1, -1, -1, -1,  1,
            -1, -1,  1,  1, -1, -1,  1, -1,  1,

            1, -1, -1,  1,  1, -1,  1, -1,  1,
            1, -1,  1,  1,  1, -1,  1,  1,  1,

            -1, -1, -1, -1, -1,  1, -1,  1, -1,
            -1, -1,  1, -1,  1,  1, -1,  1, -1,
        ]);

        this.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        this.vertexCount = vertices.length / 3;
    }

    /*
     * Draw the shaded cube (without depth test and with no culling)
     */
    draw()
    {
        const gl = this.gl;
        const pitch = this.renderer.rotation.pitch;
        const yaw = this.renderer.rotation.yaw;

        const view = Matrix4.GetViewMatrix(0, 0, 0, pitch, yaw);
        const proj = new Matrix4(this.renderer.perspectiveMatrix);
        const viewProjInverse = proj.multiply(view).invert();

        gl.useProgram(this.program);
        gl.disable(gl.CULL_FACE);
        gl.depthMask(false);
        gl.depthFunc(gl.LEQUAL);

        gl.uniformMatrix4fv(this.uniformLoc, false, viewProjInverse.elements);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.enableVertexAttribArray(this.attribLoc);
        gl.vertexAttribPointer(this.attribLoc, 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);

        gl.depthMask(true);
        gl.enable(gl.CULL_FACE);
        gl.depthFunc(gl.LESS);
    }
}

///////////////////////////////////////////////////////////////////////////////////
// Skybox shader - four color gradient
///////////////////////////////////////////////////////////////////////////////////

const vsSource = `
    attribute vec3 aPosition;
    varying vec3 vDirection;
    uniform mat4 uViewProjInverse;

    void main() {
        vec4 world = uViewProjInverse * vec4(aPosition, 1.0);
        vDirection = world.xyz / world.w;
        gl_Position = vec4(aPosition, 1.0);
    }
`;

const fsSource = `
    precision mediump float;
    varying vec3 vDirection;

    vec3 getSpaceGradient(float t) {
        // Clamp to [0, 1]
        t = clamp(t, 0.0, 1.0);

        // Rainbow-like multicolor gradient of dark blues
        return mix(
            mix(vec3(0.00392156862745098, 0.043137254901960784, 0.09803921568627451), vec3(0.001764705882352941, 0.02941176470588237, 0.0901960784313726), smoothstep(0.0, 0.25, t)),    // black → purple
            mix(vec3(0.00784313725490196, 0.08627450980392157, 0.19215686274509805), vec3(0.00392156862745098, 0.043137254901960784, 0.09803921568627451), smoothstep(0.25, 0.75, t)),    // blue → cyan
            smoothstep(0.25, 1.0, t)
        );
    }

    void main() {
        float y = -normalize(vDirection).y * 0.5 + 0.5;

        vec3 color = getSpaceGradient(y);

        gl_FragColor = vec4(color, 1.0);
    }
`;