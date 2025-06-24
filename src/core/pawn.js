import { Actor } from "./actor.js";
import { Vector3 } from "../utils/Math/Vector3.js";
import { Matrix4 } from "../utils/Math/Matrix4.js";
import { RayCast } from "./collision/raycast.js";

var MIN_Y_ROT = -80.0;
var MAX_Y_ROT = 80.0;
const MAX_RAY_DISTANCE = 4096;

export class Pawn extends Actor
{
    constructor(gl, world, transform)
    {
        super(gl, world, transform);

        // Convert degrees to radians
        MIN_Y_ROT *= Math.PI / 180.0;
        MAX_Y_ROT *= Math.PI / 180.0;

        // Input handling
        this.keysPressed = {}; // Object to store pressed key states
        this.movementSpeed = 3; // Adjust as needed
        this.verticalSpeed = 5; // Adjust for Q E movement

        // Third-person offset in pawn-local space:
        this.cameraOffset = new Vector3(0, 0.5, -6);

        this.acceleration = 10;      // units/sec²
        this.maxSpeed = 10;          // units/sec
        this.friction = 0.5;         // higher = quicker stop

        // Velocity vector:
        this.velocity = new Vector3(0, 0, 0);

        // Camera smoothing factor (0–1):
        this.cameraLerp = 0.15;

        // Spring-damper parameters for the camera
        this.cameraSpringVelocity = Vector3.zero();    // current camera velocity
        this.cameraSpringStiffness = 500;              // "spring" constant
        this.cameraSpringDamping = 50;               // damping coefficient

        // laser state
        this.rayCaster        = new RayCast(world);
        this._laserActive     = false;
        this._laserStartTime  = 0;
        this._laserDuration   = 1000; // ms
        this._laserOrigin     = new Vector3();
        this._laserEnd        = new Vector3();

        // Input state
        this.leftDown = false;
        this.rightDown = false;
        this.lastMouseEvent = null;

        // Initializers
        this.InitController();
        this.InitMesh();
    }

    async InitMesh()
    {
        await this.LoadObj("../assets/objects/spaceship.obj");

        const VertShader = './src/shaders/spaceship.vert';
        const FragShader = './src/shaders/spaceship.frag';
        await this.InitShaders(VertShader, FragShader);

        await this.LoadTexture("../assets/textures/spaceship_diffuse.png", true);

        await this.LoadEmissiveTexture("../assets/textures/spaceship_emissive.png", true);
    }

    Tick(deltaTime)
    {
        this.HandleInput(deltaTime);

        if(this.leftDown || this.rightDown)
        {
            this.onMouseDown(this.lastMouseEvent);
        }
    }

    AddMovementInput(dir, dt)
    {
        // Desired accel vector
        const accel = dir.clone().multiplyScalar(this.acceleration);

        // Integrate velocity
        this.velocity.addInPlace(accel.multiplyScalar(dt));

        // Apply friction when no input
        if (dir.lengthSq() === 0)
        {
            const drag = Math.exp(-this.friction * dt);
            this.velocity.multiplyScalarInPlace(drag);
        }

        // Clamp to max speed
        if (this.velocity.length() > this.maxSpeed)
        {
            this.velocity.normalize().multiplyScalarInPlace(this.maxSpeed);
        }

        // Move pawn
        this.transform.position.addInPlace(this.velocity.clone().multiplyScalar(dt));

        // Set velocity for nice shader effects
        this.gl.useProgram(this.mesh.prog);
        const velocityLoc = this.gl.getUniformLocation(this.mesh.prog, "uVelocity");
        this.gl.uniform1f(velocityLoc, this.velocity.length() / this.maxSpeed);
    }

    /**
     * Orbit the camera around the pawn at `this.cameraOffset`
     * (only yaw-rotated, with a fixed vertical offset) and
     * make it look in the pawn’s facing direction.
     */
    CameraLook()
    {
        const camPos = this.world.renderer.position;
        camPos.x += (this.transform.position.x - camPos.x) * this.cameraLerp;
        camPos.y += (this.transform.position.y - camPos.y) * this.cameraLerp;
        camPos.z += (this.transform.position.z - camPos.z) * this.cameraLerp;
    }

