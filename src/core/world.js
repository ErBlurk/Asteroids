///////////////////////////////////////////////////////////////////////////////////
// world.js
// A “scene manager” that holds collections of cameras, actors, pawns, lights, etc.
// Just a simple registry so everything is easily accessible.
///////////////////////////////////////////////////////////////////////////////////

import { Transform } from "../utils/Math/Transform.js";
import { Actor } from "./actor.js"
import { Renderer } from "./renderer.js";

export class World {
    constructor() 
    {
        this.renderer = new Renderer();
        this.gl = this.renderer.gl;

        this.actors = [];
        this.tickingActors = [];
        this.visibleActors = [];

        for(let i = 0; i < 10; i++)
        {
            let actor = new Actor(this.gl, this, Transform.random(10, 1, 1));
            actor.LoadObj("../assets/objects/teapot-low.obj");
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
    StartGameLoop() 
    {
        const gameLoop = (currentTime) => {
            const deltaTime = (currentTime - this.lastFrameTime) / 1000.0; // Convert ms to seconds
            this.lastFrameTime = currentTime;

            // 1. Tick (Update) all actors
            for (let actor of this.tickingActors) 
            {
                if (actor.bTickEnable) 
                {
                    actor.Tick(deltaTime);
                }
            }

            // 2. Draw the scene
            this.DrawScene();

            // 3. Update Frames Per Second Counter
            if (document.getElementById("fps")) 
            {
                document.getElementById("fps").innerHTML = (1 / deltaTime).toFixed(2);
            }

            // Request the next frame
            requestAnimationFrame(gameLoop);
        };

        // Start the loop
        requestAnimationFrame(gameLoop);
    }

    SpawnActor(actor)
    {
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

    // Call this once per frame to render everything
    DrawScene() 
    {
        // this.renderer.UpdateProjectionMatrix();

        //let mvp = this.renderer.GetModelViewProjection();
        let mvp = this.renderer.GetViewProjectionMatrix();

        // Clear the screen and the depth buffer.
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        for (let actor of this.visibleActors) {
            // Draw the actors
            if(!actor.bHidden)
            {
                actor.DrawComponents(mvp);
            }
        }
    }
}