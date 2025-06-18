export class Component{
    constructor(gl)
    {
        this.gl = gl;
    }

    async loadShaderSource(path) {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to load shader: ${path}`);
        }
        return await response.text();
    }

    // This is a helper function for compiling the given vertex and fragment shader source code into a program.
    InitShaderProgram( vsSource, fsSource )
    {
        const gl = this.gl;

        const vs = this.CompileShader( gl.VERTEX_SHADER,   vsSource );
        const fs = this.CompileShader( gl.FRAGMENT_SHADER, fsSource );

        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);

        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(prog));
            return null;
        }
        return prog;
    }

    // This is a helper function for compiling a shader, called by InitShaderProgram().
    CompileShader( type, source )
    {
        const gl = this.gl;

        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter( shader, gl.COMPILE_STATUS) ) {
            alert('An error occurred compiling shader:\n' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }
}