    /**
     * Spring-damper orbit around the pawn.
     * Compute desired camera position = pawnPos + rotated offset.
     * Apply spring + damping to camera velocity.
     * Update camera position.  
     * Keep camera yaw/pitch locked to pawn’s rotation.
     */
    CameraOrbit(direction, dt, useSpring = false)
    {
        const pawnPos = this.transform.position;
        const pitch = this.transform.rotation.pitch;
        const yaw = this.transform.rotation.yaw;

        // Compute horizontal forward: from input or pawn yaw
        let forward;
        if (direction.lengthSq() > 1e-4)
        {
            forward = direction.clone().normalize();
        } 
        else
        {
            forward = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
        }

        // World up and right vectors
        const up = new Vector3(0, 1, 0);
        const right = up.clone().cross(forward).normalize();

        // Tilt forward by pitch around right axis in the forward–up plane
        const cosP = Math.cos(pitch);
        const sinP = -Math.sin(pitch);

        let pitchedForward = forward.clone().multiplyScalar(cosP);
        pitchedForward.add(up.clone().multiplyScalar(sinP));
        pitchedForward.normalize();

        // Desired camera position = pawnPos + right*X + up*Y + pitchedForward*Z
        let desired = pawnPos.clone()
        desired.addInPlace(right.multiplyScalar(this.cameraOffset.x));
        desired.addInPlace(up.multiplyScalar(this.cameraOffset.y));
        desired.addInPlace(pitchedForward.multiplyScalar(this.cameraOffset.z));

        // Fetch current camera position
        const camPos = this.world.renderer.position;

        if (!useSpring)
        {
            // Instant snap (no lag)
            camPos.set(desired.x, desired.y, desired.z);
        } 
        else
        {
            // Spring-damper: F = k·x − c·v
            const disp = desired.clone().subtract(camPos);
            const springF = disp.multiplyScalar(this.cameraSpringStiffness);
            const dampingF = this.cameraSpringVelocity.clone().multiplyScalar(this.cameraSpringDamping);
            const accel = springF.subtract(dampingF);

            // integrate velocity & update
            this.cameraSpringVelocity.addInPlace(accel.multiplyScalar(dt));
            camPos.addInPlace(this.cameraSpringVelocity.clone().multiplyScalar(dt));
        }

        // Write back camera position
        this.world.renderer.position.set(camPos.x, camPos.y, camPos.z);

        // Rebuild view matrix so the camera looks at the pawn
        const eye = [camPos.x, camPos.y, camPos.z];
        const center = [pawnPos.x, pawnPos.y, pawnPos.z];
        this.world.renderer.viewMatrix = Matrix4.lookAt(eye, center, [0, 1, 0]);
    }

    HandleInput(dt)
    {
        const world = this.world;
        const yaw = world.renderer.rotation.yaw;
        const pitch = -world.renderer.rotation.pitch;

        // Build a unit “input direction” from WASD/QE:
        let input = new Vector3(0, 0, 0);
        if (this.keysPressed['w']) input.z += 1;   // Forward
        if (this.keysPressed['s']) input.z += -1;   // Backward
        if (this.keysPressed['a']) input.x += -1;   // Left
        if (this.keysPressed['d']) input.x += 1;   // Right
        if (this.keysPressed['q']) input.y += -1;   // Down
        if (this.keysPressed['e']) input.y += 1;   // Up
        if (input.lengthSq() > 0) input.normalize();

        const cosYaw = Math.cos(yaw);
        const sinYaw = Math.sin(yaw);
        const cosPitch = Math.cos(pitch);
        const sinPitch = Math.sin(pitch);

        // forward points where the camera looks:
        const forward = new Vector3(sinYaw * cosPitch, sinPitch, cosYaw * cosPitch).normalize();

        // right is 90° to the right of forward, flattened on Y:
        const right = new Vector3(cosYaw, 0, -sinYaw).normalize();

        const up = new Vector3(0, 1, 0);

        // blend them with your input:
        let direction = new Vector3();
        direction.addInPlace(forward.clone().multiplyScalar(input.z));
        direction.addInPlace(right.clone().multiplyScalar(input.x));
        direction.addInPlace(up.clone().multiplyScalar(input.y));
        direction.normalize();

        // Apply acceleration, friction, clamp & move pawn
        this.AddMovementInput(direction, dt);

        // Orbit around actor camera
        direction = new Vector3().addInPlace(forward.clone());
        this.CameraOrbit(direction, dt, true);

        // Update on-screen position info
        if (document.getElementById("posX")) document.getElementById("posX").innerHTML = this.transform.position.x.toFixed(2);
        if (document.getElementById("posY")) document.getElementById("posY").innerHTML = this.transform.position.y.toFixed(2);
        if (document.getElementById("posZ")) document.getElementById("posZ").innerHTML = this.transform.position.z.toFixed(2);
    }

