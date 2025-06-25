////////////////////////////////////////////////////////////////////////////////////////////////////
// Kinematic and Physics simulating asteroids (actors)
////////////////////////////////////////////////////////////////////////////////////////////////////

import { Actor } from "../core/actor.js";
import { SmokeSystem } from "../core/particles/smoke_system.js";
import { Vector3 } from "../utils/Math/Vector3.js";
import { ProceduralIcosphere } from "../utils/ProceduralGeometry/icosphere.js";

const MAX_SPLITS = 2;
const MAX_NUM_CHILDS = 1;

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

        this.bTickEnable = true;

        // Pulling forces setup
        this.isPulling    = false;
        this.pullVelocity = new Vector3();
        this.pullTarget   = new Vector3();

        // Impulse state
        this.impulseVelocity = new Vector3();
        this.impulseDamping = 2.0;

        // Physics sim
        this.mass = (4 / 3) * Math.PI * Math.pow(this.collision.radius, 3) * (0.5 + Math.random());
        this.splitIterations = 0;

        // Init shaders
        const VertShader = './src/shaders/asteroid.vert';
        const FragShader = './src/shaders/asteroid.frag';
        this.InitShaders(VertShader, FragShader);
    }

    // Once per frame
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

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Kinematic orbiting around center of scene
    ////////////////////////////////////////////////////////////////////////////////////////////////////

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

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Asteroid tractor beam - with damping and spring effect
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    Pull(target, dt, stiffness = 500, damping = 40, maxSpeed = 500)
    {
        // set pull‐mode
        this.isPulling = true;

        // displacement from current pos to target
        const pos = this.transform.position;
        const displacement = target.clone().subtract(pos);

        // spring force
        const springForce = displacement.multiplyScalar(stiffness);

        // damping force F_d = −c * v
        const dampingForce = this.pullVelocity.clone().multiplyScalar(-damping);

        // net accel (mass = 1)
        const acceleration = springForce.addInPlace(dampingForce);

        // integrate velocity: v <- v + a * dt
        this.pullVelocity.addInPlace(acceleration.multiplyScalar(dt));

        // clamp to maxSpeed
        if (this.pullVelocity.length() > maxSpeed)
        {
            this.pullVelocity.normalize().multiplyScalar(maxSpeed);
        }

        // integrate position: p <- p + v * dt
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
        this.impulseVelocity.set(0, 0, 0); // Reset impulse velocity
        this.pullTarget = target.clone();
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Asteroid shooting effect
    ////////////////////////////////////////////////////////////////////////////////////////////////////

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

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Asteroid physics sim - elastic collision with (random) fracture 
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    ComputeElasticForces(actor)
    {
        // spawn between 1 and MAX child asteroids
        const count = Math.floor(Math.random() * MAX_NUM_CHILDS) + 1;

        for (let i = 0; i < count; i++) 
        {
            // create child with half the scale - scale not really applied (see generateIcospheres) -> collisions to be solved for scaled meshes!
            const childScale = 0.5;
            const childTransform = this.transform.clone();
            childTransform.scale.multiplyScalarInPlace(childScale);

            // Translate slightly
            // let spawnPos = this.transform.position;
            // spawnPos = spawnPos.add(this.lastCollisionDirection.multiplyScalar(this.collision.radius));
            // childTransform.position.set(spawnPos.x, spawnPos.y, spawnPos.z);

            // Translate slightly and randomly in a cone along a given direction
            const direction = randomDirectionInCone(this.lastCollisionDirection, 30.0);
            const spawnPos = this.transform.position.clone();
            spawnPos.addInPlace(direction.multiplyScalar(this.collision.radius));

            // Set the new trasnform position
            childTransform.position.set(spawnPos.x, spawnPos.y, spawnPos.z);

            // instantiate child asteroid
            let subdivisions = 1;
            const child = new Asteroid(
                this.gl,
                this.world,
                childTransform,
                subdivisions,
                this.bApplyNoise,
                this.macroScale * childScale,
                this.macroAmp * childScale,
                this.microScale * childScale,
                this.microAmp * childScale
            );

            child.splitIterations = this.splitIterations + 1;
            
            // Compute full relative velocity along the normal
            // const direction = this.lastCollisionDirection;
            const actorVelocity = actor.impulseVelocity ? actor.impulseVelocity.clone() : new Vector3();
            const selfVelocity  = this.impulseVelocity.clone();

            const relativeVelocity = Math.sqrt(actorVelocity.subtract(selfVelocity).dot(direction));

            // perfectly elastic for e = 1
            // Δv_child = (2 * m_self / (m_self + m_child)) * relativeVelocity
            const e = 1; // Elastic constant 
            const impulse = (1 + e * this.mass / (this.mass + child.mass)) * relativeVelocity;

            // Apply impulse in collision direction
            child.ApplyImpulse(direction, impulse);

            // Spawn child in world
            this.world.SpawnActor(child);
        }
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Init the asteroid (procedural) mesh
    ////////////////////////////////////////////////////////////////////////////////////////////////////

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

        //this.mesh.setTransform(this.transform); // Breaks collisions

        // tear down any old component
        if (this.collisionComponent)
        {
            this.world.unregisterCollisionComponent(this.collisionComponent);
        }

        // build & register the new convex hull sampler
        this.AddCollisionComponent();
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Actor's base functions override
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    onCollision(actor)
    {
        super.onCollision(actor);

        if (this.splitIterations < MAX_SPLITS)
        {
            this.ComputeElasticForces(actor);
        }

        this.Destroy();
    }

    // Spawn a particle system in there
    onDestroy()
    {
        let smokeSystem = new SmokeSystem(
            this.gl,
            this.world,
            this.transform.position,      // emitter position
            {
                count: 15,                // how many particles
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

////////////////////////////////////////////////////////////////////////////////////////////////////
// Helpers
////////////////////////////////////////////////////////////////////////////////////////////////////

function randomDirectionInCone(axis, angle)
{
    const cosA = Math.cos(angle);
    // pick z uniformly between cosA and 1
    const z = cosA + Math.random() * (1 - cosA);
    const phi = 2 * Math.PI * Math.random();
    const sinT = Math.sqrt(1 - z * z);
    
    // local coords (x,y,z)
    const x = sinT * Math.cos(phi);
    const y = sinT * Math.sin(phi);

    // build basis (u,v,w)
    const w = axis;
    let u = Math.abs(w.x) > 0.1 || Math.abs(w.y) > 0.1 ? new Vector3(-w.y, w.x, 0) : new Vector3(0, -w.z, w.y);
    u.normalize();
    const v = w.clone().cross(u);

    // return rotated vector
    return u.multiplyScalar(x).addInPlace(v.multiplyScalar(y)).addInPlace(w.multiplyScalar(z)).normalize();
}