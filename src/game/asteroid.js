import { Actor } from "../core/actor.js";
import { SmokeSystem } from "../core/particles/smoke_system.js";
import { Vector3 } from "../utils/Math/Vector3.js";
import { ProceduralIcosphere } from "../utils/ProceduralGeometry/icosphere.js";

export class Asteroid extends Actor
{
    constructor(gl, world, transform, subdivisions = 2, bApplyNoise = false, macroScale = 0.2, macroAmp = 1.2, microScale = 10.0, microAmp = 0.1)
    {
        super(gl, world, transform);

        this.bApplyNoise = bApplyNoise;
        this.macroScale = macroScale;
        this.macroAmp = macroAmp;
        this.microScale = microScale;
        this.microAmp = microAmp;
        this.generateIcosphere(subdivisions, bApplyNoise);

        this._orbitalAxis = Vector3.random().normalize();            // random unit axis
        this._orbitalSpeed = 0.02 + Math.random() * 0.05;             // radians/sec
        this._selfRotVelocity = Vector3.random().multiplyScalar(0.5);   // Euler radians/sec

        const VertShader = './src/shaders/asteroid.vert';
        const FragShader = './src/shaders/asteroid.frag';
        this.InitShaders(VertShader, FragShader);
    }

    Tick(deltaTime)
    {
        // Orbit around world origin
        const angle = this._orbitalSpeed * deltaTime;
        const axis = this._orbitalAxis;
        const pos = this.transform.position.clone();  // current world-pos

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

        // Self-rotation
        const sv = this._selfRotVelocity;
        this.transform.rotation.add(
            sv.x * deltaTime,
            sv.y * deltaTime,
            sv.z * deltaTime
        );
    }

    generateIcosphere(iterations = 2)
    {
        const { positions, texCoords, normals } = ProceduralIcosphere.buildIcosphere(
            iterations,
            this.bApplyNoise,
            this.macroScale,
            this.macroAmp,
            this.microScale,
            this.microAmp,
            this.transform
        );
        this.mesh.setMesh(positions, texCoords, normals);

        // tear down any old component
        if (this.collisionComponent)
        {
            this.world.unregisterCollisionComponent(this.collisionComponent);
        }

        // build & register the new convex hull sampler
        this.AddCollisionComponent();
    }

    onCollision(actor)
    {
        super.onCollision(actor);

        this.Destroy();
    }

    onDestroy()
    {
        let smokeSystem = new SmokeSystem(
            this.gl,
            this.world,
            this.transform.position,      // emitter position
            {
                count: 15,             // how many particles
                minRadius: 1,
                maxRadius: 5,
                minLife: 3,
                maxLife: 5,
                minScaleFactor: 0.5,
                maxScaleFactor: 1.5,
                scale: new Vector3(0.2, 0.2, 0.2),
                direction: this.lastCollisionDirection.clone()
            }
        );

        this.world.SpawnParticleSystem(smokeSystem);
    }
}
