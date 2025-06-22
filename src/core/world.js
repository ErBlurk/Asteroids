///////////////////////////////////////////////////////////////////////////////////
// world.js
// A “scene manager” that holds collections of cameras, actors, pawns, lights, etc.
// Just a simple registry so everything is easily accessible.
///////////////////////////////////////////////////////////////////////////////////

import { Transform } from "../utils/Math/Transform.js";
import { Asteroid } from "../game/asteroid.js";
import { Renderer } from "./renderer.js";
import { Vector3 } from "../utils/Math/Vector3.js";
import { DirectionalLight } from "./directional_light.js";
import { SpatialGrid } from "../objects/spatial_grid.js";
import { Actor } from "./actor.js";

export class World {
    constructor() {
        this.renderer = new Renderer();
        this.gl = this.renderer.gl;

        this.actors = [];
        this.tickingActors = [];
        this.visibleActors = [];

        this.dirLight = new DirectionalLight(new Vector3(0.5, 1, -1));

        // Collision system
        this.grid = new SpatialGrid(20);

        // Scene generation
        this.SpawnAsteroids();

        // this.DebugSpheres();
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Scene Managment
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    DebugSpheres() 
    {
        let pA = new Vector3(0, 0, 0);
        let pB = new Vector3(-2, 5, 0);

        const subdivisions = 2; // + Math.floor(Math.random() * 2); // 2 or 3
        const macroScale = 1; //0.1 + Math.random() * 0.4;
        const macroAmp = 0; //0.6 + Math.random() * 1.2;
        const microScale = 1; // 5.0 + Math.random() * 10.0;
        const microAmp = 0; //0.05 + Math.random() * 0.15;

        let t = new Transform();
        t.setPosition(pA);
        let actor = new Asteroid(this.gl, this, t, subdivisions, true, macroScale, macroAmp, microScale, microAmp);
        this.SpawnActor(actor);

        t = new Transform();
        t.setPosition(pB);
        actor = new Asteroid(this.gl, this, t, subdivisions, true, macroScale, macroAmp, microScale, microAmp);
        this.SpawnActor(actor);
    }

    SpawnAsteroids()
    {
        for (let i = 0; i < 128; i++) {
            const t = Transform.random(128, 1, 1);
        
            // Shape category
            const type = Math.random();
        
            // Random scaling — avoid uniformity
            let sx = 1, sy = 1, sz = 1;
            if (type < 0.25) {
                // Fat potato
                sx = 1.2 + Math.random() * 3;
                sy = 1.2 + Math.random() * 3;
                sz = 1.2 + Math.random() * 3;
            } else if (type < 0.5) {
                // Long noodle
                sx = 0.3 + Math.random() * 0.5;
                sy = 1.5 + Math.random();
                sz = 0.3 + Math.random() * 0.5;
            } else if (type < 0.75) {
                // Disk
                sx = 1.0 + Math.random();
                sy = 0.3 + Math.random() * 0.3;
                sz = 1.0 + Math.random();
            } else {
                // Lumpy rock
                sx = 0.8 + Math.random() * 1.2;
                sy = 0.8 + Math.random() * 1.2;
                sz = 0.8 + Math.random() * 1.2;
            }
        
            // Apply scaling
            t.scale.set(sx, sy, sz).multiplyScalarInPlace(1.0 + Math.random() * 5.0);
        
            // Shape noise settings
            const subdivisions = 3; // + Math.floor(Math.random() * 2); // 2 or 3
            const macroScale = 0.1 + Math.random() * 0.4;
            const macroAmp = 0.6 + Math.random() * 1.2;
            const microScale = 5.0 + Math.random() * 10.0;
            const microAmp = 0.05 + Math.random() * 0.15;
        
            const actor = new Asteroid(this.gl, this, t, subdivisions, true, macroScale, macroAmp, microScale, microAmp);
            this.SpawnActor(actor);
        }        
    }

    HandleCollisions() {
        // Broad-phase: clear grid and bucket all collision components from actors
        this.grid.clear();
        const collisions = [];
        const actorMap = new Map();
        for (const actor of this.actors) {
            const col = actor.collision;
            if (!col) continue;
            collisions.push(col);
            actorMap.set(col, actor);
            this.grid.add(col);
        }
    
        // Prepare for duplicate-pair skipping
        const seen = new Set();
        const indexMap = new Map(collisions.map((c, i) => [c, i]));
    
        // Narrow-phase: test only nearby buckets
        for (const actorA of this.actors) {
            const colA = actorA.collision;
            if (!colA) continue;
    
            const pA = colA.transform.position;
            const rA = colA.radius;
    
            for (const colB of this.grid.queryNearby(colA)) {
                if (colA === colB) continue;
    
                // unique key per unordered pair
                const iA = indexMap.get(colA);
                const iB = indexMap.get(colB);
                const key = iA < iB ? `${iA},${iB}` : `${iB},${iA}`;
                if (seen.has(key)) continue;
                seen.add(key);
    
                const pB = colB.transform.position;
                const dx = pA.x - pB.x;
                const dy = pA.y - pB.y;
                const dz = pA.z - pB.z;
                const dist2 = dx*dx + dy*dy + dz*dz;
    
                const rB = colB.radius;
                const sumR = rA + rB;
    
                // overlap test (squared)
                if (dist2 < sumR * sumR) {
                    const actorB = actorMap.get(colB);
                    actorA.onCollision(actorB);
                    actorB.onCollision(actorA);
                }
            }
        }
    }
    

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Game loop - frame spawner
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    // Main game loop
    StartGameLoop() {
        this.lastFrameTime = performance.now();

        const gameLoop = (currentTime) => {
            const deltaTime = (currentTime - this.lastFrameTime) / 1000.0; // Convert ms to seconds
            this.lastFrameTime = currentTime;

            // 1. Tick (Update) all actors
            for (let actor of this.actors) {
                if (actor.bTickEnable) {
                    actor.Tick(deltaTime);
                }
                if(actor.bPendingDestroy) {
                    this.RemoveActor(actor);
                }
            }

            // 1.bis Collision handling
            this.HandleCollisions();

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