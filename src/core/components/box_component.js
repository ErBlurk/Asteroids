///////////////////////////////////////////////////////////////////////////////////
// Simple wire box component - draws a scaled box with white lines 
///////////////////////////////////////////////////////////////////////////////////

import { Transform } from "../../utils/Math/Transform.js"
import { Component } from "./component.js";

export class BoxComponent extends Component
{
	constructor(gl)
	{
		super(gl);

		this.prog = null; // Will be initialized later
		this.mvp = null;
		this.vertPos = null;
		this.vertbuffer = null;
		this.linebuffer = null;
	}

	/*
	 * Default vertex positions with scaling and translation
	 * Most of the code is WebGL initialization and setup
	 */
	async init(transform = new Transform())
	{
		this.transform = transform;

		const boxVS = await this.loadShaderSource('./src/shaders/box.vert');
		const boxFS = await this.loadShaderSource('./src/shaders/box.frag');

		// Compile the shader program
		this.prog = this.InitShaderProgram(boxVS, boxFS);

		// Get the ids of the uniform variables in the shaders
		this.mvp = this.gl.getUniformLocation(this.prog, 'mvp');

		// Get the ids of the vertex attributes in the shaders
		this.vertPos = this.gl.getAttribLocation(this.prog, 'pos');

		// Create the buffer objects

		this.vertbuffer = this.gl.createBuffer();
		var pos = [
			-0.5, -0.5, -0.5,
			-0.5, -0.5, 0.5,
			-0.5, 0.5, -0.5,
			-0.5, 0.5, 0.5,
			0.5, -0.5, -0.5,
			0.5, -0.5, 0.5,
			0.5, 0.5, -0.5,
			0.5, 0.5, 0.5];
		for (let i = 0; i < pos.length; i += 3) 
		{
			pos[i + 0] = pos[i + 0] * this.transform.scale.x + this.transform.position.x;
			pos[i + 1] = pos[i + 1] * this.transform.scale.y + this.transform.position.y;
			pos[i + 2] = pos[i + 2] * this.transform.scale.z + this.transform.position.z;
		}

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertbuffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(pos), this.gl.STATIC_DRAW);

		this.linebuffer = this.gl.createBuffer();
		var line = [
			0, 1, 1, 3, 3, 2, 2, 0,
			4, 5, 5, 7, 7, 6, 6, 4,
			0, 4, 1, 5, 3, 7, 2, 6];
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.linebuffer);
		this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(line), this.gl.STATIC_DRAW);
	}

	// Deprecated, should replace with a two parameters function taking view and projection matrices (for world.js draw coherence)
	draw(trans)
	{
		const gl = this.gl;

		// Draw the line segments
		gl.useProgram(this.prog);
		gl.uniformMatrix4fv(this.mvp, false, trans);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
		gl.vertexAttribPointer(this.vertPos, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.vertPos);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.linebuffer);
		gl.drawElements(gl.LINES, 24, gl.UNSIGNED_BYTE, 0);
	}
}
///////////////////////////////////////////////////////////////////////////////////