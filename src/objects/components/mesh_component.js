import { Matrix4 } from "../../utils/Math/Matrix4.js";
import { Transform } from "../../utils/Math/Transform.js";
import { Component } from "./component.js";

export class MeshComponent extends Component
{
	// The constructor is a good place for taking care of the necessary initializations.
	constructor(gl) 
	{
		super(gl);
		this.gl = gl;
		this.transform = new Transform();
		this.modelMatrix = new Matrix4();

		this.prog = this.InitShaderProgram(meshVS, meshFS);
	
		// Get attribute/uniform locations
		this.vertPosLoc 		= gl.getAttribLocation(this.prog, "aPosition");
		this.texCoordLoc 		= gl.getAttribLocation(this.prog, "aTexCoord");
		this.mvpLoc 			= gl.getUniformLocation(this.prog, "uModelViewProjection");
		this.modelMatrixLoc 	= gl.getUniformLocation(this.prog, "uModelMatrix")
		this.swapYZLoc 			= gl.getUniformLocation(this.prog, "uSwapYZ");
		this.useTextureLoc 		= gl.getUniformLocation(this.prog, "uUseTexture");
	
		// Buffers
		this.vertBuffer 		= gl.createBuffer();
		this.texCoordBuffer 	= gl.createBuffer();
	
		// Texture
		this.texture 			= gl.createTexture();
	}

	setTransform(transform) 
	{
		const gl = this.gl;

		// Set model matrix
		this.transform = transform;
		this.modelMatrix = transform.getMatrix();

		gl.useProgram(this.prog);
		gl.uniformMatrix4fv(this.modelMatrixLoc, false, this.modelMatrix.elements);

		// Update transformed bounding box
		const min = this.boundingBox?.min;
		const max = this.boundingBox?.max;
		if (!min || !max) return;

		const corners = [
			[min[0], min[1], min[2]],
			[min[0], min[1], max[2]],
			[min[0], max[1], min[2]],
			[min[0], max[1], max[2]],
			[max[0], min[1], min[2]],
			[max[0], min[1], max[2]],
			[max[0], max[1], min[2]],
			[max[0], max[1], max[2]],
		];

		let tMin = [Infinity, Infinity, Infinity];
		let tMax = [-Infinity, -Infinity, -Infinity];

		const m = this.modelMatrix.elements;
		for (let i = 0; i < 8; i++) {
			const [x, y, z] = corners[i];

			const tx = m[0] * x + m[4] * y + m[8] * z + m[12];
			const ty = m[1] * x + m[5] * y + m[9] * z + m[13];
			const tz = m[2] * x + m[6] * y + m[10] * z + m[14];

			tMin[0] = Math.min(tMin[0], tx);
			tMin[1] = Math.min(tMin[1], ty);
			tMin[2] = Math.min(tMin[2], tz);

			tMax[0] = Math.max(tMax[0], tx);
			tMax[1] = Math.max(tMax[1], ty);
			tMax[2] = Math.max(tMax[2], tz);
		}

		this.boundingBox.min = tMin;
		this.boundingBox.max = tMax;
		console.log(this.boundingBox);
	}
	
	computeBoundaries(vertPos)
	{
		// Apply the transform matrix to vertices
		const matrix = this.transform.getMatrix().elements;

		let min = [Infinity, Infinity, Infinity];
		let max = [-Infinity, -Infinity, -Infinity];

		for (let i = 0; i < vertPos.length; i += 3) {
			const x = vertPos[i];
			const y = vertPos[i + 1];
			const z = vertPos[i + 2];

			const tx = matrix[0] * x + matrix[4] * y + matrix[8]  * z + matrix[12];
			const ty = matrix[1] * x + matrix[5] * y + matrix[9]  * z + matrix[13];
			const tz = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];

			min[0] = Math.min(min[0], tx);
			min[1] = Math.min(min[1], ty);
			min[2] = Math.min(min[2], tz);

			max[0] = Math.max(max[0], tx);
			max[1] = Math.max(max[1], ty);
			max[2] = Math.max(max[2], tz);
		}

