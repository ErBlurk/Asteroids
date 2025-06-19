import { Actor } from "./actor.js";
import { Vector3 } from "../utils/Math/Vector3.js";

var MIN_Y_ROT = -80.0;
var MAX_Y_ROT = 80.0;

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
        
        this.InitController();
    }

    Tick(deltaTime) 
    {
        this.HandleInput(deltaTime);
    }

    AddMovementInput(amount, acceleration)
    {

    }

    HandleInput(deltaTime)
    {
        const world = this.world;
        const canvas = this.world.renderer.canvas;

        // Movement handling
        var moved = false;
        const cameraPosition = world.renderer.position;

        const yaw = world.renderer.rotation.yaw;
        const pitch = -world.renderer.rotation.pitch;

        // Forward vector
        const forwardX = Math.sin(yaw) * Math.cos(pitch);
        const forwardY = Math.sin(pitch);
        const forwardZ = Math.cos(yaw) * Math.cos(pitch);
        const forwardVector = new Vector3(forwardX, forwardY, -forwardZ).normalize();

        // Right vector
        const rightX = Math.sin(yaw - Math.PI / 2); // 90 degrees to the left of forward
        const rightY = 0;
        const rightZ = -Math.cos(yaw - Math.PI / 2);
        const rightVector = new Vector3(rightX, rightY, rightZ).normalize(); // Keep it horizontal

        // Up vector (vertical movement for Q/E, or true camera up)
        const upVector = new Vector3(0, 1, 0);

        // Account for delta Time between frames for a smoother experience
        const movementAmount = this.movementSpeed * deltaTime;
        const verticalAmount = this.verticalSpeed * deltaTime;
        forwardVector.multiplyScalarInPlace(movementAmount);
        rightVector.multiplyScalarInPlace(movementAmount);
        upVector.multiplyScalarInPlace(verticalAmount);

        // W: Move forward
        if (this.keysPressed['w']) {
            cameraPosition.x += forwardVector.x;
            cameraPosition.y += forwardVector.y;
            cameraPosition.z += forwardVector.z;
            moved = true;
        }
        // S: Move backward
        if (this.keysPressed['s']) {
            cameraPosition.x -= forwardVector.x;
            cameraPosition.y -= forwardVector.y;
            cameraPosition.z -= forwardVector.z;
            moved = true;
        }
        // A: Move left (strafe left)
        if (this.keysPressed['a']) {
            cameraPosition.x -= rightVector.x;
            cameraPosition.z -= rightVector.z; // Strafe left on the horizontal plane
            moved = true;
        }
        // D: Move right (strafe right)
        if (this.keysPressed['d']) {
            cameraPosition.x += rightVector.x;
            cameraPosition.z += rightVector.z; // Strafe right on the horizontal plane
            moved = true;
        }
        // Q: Move up
        if (this.keysPressed['q']) {
            cameraPosition.y += upVector.y;
            moved = true;
        }
        // E: Move down
        if (this.keysPressed['e']) {
            cameraPosition.y -= upVector.y;
            moved = true;
        }

        if (moved) 
        {
            // Update UI elements if they show position
            if (document.getElementById("posX")) 
            {
                document.getElementById("posX").innerHTML = cameraPosition.x.toFixed(2);
            }

            if (document.getElementById("posY")) 
            {
                document.getElementById("posY").innerHTML = cameraPosition.y.toFixed(2);
            }

            if (document.getElementById("posZ")) 
            {
                document.getElementById("posZ").innerHTML = cameraPosition.z.toFixed(2);
            }
        }
    }

    InitController()
    {
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

        canvas.onmousedown = function(event) { // Correctly handled here
            var cx = event.clientX;
            var cy = event.clientY;

            // Look at handling
            canvas.onmousemove = function(event) { // <-- And pass 'event' here
                world.renderer.rotation.yaw += (cx - event.clientX) / canvas.width * 5; // Look left and right
                world.renderer.rotation.pitch += (cy - event.clientY) / canvas.height * 5; // Look up and down
                world.renderer.rotation.pitch = clamp(world.renderer.rotation.pitch, MIN_Y_ROT, MAX_Y_ROT);

                cx = event.clientX;
                cy = event.clientY;

                world.renderer.UpdateProjectionMatrix(); // Only necessary if projection matrix depends on rotation, which it doesn't here.
                world.DrawScene();

                if (document.getElementById("rotX")) {
                    document.getElementById("rotX").innerHTML = (world.renderer.rotation.yaw * 180 / Math.PI).toFixed(2);
                }
                if (document.getElementById("rotY")) {
                    document.getElementById("rotY").innerHTML = (world.renderer.rotation.pitch * 180 / Math.PI).toFixed(2);
                }
            }
        }
        canvas.onmouseup = canvas.onmouseleave = function() {
            canvas.onmousemove = null;
        }
    }
}