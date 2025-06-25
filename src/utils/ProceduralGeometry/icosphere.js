///////////////////////////////////////////////////////////////////////////////////
// Build an icosphere - for meshes
///////////////////////////////////////////////////////////////////////////////////

import { PerlinNoise } from "../Noise/perlin_noise.js";
import { Vector3 }      from "../Math/Vector3.js";
import { Transform }    from "../Math/Transform.js";

export class ProceduralIcosphere
{
    static GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;

    static buildIcosphere(iterations = 2, bApplyNoise = false, macroScale = 2.0, macroAmp = 0.5, microScale = 10.0, microAmp = 0.1, transform = Transform.random())
    {
        const vertices = this._createInitialVertices();
        let faces       = this._createInitialFaces();

        faces = this._subdivideFaces(vertices, faces, iterations);

        return this._generateMeshData(vertices, faces, bApplyNoise, macroScale, macroAmp, microScale, microAmp, transform);
    }

    /*
     * Set the 0 iterations/subdivisions base vertices
     */
    static _createInitialVertices()
    {
        const t = this.GOLDEN_RATIO;
        const verts = [
            new Vector3(-1,  t,  0), new Vector3( 1,  t,  0),
            new Vector3(-1, -t,  0), new Vector3( 1, -t,  0),
            new Vector3( 0, -1,  t), new Vector3( 0,  1,  t),
            new Vector3( 0, -1, -t), new Vector3( 0,  1, -t),
            new Vector3( t,  0, -1), new Vector3( t,  0,  1),
            new Vector3(-t,  0, -1), new Vector3(-t,  0,  1)
        ];
        verts.forEach(v => v.normalize());
        return verts;
    }

    /*
     * Create the initial 0 subdivisions faces
     */
    static _createInitialFaces()
    {
        return [
            [0, 11, 5], [0, 5, 1],  [0, 1, 7],   [0, 7, 10], [0, 10, 11],
            [1, 5, 9],  [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
            [3, 9, 4],  [3, 4, 2],  [3, 2, 6],   [3, 6, 8],  [3, 8, 9],
            [4, 9, 5],  [2, 4, 11], [6, 2, 10],  [8, 6, 7],  [9, 8, 1]
        ];
    }

    /*
     * Subdivide the faces
     * Compute the triangle midpoint, rebuild triangles
     */
    static _subdivideFaces(vertices, faces, iterations)
    {
        const midCache = {};
        for (let i = 0; i < iterations; i++)
        {
            const newFaces = [];

            for (const [i0, i1, i2] of faces)
            {
                const a = this._getMidpoint(midCache, vertices, i0, i1);
                const b = this._getMidpoint(midCache, vertices, i1, i2);
                const c = this._getMidpoint(midCache, vertices, i2, i0);

                newFaces.push([i0, c, a], [i1, a, b], [i2, b, c], [a, c, b]);
            }

            faces = newFaces;
        }
        return faces;
    }

    /*
     * Triangle midpoints helper
     */
    static _getMidpoint(cache, vertices, i1, i2)
    {
        const key = i1 < i2 ? `${i1}_${i2}` : `${i2}_${i1}`;
        if (cache[key] !== undefined)
        {
            return cache[key];
        }

        const v1 = vertices[i1];
        const v2 = vertices[i2];
        const mid = new Vector3((v1.x + v2.x) * 0.5, (v1.y + v2.y) * 0.5, (v1.z + v2.z) * 0.5); // Alrady reprojected on the sphere
        mid.normalize();
        vertices.push(mid);

        const index = vertices.length - 1;
        cache[key] = index;
        return index;
    }

    /*
     * Build the icosphere vertex data, texture mapping and normals
     */
    static _generateMeshData(vertices, faces, bApplyNoise, macroScale, macroAmp, microScale, microAmp, transform)
    {
        const positions = [];
        const texCoords = [];
        const normals   = [];

        const seed  = this._computeSeed(transform);
        const noise = new PerlinNoise(seed);

        for (const face of faces)
        {
            const triVerts = face.map(i => vertices[i].clone());

            for (let i = 0; i < 3; i++)
            {
                const v = triVerts[i];

                if (bApplyNoise)
                {
                    this._applyNoise(v, noise, macroScale, macroAmp, microScale, microAmp);
                }

                triVerts[i] = v;
            }

            // Normal computation
            const edge1 = triVerts[1].clone().subtract(triVerts[0]);
            const edge2 = triVerts[2].clone().subtract(triVerts[0]);
            const normal = edge1.cross(edge2).normalize();

            // Fill output buffers
            for (const v of triVerts)
            {
                positions.push(v.x, v.y, v.z);
                texCoords.push(
                    0.5 + Math.atan2(v.z, v.x) / (2 * Math.PI),
                    0.5 - Math.asin(v.y) / Math.PI
                );
                normals.push(normal.x, normal.y, normal.z);
            }
        }

        return { positions, texCoords, normals };
    }

    /*
     * Random seed for perlin noise
     */
    static _computeSeed(transform)
    {
        return Math.floor(
            transform.position.x * 73856093 ^
            transform.position.y * 19349663 ^
            transform.position.z * 83492791
        );
    }

    /*
     * Deform the icosphere by applying two perlin noises
     */
    static _applyNoise(v, noise, macroScale, macroAmp, microScale, microAmp)
    {
        const f    = noise.fbm3D(v.x * macroScale, v.y * macroScale, v.z * macroScale, 3, 2, 0.5);
        const base = v.length();
        v.normalize().multiplyScalarInPlace(base + macroAmp * f);

        const n2    = noise.noise3D(v.x * microScale, v.y * microScale, v.z * microScale);
        const base2 = v.length();
        v.normalize().multiplyScalarInPlace(base2 + microAmp * n2);
    }
}