		this.boundingBox = { min, max };
	}

	// This method is called every time the user opens an OBJ file.
	// The arguments of this function is an array of 3D vertex positions
	// and an array of 2D texture coordinates.
	// Every item in these arrays is a floating point value, representing one
	// coordinate of the vertex position or texture coordinate.
	// Every three consecutive elements in the vertPos array forms one vertex
	// position and every three consecutive vertex positions form a triangle.
	// Similarly, every two consecutive elements in the texCoords array
	// form the texture coordinate of a vertex.
	// Note that this method can be called multiple times.
	setMesh(vertPos, texCoords) 
	{
		const gl = this.gl;

		this.numTriangles = vertPos.length / 3;
	
		// Bounding box computation
		this.computeBoundaries(vertPos);

		// Model matrix
		gl.useProgram(this.prog);
		gl.uniformMatrix4fv(this.modelMatrixLoc, false, this.modelMatrix.elements);

		// Vertex positions
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);
	
		// Texture coordinates
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
	}
	
	// This method is called when the user changes the state of the
	// "Swap Y-Z Axes" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	swapYZ(swap) 
	{
		const gl = this.gl;

		gl.useProgram(this.prog);
		gl.uniform1i(this.swapYZLoc, swap ? 1 : 0);
	}	
	
	// This method is called to draw the triangular mesh.
	// The argument is the transformation matrix, the same matrix returned
	// by the GetModelViewProjection function above.
	draw( trans ) 
	{
		const gl = this.gl;

		gl.useProgram(this.prog);
		gl.uniformMatrix4fv(this.mvpLoc, false, trans);											// Apply transform
	
		// Vertex positions
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
		gl.enableVertexAttribArray(this.vertPosLoc);
		gl.vertexAttribPointer(this.vertPosLoc, 3, gl.FLOAT, false, 0, 0);

		// Texture coordinates
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
		gl.enableVertexAttribArray(this.texCoordLoc);
		gl.vertexAttribPointer(this.texCoordLoc, 2, gl.FLOAT, false, 0, 0);
	
		// Bind texture
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
	
		// Draw call
		gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);
	}
	
	
	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture(img) 
	{
		const gl = this.gl;

		gl.useProgram(this.prog);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
	
		// some uniform parameter(s) of the fragment shader, so that it uses the texture.

		// Set tiling - teapot was mapping the UV outside the 0-1 range -> checked in blender3d
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

		// Set mipmap
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		// Add the texture
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img); 				// You can set the texture image data using the following command.
		gl.generateMipmap(gl.TEXTURE_2D);

		// Enable the texture
		gl.uniform1i(this.useTextureLoc, 1);													// Enable texture visualization inside shader
	}
	
	
	// This method is called when the user changes the state of the
	// "Show Texture" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	showTexture(show) 
	{
		const gl = this.gl;

		gl.useProgram(this.prog);
		gl.uniform1i(this.useTextureLoc, show ? 1 : 0); 										// Enable/disable inside the shader
	}
}

// Vertex Shader
const meshVS = `
precision mediump float;

attribute vec3 aPosition;
attribute vec2 aTexCoord;

uniform mat4 uModelViewProjection;
uniform mat4 uModelMatrix;
uniform bool uSwapYZ;

varying vec2 vTexCoord;

void main() {
    vec3 pos = aPosition;
    
    // If swapYZ is true, swap Y and Z components
    if (uSwapYZ) {
        pos = vec3(pos.x, pos.z, pos.y);
    }

    gl_Position = uModelViewProjection * uModelMatrix * vec4(pos, 1.0);
    vTexCoord = aTexCoord;
}
`;

// Fragment Shader
const meshFS = `
precision mediump float;

uniform bool uUseTexture;
uniform sampler2D uTexture;

varying vec2 vTexCoord;

void main() {
    if (uUseTexture) {
        gl_FragColor = texture2D(uTexture, vTexCoord);
    } else {
        gl_FragColor = vec4(1,gl_FragCoord.z*gl_FragCoord.z,0,1);
    }
}
`;
