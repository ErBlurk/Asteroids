import { Actor } from "../core/actor.js";
import { SmokeSystem } from "../core/particles/smoke_system.js";
import { Vector3 } from "../utils/Math/Vector3.js";
import { ProceduralIcosphere } from "../utils/ProceduralGeometry/icosphere.js";

const WORLD_BOUNDS = 256;

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

        this.orbitalAxis = Vector3.random().normalize();            // random unit axis
        this.orbitalSpeed = 0.02 + Math.random() * 0.05;             // radians/sec
        this.selfRotVelocity = Vector3.random().multiplyScalar(0.5);   // Euler radians/sec

        const VertShader = './src/shaders/asteroid.vert';
        const FragShader = './src/shaders/asteroid.frag';
        this.InitShaders(VertShader, FragShader);

        this.bTickEnable = true;

        // Pulling forces setup
        this.isPulling    = false;
        this.pullVelocity = new Vector3();
        this.pullTarget   = new Vector3();

        // Impulse state
        this.impulseVelocity = new Vector3();
        this.impulseDamping = 2.0;
    }

    Tick(deltaTime)
    {
        if (this.isPulling)
        {
            this.Pull(this.pullTarget, deltaTime);
            this.isPulling = false;
        } 
        else
        {
            this.UpdateImpulse(deltaTime);
            this.Orbit(deltaTime);
        }
    }

    Orbit(deltaTime)
    {
        // Orbit around world origin
        const angle = this.orbitalSpeed * deltaTime;
        const axis = this.orbitalAxis;
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
        const sv = this.selfRotVelocity;
        this.transform.rotation.add(
            sv.x * deltaTime,
            sv.y * deltaTime,
            sv.z * deltaTime
        );
    }

    Pull(target, dt, stiffness = 500, damping = 40, maxSpeed = 500)
    {
        // set pull‐mode
        this.isPulling = true;

        // displacement from current pos to target
        const pos = this.transform.position;
        const displacement = target.clone().subtract(pos);

        // spring force
        const springForce = displacement.multiplyScalar(stiffness);

        // damping force F_d = −c·v
        const dampingForce = this.pullVelocity.clone().multiplyScalar(-damping);

        // net accel (mass = 1)
        const acceleration = springForce.addInPlace(dampingForce);

        // integrate velocity: v <- v + a·dt
        this.pullVelocity.addInPlace(acceleration.multiplyScalar(dt));

        // clamp to maxSpeed
        if (this.pullVelocity.length() > maxSpeed)
        {
            this.pullVelocity.normalize().multiplyScalar(maxSpeed);
        }

        // integrate position: p <- p + v·dt
        this.transform.position.addInPlace(this.pullVelocity.clone().multiplyScalar(dt));

        // stop when we’re “close enough”
        if (displacement.length() < 0.01 && this.pullVelocity.length() < 0.01)
        {
            this.isPulling = false;
            this.pullVelocity.set(0, 0, 0);
            this.transform.setPosition(target);
        }
    }

    SetPullTarget(target)
    {
        this.isPulling = true;
        this.pullTarget = target.clone();
    }

    UpdateImpulse(dt)
    {
        const v = this.impulseVelocity;
        if (v.lengthSq() < 1e-6) return;

        // translate
        this.transform.position.addInPlace(v.clone().multiplyScalar(dt));

        // apply simple exponential damping: v *= exp(–damping * dt)
        const dampFactor = Math.max(0, 1 - this.impulseDamping * dt);
        v.multiplyScalar(dampFactor);

        if(this.transform.position.length() > WORLD_BOUNDS)
        {
            this.Destroy();
        }
    }

    ApplyImpulse(direction, magnitude)
    {
        // reset any old impulse, then add new
        this.impulseVelocity = direction.clone().normalize().multiplyScalar(magnitude);
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
