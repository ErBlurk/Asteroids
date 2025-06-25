///////////////////////////////////////////////////////////////////////////////////
// Mesh component, handles 3d meshes, diffuse and emissive textures 
///////////////////////////////////////////////////////////////////////////////////

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

		this.meshFS = meshFS;
		this.meshVS = meshVS;

		this.prog = this.InitShaderProgram(this.meshVS, this.meshFS);
		gl.useProgram(this.prog);
		
		// Get attribute/uniform locations
		this.vertPosLoc 		= gl.getAttribLocation(this.prog, "aPosition");
		this.texCoordLoc 		= gl.getAttribLocation(this.prog, "aTexCoord");
		this.mvpLoc 			= gl.getUniformLocation(this.prog, "uViewProjectionMatrix");
		this.swapYZLoc 			= gl.getUniformLocation(this.prog, "uSwapYZ");
		this.useTextureLoc 		= gl.getUniformLocation(this.prog, "uUseTexture");
		this.modelMatrixLoc 	= gl.getUniformLocation(this.prog, "uModelMatrix")
		this.useEmissiveLoc     = gl.getUniformLocation(this.prog, "uUseEmissive");

		// texture locations
		this.textureLoc = gl.getUniformLocation(this.prog, "uTexture");
		this.emissiveTextureLoc = gl.getUniformLocation(this.prog, "uEmissiveTexture");

		// Normals/lighting attributes
		this.normalMatrixLoc  = gl.getUniformLocation(this.prog, "uNormalMatrix");
		this.lightDirLoc      = gl.getUniformLocation(this.prog, "uLightDirection");
		this.shininessLoc     = gl.getUniformLocation(this.prog, "uShininess");
	
		// Buffers
		this.vertBuffer 	  = gl.createBuffer();
		this.texCoordBuffer   = gl.createBuffer();
		this.normalBuffer     = gl.createBuffer();

		// Attributes
		this.vertPosLoc   	  = gl.getAttribLocation(this.prog, "aPosition");
		this.texCoordLoc      = gl.getAttribLocation(this.prog, "aTexCoord");
		this.normalLoc    	  = gl.getAttribLocation(this.prog, "aNormal");

		// Texture
		this.texture 			= gl.createTexture();
		this.emissiveTexture 	= gl.createTexture();

		this.InitDefault();
	}

	/*
	 * Set some default values
	 */
	InitDefault()
	{
		const gl = this.gl;

		gl.uniform1f(this.shininessLoc, 50.0);

		this.setLightDir(1, 1, 0.5);				// For testing purposes

		gl.uniform1i(this.useEmissiveLoc, 0);  		// Emission disabled by default
	}

	/*
	 * Set the mesh position
	 * Update the model matrix
	 */
	setPosition(position)
	{
		const gl = this.gl;

		// Set model matrix
		this.transform.position = position;
		this.modelMatrix = this.transform.getMatrix();

		gl.useProgram(this.prog);
		gl.uniformMatrix4fv(this.modelMatrixLoc, false, this.modelMatrix.elements);
	}

	/*
	 * Set the mesh rotation
	 * Update the model matrix
	 */
	setRotation(rotation)
	{
		const gl = this.gl;

		// Set model matrix
		this.transform.rotation = rotation;
		this.modelMatrix = this.transform.getMatrix();

		gl.useProgram(this.prog);
		gl.uniformMatrix4fv(this.modelMatrixLoc, false, this.modelMatrix.elements);
	}

	/*
	 * Set the mesh transform
	 * Update the model matrix
	 * Compute the new bounding box (to account for changing scale) without explicit vertex positions
	 */
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

		// Compute the new min AABB box bounds
		const m = this.modelMatrix.elements;
		for (let i = 0; i < 8; i++) {
			const [x, y, z] = corners[i];

			// Account both for rotation and scale
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

		// Set the new bounds
		this.boundingBox = { min, max };
		this.boundingBox.min = tMin;
		this.boundingBox.max = tMax;
	}
	
	/*
	 * Compute an AABB bounding box from vertex positions
	 */
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

			// Account for rotation and scale
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

	/*
	 * This method is called every time the user opens an OBJ file.
	 * The arguments of this function is an array of 3D vertex positions
	 * and an array of 2D texture coordinates.
	 * Every item in these arrays is a floating point value, representing one
	 * coordinate of the vertex position or texture coordinate.
	 * Every three consecutive elements in the vertPos array forms one vertex
	 * position and every three consecutive vertex positions form a triangle.
	 * Similarly, every two consecutive elements in the texCoords array
	 * form the texture coordinate of a vertex.
	 * Note that this method can be called multiple times.
	 */
	setMesh(vertPos, texCoords, normals) {
		const gl = this.gl;
	
		this._lastVertPos = vertPos;
		this._lastTexCoords = texCoords;
		this._lastNormals = normals;
	
		this.numTriangles = vertPos.length / 3;
	
		this.computeBoundaries(vertPos);
	
		gl.useProgram(this.prog);
		gl.uniformMatrix4fv(this.modelMatrixLoc, false, this.modelMatrix.elements);
	
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);
	
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
	
		if (!this.normalBuffer) {
			this.normalBuffer = gl.createBuffer();
			this.normalLoc = gl.getAttribLocation(this.prog, "aNormal");
		}

		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
	}
	
	/*
	 * Change the vertex and the fragment shaders with the new specified ones
	 * Takes in input text
	 */
	setProgram(vsSource, fsSource) 
	{
		const gl = this.gl;
		const prog = this.InitShaderProgram(vsSource, fsSource);  	// compile & link (see component.js) - text to actual shader program
		if (!prog) throw new Error("Failed to compile shaders");
		this.prog = prog;                                        	// install

		// re-fetch all attrib/uniform locations:
		this.vertPosLoc 		= gl.getAttribLocation(this.prog, "aPosition");
		this.texCoordLoc 		= gl.getAttribLocation(this.prog, "aTexCoord");
		this.mvpLoc 			= gl.getUniformLocation(this.prog, "uViewProjectionMatrix");
		this.swapYZLoc 			= gl.getUniformLocation(this.prog, "uSwapYZ");
		this.useTextureLoc 		= gl.getUniformLocation(this.prog, "uUseTexture");
		this.modelMatrixLoc 	= gl.getUniformLocation(this.prog, "uModelMatrix")

		// Normals/lighting attributes
		this.normalMatrixLoc  	= gl.getUniformLocation(this.prog, "uNormalMatrix");
		this.lightDirLoc      	= gl.getUniformLocation(this.prog, "uLightDirection");
		this.shininessLoc     	= gl.getUniformLocation(this.prog, "uShininess");

		// Emission Map
		this.useEmissiveLoc     = gl.getUniformLocation(this.prog, "uUseEmissive");
		this.textureLoc 		= gl.getUniformLocation(this.prog, "uTexture");
		this.emissiveTextureLoc = gl.getUniformLocation(this.prog, "uEmissiveTexture");

		// then re-bind existing vertex data:
		if (this._lastVertPos && this._lastTexCoords) 
		{
			this.setMesh(this._lastVertPos, this._lastTexCoords);
		}
	}

  
	/*
	 * This method is called when the user changes the state of the
	 * "Swap Y-Z Axes" checkbox. 
	 * The argument is a boolean that indicates if the checkbox is checked.
	 */
	swapYZ(swap) 
	{
		const gl = this.gl;

		gl.useProgram(this.prog);
		gl.uniform1i(this.swapYZLoc, swap ? 1 : 0);
	}	
	
	/*
	 * This method is called to draw the triangular mesh.
	 * The arguments are the view and projection matrices
	 */
	draw(view, projection) 
	{
		const gl = this.gl;
		gl.useProgram(this.prog);

		// Compute view projection matrix
		let viewMatrix = new Matrix4(view);
		let projectionMatrix = new Matrix4(projection);
		let view_projection = projectionMatrix.multiply(viewMatrix);

		// Pass to shaders the needed matrices
		gl.uniformMatrix4fv(this.mvpLoc, false, view_projection.elements);
		gl.uniformMatrix4fv(this.modelMatrixLoc, false, this.modelMatrix.elements);
	
		// Normal matrix
		let modelViewMatrix = viewMatrix.multiply(this.modelMatrix);
		const normalTransform = modelViewMatrix.getNormalMatrix();
		gl.uniformMatrix3fv(this.normalMatrixLoc, false, normalTransform);

		// helper to skip on invalid locs
		const bindAttrib = (loc, buf, size) => {
			if (loc < 0) return;
			gl.bindBuffer(gl.ARRAY_BUFFER, buf);
			gl.enableVertexAttribArray(loc);
			gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
		};

		// Bind buffers to respective locs in the shaders
		bindAttrib(this.vertPosLoc, this.vertBuffer, 3);
		bindAttrib(this.normalLoc, this.normalBuffer, 3);
		bindAttrib(this.texCoordLoc, this.texCoordBuffer, 2);

		// Bind diffuse texture
		gl.uniform1i(this.textureLoc, 0);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);

		// Bind emissive texture
		gl.uniform1i(this.emissiveTextureLoc, 1);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.emissiveTexture);
	
		// Draw call
		gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);
	}
	
	
	/*
	 * This method is called to set the DIFFUSE texture of the mesh.
	 * The argument is an HTML IMG element containing the texture data.
	 */
	setTexture(img, flipUV = false) 
	{
		const gl = this.gl;

		gl.useProgram(this.prog);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
	
		// Set tiling with repetition of textures for out of range vertexes
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

		// Set mipmaps
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		// Flip UV mapping if needed
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipUV);

		// Add the texture
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

		// You can set the texture image data using the following command.
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
		gl.generateMipmap(gl.TEXTURE_2D);

		// Reset UV flipping
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

		// Enable texture visualization inside shader
		gl.uniform1i(this.useTextureLoc, 1);
	}
	
	/*
	 * This method is called to set the EMISSIVE texture of the mesh.
	 * The argument is an HTML IMG element containing the texture data.à
	 * For detailed explanation see setTexture above
	 */
	setEmissiveTexture(img, flipUV = false) 
	{
		const gl = this.gl;

		// Bind emissive texture
		gl.useProgram(this.prog);
		gl.bindTexture(gl.TEXTURE_2D, this.emissiveTexture);

		// Enable tiling
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

		// Set mipmaps
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		// Flip UV if needed
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipUV);
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

		// Set texture
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
		gl.generateMipmap(gl.TEXTURE_2D);

		// Disable UV flipping
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

		// Enable emissive mapping
		gl.uniform1i(this.useEmissiveLoc, 1);
	}
	
	/*
	 * This method is called when the DIFFUSE texture is being enabled/disabled 
	 * The argument is a boolean that indicates if the checkbox is checked.
	 */
	showTexture(show) 
	{
		const gl = this.gl;

		// Enable/disable inside the shader
		gl.useProgram(this.prog);
		gl.uniform1i(this.useTextureLoc, show ? 1 : 0); 
	}

	/*
	 * This method is called when the EMISSION texture is being enabled/disabled 
	 * The argument is a boolean that indicates if the checkbox is checked.
	 */
	showEmissive(show) 
	{
		const gl = this.gl;

		gl.useProgram(this.prog);
		gl.uniform1i(this.useEmissiveLoc, show ? 1 : 0);
	}

	/*
	 * Set light direction inside shader
	 */
	setLightDir(x, y, z)
	{
		const gl = this.gl;

		gl.useProgram(this.prog);
		gl.uniform3f(this.lightDirLoc, x, y, z);
	}

	/*
	 * Set shininess inside shader
	 */
	setShininess(shininess)
	{
		const gl = this.gl;

		gl.useProgram(this.prog);
		gl.uniform1f(this.shininessLoc, shininess);
	}

	/*
	 * This method is used to check the Model and ModelViewProjection matrices
	 */
	debug()
	{
		const gl = this.gl;
		console.log("uMVP loc =", gl.getUniformLocation(this.prog,"uViewProjectionMatrix"));
		console.log("uM   loc =", gl.getUniformLocation(this.prog,"uModelMatrix"));		
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Default shaders with normal rendering (for testing and checks purposes)
////////////////////////////////////////////////////////////////////////////////////////////////////

// Vertex Shader
const meshVS = `
precision mediump float;
attribute vec3 aPosition;
attribute vec3 aNormal;

uniform mat3 uNormalMatrix;
uniform mat4 uViewProjectionMatrix;
uniform mat4 uModelMatrix;
uniform bool uSwapYZ;

varying vec3 vNormal;

void main() {
	vec3 pos = aPosition;
	vNormal = normalize(uNormalMatrix * aNormal);

	if (uSwapYZ) pos = vec3(pos.x, pos.z, pos.y);
	gl_Position = uViewProjectionMatrix * uModelMatrix * vec4(pos, 1.0);
}
`;

// Fragment Shader
const meshFS = `
precision mediump float;
uniform bool uUseTexture;
uniform sampler2D uTexture;

varying vec3 vNormal;

void main() {

	// Use normals as rendered colors
    vec3 debugColor = abs(normalize(-vNormal))*0.5 + 0.5;
    gl_FragColor = vec4(debugColor,1.0); // Normals

	// gl_FragColor = vec4(1.0); // white
}
`;
