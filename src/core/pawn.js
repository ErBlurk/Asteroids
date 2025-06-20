import { Actor } from "./actor.js";
import { Vector3 } from "../utils/Math/Vector3.js";

var MIN_Y_ROT = -80.0;
var MAX_Y_ROT = 80.0;

export class Pawn extends Actor {
    constructor(gl, world, transform) {
        super(gl, world, transform);

        // Convert degrees to radians
        MIN_Y_ROT *= Math.PI / 180.0;
        MAX_Y_ROT *= Math.PI / 180.0;

        // Input handling
        this.keysPressed = {}; // Object to store pressed key states
        this.movementSpeed = 3; // Adjust as needed
        this.verticalSpeed = 5; // Adjust for Q E movement

        // Third-person offset in pawn-local space:
        this.cameraOffset = new Vector3(0, 2, -5);

        this.acceleration = 10;          // units/sec²
        this.maxSpeed = 10;          // units/sec
        this.friction = 0.5;         // higher = quicker stop

        // Velocity vector:
        this.velocity = new Vector3(0, 0, 0);

        // Camera smoothing factor (0–1):
        this.cameraLerp = 0.15;

        this.InitController();

        this.LoadObj("../assets/objects/voyager_1.obj");
    }

    Tick(deltaTime) {
        this.HandleInput(deltaTime);
    }

    AddMovementInput(dir, dt) {
        // Desired accel vector
        const accel = dir.clone().multiplyScalar(this.acceleration);

        // Integrate velocity
        this.velocity.addInPlace(accel.multiplyScalar(dt));

        // Apply friction when no input
        if (dir.lengthSq() === 0) {
            const drag = Math.exp(-this.friction * dt);
            this.velocity.multiplyScalarInPlace(drag);
        }

        // Clamp to max speed
        if (this.velocity.length() > this.maxSpeed) {
            this.velocity.normalize().multiplyScalarInPlace(this.maxSpeed);
        }

        // Move pawn
        this.transform.position.addInPlace(this.velocity.clone().multiplyScalar(dt));
    }

    HandleInput(dt) {
        const world = this.world;
        const yaw = world.renderer.rotation.yaw;
        const pitch = -world.renderer.rotation.pitch;

        // Build a unit “input direction” from WASD/QE:
        let input = new Vector3(0, 0, 0);
        if (this.keysPressed['w']) input.z +=  1;
        if (this.keysPressed['s']) input.z += -1;
        if (this.keysPressed['a']) input.x += -1;
        if (this.keysPressed['d']) input.x +=  1;
        if (this.keysPressed['q']) input.y +=  1;
        if (this.keysPressed['e']) input.y += -1;
        if (input.lengthSq() > 0) input.normalize();

        // Transform input from camera-local into world-space
        const forward = new Vector3(
            Math.sin(yaw) * Math.cos(pitch),
            Math.sin(pitch),
            -Math.cos(yaw) * Math.cos(pitch)
        ).normalize();
        const right = new Vector3(
            Math.sin(yaw - Math.PI / 2),
            0,
            -Math.cos(yaw - Math.PI / 2)
        ).normalize();
        const up = new Vector3(0, 1, 0);

        // Combine into movement direction
        const dir = new Vector3(0, 0, 0);
        dir.addInPlace(forward.clone().multiplyScalar(input.z));
        dir.addInPlace(right.clone().multiplyScalar(input.x));
        dir.addInPlace(up.clone().multiplyScalar(input.y));
        if (dir.lengthSq() > 0) dir.normalize();

        // Apply acceleration, friction, clamp & move pawn
        this.AddMovementInput(dir, dt);

        // Smooth camera follow
        const camPos = world.renderer.position;
        camPos.x += (this.transform.position.x - camPos.x) * this.cameraLerp;
        camPos.y += (this.transform.position.y - camPos.y) * this.cameraLerp;
        camPos.z += (this.transform.position.z - camPos.z) * this.cameraLerp;

        // Update on-screen position info
        if (document.getElementById("posX")) document.getElementById("posX").innerHTML = camPos.x.toFixed(2);
        if (document.getElementById("posY")) document.getElementById("posY").innerHTML = camPos.y.toFixed(2);
        if (document.getElementById("posZ")) document.getElementById("posZ").innerHTML = camPos.z.toFixed(2);

        world.DrawScene();
    }


    _onMouseMove = (event) => {
        const canvas = this.world.renderer.canvas;
        const clamp = (v, min, max) => v < min ? min : v > max ? max : v;
        const speed = 0.002;  // tweak sensitivity

        this.world.renderer.rotation.yaw -= event.movementX * speed;
        this.world.renderer.rotation.pitch -= event.movementY * speed;
        this.world.renderer.rotation.pitch = clamp(
            this.world.renderer.rotation.pitch, MIN_Y_ROT, MAX_Y_ROT
        );

        this.world.renderer.UpdateProjectionMatrix();
        this.world.DrawScene();

        // update UI if present…
        if (document.getElementById("rotX")) document.getElementById("rotX").innerHTML = (this.world.renderer.rotation.yaw * 180 / Math.PI).toFixed(2);
        if (document.getElementById("rotY")) document.getElementById("rotY").innerHTML = (this.world.renderer.rotation.pitch * 180 / Math.PI).toFixed(2);
    }


    InitController() {
        const world = this.world;
        const canvas = this.world.renderer.canvas;

        const clamp = (value, min, max) => {
            if (value < min) return min;
            if (value > max) return max;
            return value;
        }

        document.addEventListener('keydown', (event) => {
            const key = event.key.toLowerCase();
            if (['w', 'a', 's', 'd', 'q', 'e', ' '].includes(key)) {
                event.preventDefault(); // Prevent default browser actions
            }
            this.keysPressed[key] = true;
        });

        document.addEventListener('keyup', (event) => {
            const key = event.key.toLowerCase();
            this.keysPressed[key] = false;
        });

        // Request lock when user clicks canvas
        canvas.addEventListener('click', () => {
            canvas.requestPointerLock();
        });

        // When lock state changes, bind or unbind our pan handler
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement === canvas) {
                document.addEventListener('mousemove', this._onMouseMove, false);
            } else {
                document.removeEventListener('mousemove', this._onMouseMove, false);
            }
        });
    }
}