    _onMouseMove = (event) =>
    {
        const canvas = this.world.renderer.canvas;
        const clamp = (v, min, max) => v < min ? min : v > max ? max : v;
        const speed = 0.002;  // tweak sensitivity

        this.transform.rotation.yaw += event.movementX * speed;
        this.transform.rotation.pitch += event.movementY * speed;
        this.transform.rotation.pitch = clamp(this.transform.rotation.pitch, MIN_Y_ROT, MAX_Y_ROT);

        this.world.renderer.rotation.yaw = this.transform.rotation.yaw;
        this.world.renderer.rotation.pitch = this.transform.rotation.pitch;

        // update UI if present…
        if (document.getElementById("rotX")) document.getElementById("rotX").innerHTML = (this.world.renderer.rotation.yaw * 180 / Math.PI).toFixed(2);
        if (document.getElementById("rotY")) document.getElementById("rotY").innerHTML = (this.world.renderer.rotation.pitch * 180 / Math.PI).toFixed(2);
    }

    InitController()
    {
        const canvas = this.world.renderer.canvas;

        const clamp = (value, min, max) =>
        {
            if (value < min) return min;
            if (value > max) return max;
            return value;
        }

        document.addEventListener('keydown', (event) =>
        {
            const key = event.key.toLowerCase();
            if (['w', 'a', 's', 'd', 'q', 'e', ' '].includes(key))
            {
                event.preventDefault(); // Prevent default browser actions
            }
            this.keysPressed[key] = true;
        });

        document.addEventListener('keyup', (event) =>
        {
            const key = event.key.toLowerCase();
            this.keysPressed[key] = false;
        });

        // Request lock when user clicks canvas
        canvas.addEventListener('click', () =>
        {
            canvas.requestPointerLock();
        });

        // When lock state changes, bind or unbind our pan handler
        document.addEventListener('pointerlockchange', () =>
        {
            if (document.pointerLockElement === canvas)
            {
                document.addEventListener('mousemove', this._onMouseMove, false);
            } else
            {
                document.removeEventListener('mousemove', this._onMouseMove, false);
            }
        });

        // Mouse click
        document.addEventListener("mousedown", (e) =>
        {
            this.lastMouseEvent = e;

            if (e.button === 0)
            {
                this.leftDown = true;
            }
            else if (e.button === 2)
            {
                this.rightDown = true;
            }
        });

        document.addEventListener("mouseup", (e) =>
        {
            this.lastMouseEvent = e;

            if (e.button === 0)
            {
                this.leftDown = false;
            }
            else if (e.button === 2)
            {
                this.rightDown = false;
            }
        });
    }

    onCollision(actor)
    {
        actor.Destroy();
        //console.log("Collided");
    }

    // Raycasting managing
    onMouseDown(event)
    {
        if (!this.leftDown) return;

        // origin
        const origin = this.transform.position.clone();

        // forward from renderer.rotation
        const { yaw, pitch } = this.world.renderer.rotation;
        const forward = new Vector3(
             Math.sin(yaw) * Math.cos(pitch),
            -Math.sin(pitch),
             Math.cos(yaw) * Math.cos(pitch)
        ).normalize();

        // end point
        const end = origin.clone().addInPlace(forward.multiplyScalar(MAX_RAY_DISTANCE));

        // do the cast to get hit info
        const hit = this.rayCaster.raycast(origin, end, this);

        // console.log("Hit actor:", hit ? hit.actor : null);

        // hand it off to the world
        this.world.DrawLaser(origin, hit ? hit.point : end, 0.01);

        if (hit)
        {
            if(hit.actor)
            {
                if(this.rightDown)
                {
                    // Stop pulling and add impulse
                    this.leftDown = false;
                    this.rightDown = false;
                    if(hit.actor.ApplyImpulse)
                    {
                        hit.actor.ApplyImpulse(forward, 100);
                    }
                }
                else if(hit.actor.SetPullTarget)
                {
                    // Pull the asteroid - Tractor Beam!
                    const pullPoint = this.transform.position.clone().add(forward.clone().multiplyScalar(10));
                    hit.actor.SetPullTarget(pullPoint);
                }
            }
        }
    }

}