///////////////////////////////////////////////////////////////////////////////////
// Laser like debug line 
///////////////////////////////////////////////////////////////////////////////////

export class DebugLine
{
    // Shared GL program + buffer for all DebugLine instances
    static lineProgram = null;
    static lineBuffer = null;

    constructor(world, origin, end, color = [1, 0, 0, 1], duration = 1000)
    {
        this.world = world;
        this.origin = origin.clone();
        this.end = end.clone();
        this.color = color;
        this.duration = duration;
        this.startTime = performance.now();

        this.bDrawOnce = duration < 50;

        DebugLine.InitProgram(world);
    }

    /*
     * Returns true once this line’s lifetime has elapsed 
     */
    HasEnded()
    {
        if (this.bDrawOnce)
        {
            this.bDrawOnce = false;
            return false;
        }
        return performance.now() - this.startTime > this.duration;
    }

    /* 
     * Draws the line if still alive (good to check also in world)
     */
    draw()
    {
        if (this.HasEnded()) return;

        const gl = this.world.gl;
        const prog = DebugLine.lineProgram;

        gl.useProgram(prog);

        // upload vertex positions
        gl.bindBuffer(gl.ARRAY_BUFFER, DebugLine.lineBuffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([
                this.origin.x, this.origin.y, this.origin.z,
                this.end.x, this.end.y, this.end.z
            ]),
            gl.DYNAMIC_DRAW
        );

        // attribute setup
        const posLoc = gl.getAttribLocation(prog, "aPosition");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

        // view/proj matrices from your renderer
        const viewLoc = gl.getUniformLocation(prog, "uViewMatrix");
        const projLoc = gl.getUniformLocation(prog, "uProjectionMatrix");
        gl.uniformMatrix4fv(viewLoc, false, this.world.renderer.GetViewMatrix());
        gl.uniformMatrix4fv(projLoc, false, this.world.renderer.GetProjectionMatrix());

        // line color
        const colorLoc = gl.getUniformLocation(prog, "uColor");
        gl.uniform4f(colorLoc, ...this.color); // Weird syntax but it works?

        // draw the line
        gl.drawArrays(gl.LINES, 0, 2);
    }

    /*
     * Compiles & links a simple line‐drawing shader + buffer 
     * Similar to component's InitShaders
     */
    static InitProgram(world)
    {
        if (DebugLine.lineProgram) return;

        const gl = world.gl;

        function compile(type, src)
        {
            const s = gl.createShader(type);
            gl.shaderSource(s, src);
            gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
            {
                console.error(gl.getShaderInfoLog(s));
            }
            return s;
        }

        // Get shaders, compile them
        const vs = compile(gl.VERTEX_SHADER, vsSrc);
        const fs = compile(gl.FRAGMENT_SHADER, fsSrc);

        // Bind shaders to the new program
        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
        {
            console.error(gl.getProgramInfoLog(prog));
        }

        // Set the static shared program
        DebugLine.lineProgram = prog;
        DebugLine.lineBuffer = gl.createBuffer();
    }
}

///////////////////////////////////////////////////////////////////////////////////
// Some laser like shaders (as default)
///////////////////////////////////////////////////////////////////////////////////

const vsSrc = `
attribute vec3 aPosition;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
void main() {
  gl_Position = uProjectionMatrix * uViewMatrix * vec4(aPosition, 1.0);
}
`;

const fsSrc = `
precision mediump float;
uniform vec4 uColor;
void main() {
  gl_FragColor = uColor;
}
`;