///////////////////////////////////////////////////////////////////////////////////
// world.js
// A “scene manager” that holds collections of cameras, actors, pawns, lights, etc.
// Just a simple registry so everything is easily accessible.
///////////////////////////////////////////////////////////////////////////////////

import { Transform } from "../utils/Math/Transform.js";
import { Actor } from "./actor.js"
import { Asteroid } from "../game/asteroid.js";
import { Renderer } from "./renderer.js";
import { Vector3 } from "../utils/Math/Vector3.js";
import { Matrix4 } from "../utils/Math/Matrix4.js";
import { DirectionalLight } from "./directional_light.js";

export class World {
    constructor() {
        this.renderer = new Renderer();
        this.gl = this.renderer.gl;

        this.actors = [];
        this.tickingActors = [];
        this.visibleActors = [];

        this.dirLight = new DirectionalLight(new Vector3(0.5, 1, -1));

        for (let i = 0; i < 128; i++) {
            let t = Transform.random(128, 1, 1);
            t.scale.set((1 + Math.random()) / 2.0, (1 + Math.random()) / 2.0, (1 + Math.random()) / 2.0).multiplyScalarInPlace(Math.random() * 5.0);
            let actor = new Asteroid(this.gl, this, t, 3, true);
            // actor.LoadObj("../assets/objects/teapot-low.obj");
            this.SpawnActor(actor);
        }
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Actor handling
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    _removeFromEfficientArray(array, item) {
        const index = array.indexOf(item);
        if (index > -1) {
            // Swap the item to be removed with the last item in the array
            const lastItem = array[array.length - 1];
            array[index] = lastItem;
            // Remove the last item (which is now the one we wanted to remove)
            array.pop();
            return true; // Item was found and removed
        }
        return false; // Item not found
    }

    // Main game loop
    StartGameLoop() {
        this.lastFrameTime = performance.now();

        const gameLoop = (currentTime) => {
            const deltaTime = (currentTime - this.lastFrameTime) / 1000.0; // Convert ms to seconds
            this.lastFrameTime = currentTime;

            // 1. Tick (Update) all actors
            for (let actor of this.tickingActors) {
                if (actor.bTickEnable) {
                    actor.Tick(deltaTime);
                }
            }

            // 2. Draw the scene
            this.DrawScene();

            // 3. Update Frames Per Second Counter
            if (document.getElementById("fps")) {
                document.getElementById("fps").innerHTML = (1 / deltaTime).toFixed(2);
            }

            this.renderer.drawHUD();

            // Request the next frame
            requestAnimationFrame(gameLoop);
        };

        // Start the loop
        requestAnimationFrame(gameLoop);
    }

    SpawnActor(actor) {
        this.actors.push(actor);

        if (actor.bTickEnable === undefined) actor.bTickEnable = false; // Default
        if (actor.bTickEnable) {
            this.tickingActors.push(actor);
        }

        if (actor.bHidden === undefined) actor.bHidden = false; // Default
        if (!actor.bHidden) {
            this.visibleActors.push(actor);
        }
    }

    RemoveActor(actor) {
        // Remove from the main actors array
        this._removeFromEfficientArray(this.actors, actor);

        // Remove from tickingActors if it was tickable
        if (actor.bTickEnable) { // Check bTickEnable to know if it was in the ticking list
            this._removeFromEfficientArray(this.tickingActors, actor);
        }

        // Remove from visibleActors if it was visible
        if (!actor.bHidden) { // Check bHidden to know if it was in the visible list
            this._removeFromEfficientArray(this.visibleActors, actor);
        }
    }

    ActorTickEnable(actor, bTickEnable) {
        // Only update if the state is actually changing
        if (actor.bTickEnable !== bTickEnable) {
            actor.bTickEnable = bTickEnable; // Update the actor's internal flag

            if (bTickEnable) {
                // If enabling tick, add to tickingActors if not already there
                if (this.tickingActors.indexOf(actor) === -1) {
                    this.tickingActors.push(actor);
                }
            } else {
                // If disabling tick, remove from tickingActors
                this._removeFromEfficientArray(this.tickingActors, actor);
            }
        }
    }

    ActorToggleVisibility(actor, bHidden) {
        // Only update if the state is actually changing
        if (actor.bHidden !== bHidden) {
            actor.bHidden = bHidden; // Update the actor's internal flag

            if (bHidden) {
                // If hiding, remove from visibleActors
                this._removeFromEfficientArray(this.visibleActors, actor);
            } else {
                // If showing, add to visibleActors if not already there
                if (this.visibleActors.indexOf(actor) === -1) {
                    this.visibleActors.push(actor);
                }
            }
        }
    }


    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Scene handling
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    
    DrawScene() {
        const gl = this.gl;
        const vpMatrix = this.renderer.GetViewProjectionMatrix();
        const lightDir = this.dirLight.direction;  // a Vector3

        this.gl.clearColor(0.0, 0.0, 0.0, 1.0); // optional, but safe to reset
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        // Skybox first
        if (this.renderer.skybox) {
            const vp = this.renderer.GetViewProjectionMatrix();
            this.renderer.skybox.draw();          
        }

        for (let actor of this.visibleActors) {
            if (actor.bHidden) continue;

            const mesh = actor.mesh;
            gl.useProgram(mesh.prog);

            // set the light uniform
            const loc = gl.getUniformLocation(mesh.prog, "uLightDirection");
            gl.uniform3f(loc, lightDir.x, lightDir.y, lightDir.z);

            // now draw as you did before
            actor.DrawComponents(vpMatrix);
        }
    }
    
}