///////////////////////////////////////////////////////////////////////////////////
// Base abstract component - useful for defining attachable components to actors
///////////////////////////////////////////////////////////////////////////////////

import { Matrix4 } from "../../utils/Math/Matrix4.js";
import { Transform } from "../../utils/Math/Transform.js";

export class Component
{
    constructor(gl)
    {
        this.gl = gl;

        this.local = new Transform();
        this.world = new Transform();

        this.transform = new Transform();
    }

    /*
     * Load a file from the specified path
     * Returns the text inside the file
     * Used just for loading shaders
     */
    async loadShaderSource(path)
    {
        const response = await fetch(path);
        if (!response.ok)
        {
            throw new Error(`Failed to load shader: ${path}`);
        }
        return await response.text();
    }

    /*
     * Set the component translation
     */
    setPosition(position)
    {
        this.transform.setPosition(position);
    }

    /*
     * Set the component rotation
     */
    setRotation(rotation)
    {
        this.transform.setRotation(rotation);
    }

    /*
     * Set the component local (relative) translation
     * Actually badly implemented, not working, and never used
     */
    setLocalPosition(position) 
    {
        this.local.setPosition(position);
        this.updateTransform();
    }

    /*
     * Set the component local (relative) rotation
     * Actually badly implemented, not working, and never used
     */
    setLocalRotation(rotation) 
    {
        this.local.setRotation(rotation);
        this.updateTransform();
    }

    /*
     * Set the component's transform (world transform)
     */
    setTransform(transform) 
    {
        this.transform = transform;
        return this;
    }

    /*
     * Dummy method, each component should possibly be able to be drawed
     */
    draw()
    {
        // TODO
    }

    /*
     * Compute world transform with local transform applied to it
     * Actually not really working
     */
    updateTransform()
    {
        const W = this.world.getMatrix().elements;  // world-to-local
        const L = this.local.getMatrix().elements;  // local-to-component

        // multiply column-major arrays: M = W × L
        const M = Matrix4.multiplyArrays(W, L);

        // overwrite the internal matrix of `transform`
        this.transform.matrix.elements.set(M);
    }

    /*
     * This is a helper function for compiling the given vertex and fragment shader source code into a program.
     */
    InitShaderProgram(vsSource, fsSource)
    {
        const gl = this.gl;

        const vs = this.CompileShader(gl.VERTEX_SHADER, vsSource);
        const fs = this.CompileShader(gl.FRAGMENT_SHADER, fsSource);

        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);

        if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
        {
            alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(prog));
            return null;
        }
        return prog;
    }

    /*
     * This is a helper function for compiling a shader, called by InitShaderProgram().
     */
    CompileShader(type, source)
    {
        const gl = this.gl;

        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        {
            alert('An error occurred compiling shader:\n' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    /*
     * Used for drawing components 
     * given separate view and projection matrices, omputes the VP matrix
     */
    BuildViewProjectionMatrix(view, projection)
    {
        let viewMatrix = new Matrix4(view);
        let projectionMatrix = new Matrix4(projection);
        let view_projection = projectionMatrix.multiply(viewMatrix);
        return view_projection.elements;
    }
}