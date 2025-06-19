import { Actor } from "../core/actor.js";
import { Transform } from "../utils/Math/Transform.js";
import { Vector3 } from "../utils/Math/Vector3.js";
import { PerlinNoise } from "../utils/Noise/perlin_noise.js";

export class Asteroid extends Actor {
    constructor(gl, world, transform, subdivisions = 2, bApplyNoise = false, macroScale = 0.2, macroAmp = 1.2, microScale = 10.0, microAmp = 0.1) {
        super(gl, world, transform);

        this.bApplyNoise = bApplyNoise;
        this.macroScale  = macroScale;
        this.macroAmp    = macroAmp;
        this.microScale  = microScale;
        this.microAmp    = microAmp;
        this.generateIcosphere(subdivisions, bApplyNoise);

        this._orbitalAxis    = Vector3.random().normalize();            // random unit axis
        this._orbitalSpeed   = 0.02 + Math.random() * 0.05;             // radians/sec
        this._selfRotVelocity = Vector3.random().multiplyScalar(0.5);   // Euler radians/sec

        const VertShader = './src/shaders/asteroid.vert';
        const FragShader = './src/shaders/asteroid.frag';
        this.InitShaders(VertShader, FragShader);
    }

    Tick(deltaTime) {
        // 1) Orbit around world origin
        const angle = this._orbitalSpeed * deltaTime;
        const axis  = this._orbitalAxis;
        const pos   = this.transform.position.clone();  // current world-pos

        // Rodrigues’ rotation:
        //  v' = v·cosθ + (k×v)·sinθ + k·(k·v)(1−cosθ)
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
    
        const term1 = pos.clone().multiplyScalar(cosA);
        const term2 = axis.clone().cross(pos).multiplyScalar(sinA);
        const term3 = axis.clone().multiplyScalar(axis.dot(pos) * (1 - cosA));
        
        const newPos = term1.addInPlace(term2).addInPlace(term3);
        // update transform
        this.transform.setPosition(newPos);
    
        // 2) Self-rotation
        const sv = this._selfRotVelocity;
        this.transform.rotation.add(
            sv.x * deltaTime,
            sv.y * deltaTime,
            sv.z * deltaTime
        );
    }
  
    generateIcosphere(iterations = 2) {
        const { positions, texCoords } = Asteroid.buildIcosphere(
            iterations,
            this.bApplyNoise,
            this.macroScale,
            this.macroAmp,
            this.microScale,
            this.microAmp,
            this.transform
        );
        this.mesh.setMesh(positions, texCoords);
    }

    static buildIcosphere(iterations = 2, bApplyNoise = false, macroScale = 2.0, macroAmp = 0.5, microScale = 10.0, microAmp = 0.1, transform = Transform.random()) {
        // 1) Create initial unit-radius icosahedron
        const t = (1 + Math.sqrt(5)) / 2;
        let vertices = [
            new Vector3(-1,  t,  0), new Vector3( 1,  t,  0),
            new Vector3(-1, -t,  0), new Vector3( 1, -t,  0),
            new Vector3( 0, -1,  t), new Vector3( 0,  1,  t),
            new Vector3( 0, -1, -t), new Vector3( 0,  1, -t),
            new Vector3( t,  0, -1), new Vector3( t,  0,  1),
            new Vector3(-t,  0, -1), new Vector3(-t,  0,  1)
        ];
        vertices.forEach(v => v.normalize());

        // 20 faces of an icosahedron
        let faces = [
            [0,11, 5], [0, 5, 1], [0, 1, 7], [0, 7,10], [0,10,11],
            [1, 5, 9], [5,11, 4], [11,10, 2], [10, 7, 6], [7, 1, 8],
            [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
            [4, 9, 5], [2, 4,11], [6, 2,10], [8, 6, 7], [9, 8, 1]
        ];

        // Cache midpoints for subdivision
        const midCache = {};
        function getMidpoint(i1, i2) {
            const key = i1 < i2 ? `${i1}_${i2}` : `${i2}_${i1}`;
            if (midCache[key] !== undefined) return midCache[key];
            const v1 = vertices[i1];
            const v2 = vertices[i2];
            const mid = new Vector3(
                (v1.x + v2.x) * 0.5,
                (v1.y + v2.y) * 0.5,
                (v1.z + v2.z) * 0.5
            );
            mid.normalize();
            vertices.push(mid);
            return midCache[key] = vertices.length - 1;
        }

        // 2) Subdivide faces
        for (let i = 0; i < iterations; i++) {
            const newFaces = [];
            for (const [i0, i1, i2] of faces) {
                const a = getMidpoint(i0, i1);
                const b = getMidpoint(i1, i2);
                const c = getMidpoint(i2, i0);
                newFaces.push([i0, a, c], [i1, b, a], [i2, c, b], [a, b, c]);
            }
            faces = newFaces;
        }

        // 3) Build flat position & UV arrays
        const positions = [];
        const texCoords = [];

        // seed based on transform position (optional):
        const seed = Math.floor(transform.position.x * 73856093 ^ transform.position.y * 19349663 ^ transform.position.z * 83492791);
        const noise = new PerlinNoise(seed);

        for (const face of faces) {
            for (const idx of face) {
                const v = vertices[idx].clone();

                // Optionally apply simple random noise per vertex
                if (bApplyNoise) {
                    // macro with fBM (e.g. 3 octaves)
                    const f = noise.fbm3D(v.x * macroScale, v.y * macroScale, v.z * macroScale, 3, 2, 0.5);
                    const baseR = v.length();
                    v.normalize();
                    v.multiplyScalarInPlace(baseR + macroAmp * f);

                    // micro single-octave
                    const n2 = noise.noise3D(v.x * microScale, v.y * microScale, v.z * microScale);
                    const baseR2 = v.length();
                    v.normalize();
                    v.multiplyScalarInPlace(baseR2 + microAmp * n2);
                }

                positions.push(v.x, v.y, v.z);
                // Spherical UV mapping
                const u = 0.5 + Math.atan2(v.z, v.x) / (2 * Math.PI);
                const vTex = 0.5 - Math.asin(v.y) / Math.PI;
                texCoords.push(u, vTex);
            }
        }

        return { positions, texCoords };
    }
}
