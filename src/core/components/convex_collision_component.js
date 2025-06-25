///////////////////////////////////////////////////////////////////////////////////
// Basic collision component - actually just a conceptual sphere
///////////////////////////////////////////////////////////////////////////////////

import { Component } from "./component.js";
import { Matrix4 } from "../../utils/Math/Matrix4.js";

const bDebug = false; // Used to draw the collision component

export class ConvexCollisionComponent extends Component
{
    constructor(meshComp)
    {
        super(meshComp.gl);

        this._buildFromMesh(meshComp);
    }

    /*
     * Given a mesh component, it computes the furthest vertex from it's origin, and uses that as the sphere radius
     */
    _buildFromMesh(meshComp)
    {
        this.mesh = meshComp;
        const pos = meshComp._lastVertPos; // Vertexes "cached" inside the Mesh during setMesh
        if (!pos || pos.length < 3)
        {
            throw new Error("MeshComponent must have raw positions in _lastVertPos");
        }

        // Compute AABB extremes
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        // Get a vertex position - array is flat as [x, y, z, x, y, z, ...]
        for (let i = 0; i < pos.length; i += 3)
        {
            const [x, y, z] = [pos[i], pos[i + 1], pos[i + 2]];
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (z < minZ) minZ = z;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
            if (z > maxZ) maxZ = z;
        }

        // Local center = midpoint
        const cx = (minX + maxX) * 0.5;
        const cy = (minY + maxY) * 0.5;
        const cz = (minZ + maxZ) * 0.5;
        this.localCenter = { x: cx, y: cy, z: cz };

        // Radius = max distance to center
        let r = 0;
        for (let i = 0; i < pos.length; i += 3)
        {
            const dx = pos[i] - cx;
            const dy = pos[i + 1] - cy;
            const dz = pos[i + 2] - cz;
            r = Math.max(r, Math.hypot(dx, dy, dz)); // Hypot used for euclidean distance
        }
        this.radius = r;

        // Initialize transform: translate then uniform scale the collision component
        this.transform.setScale3(r, r, r);
        this.transform.setPosition3(cx, cy, cz);

        // Build unit sphere
        this.debug = this.gl.createBuffer();
        const flatSphere = makeUnitWireSphere(24); // 24 vertexes, 8 for each circle
        this.vertexCount = flatSphere.length / 3;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.debug);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, flatSphere, this.gl.STATIC_DRAW);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

        // Init the sphere shaders, set position and MVP
        this.prog = this.InitShaderProgram(vs, fs);
        this.aPosLoc = this.gl.getAttribLocation(this.prog, 'aPosition');
        this.uMVPLoc = this.gl.getUniformLocation(this.prog, 'uMVP');
    }

    /*
     * if debugging, draw the wireframe sphere 
     */
    draw(view, projection)
    {
        if (bDebug)
        {
            let view_projection = this.BuildViewProjectionMatrix(view, projection);
            this.drawDebug(view_projection);
        }
    }

    /*
     * Tell gl to draw the three circles (after building them)
     */
    drawDebug(vpMatrix)
    {
        const gl = this.gl;
        gl.useProgram(this.prog);

        // World matrix from mesh/actor transform
        const worldM = this.mesh.transform.getMatrix().elements;
        // Local translation to center
        const T = Matrix4.translation(
            this.localCenter.x,
            this.localCenter.y,
            this.localCenter.z
        );

        // Uniform scale by radius
        const S = Matrix4.scale(this.radius, this.radius, this.radius);
        // model = worldM * T * S
        const TS = Matrix4.multiplyArrays(T.elements, S.elements);
        const model = Matrix4.multiplyArrays(worldM, TS);

        // mvp = vpMatrix * model (the build circles)
        const mvp = new Float32Array(16);
        for (let r = 0; r < 4; r++)
        {
            for (let c = 0; c < 4; c++)
            {
                let sum = 0;
                for (let k = 0; k < 4; k++)
                {
                    sum += vpMatrix[k * 4 + r] * model[c * 4 + k];
                }
                mvp[c * 4 + r] = sum;
            }
        }

        // Bind and set attributes
        gl.uniformMatrix4fv(this.uMVPLoc, false, mvp);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.debug);
        gl.enableVertexAttribArray(this.aPosLoc);
        gl.vertexAttribPointer(this.aPosLoc, 3, gl.FLOAT, false, 0, 0);

        // Draw the 3 circles
        const seg = this.vertexCount / 3;
        gl.drawArrays(gl.LINE_LOOP, 0, seg);
        gl.drawArrays(gl.LINE_LOOP, seg, seg);
        gl.drawArrays(gl.LINE_LOOP, seg * 2, seg);
    }
}

// Helper: builds unit‐sphere wireframe (3 great circles)
function makeUnitWireSphere(segments = 24)
{
    const pts = [];
    for (let ring = 0; ring < 3; ring++)
    {
        for (let i = 0; i < segments; i++)
        {
            const theta = (i / segments) * 2 * Math.PI;
            let x = 0, y = 0, z = 0;
            if (ring === 0)
            {
                // XY plane circle
                x = Math.cos(theta);
                y = Math.sin(theta);
            }
            else if (ring === 1)
            {
                // YZ plane circle
                y = Math.cos(theta);
                z = Math.sin(theta);
            }
            else
            {
                // ZX plane circle
                z = Math.cos(theta);
                x = Math.sin(theta);
            }
            pts.push(x, y, z);
        }
    }
    return new Float32Array(pts);
}

// Debug shader (red lines)
const vs = `
    attribute vec3 aPosition;
    uniform mat4 uMVP;
    void main() { gl_Position = uMVP * vec4(aPosition, 1.0); }
`;
const fs = `
    precision mediump float;
    void main() { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); }
`;

