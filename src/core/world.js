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

        this.objects = [];
        this.actors = [];

        for(let i = 0; i < 100; i++)
        {
            this.SpawnActor(Transform.random(10, 1, 0.1));
        }
    }

    addObject(object) 
    {
        this.objects.push(object);
    }

    SpawnActor(transform = new Transform())
    {
        let actor = new Actor(this.gl, transform);
        actor.LoadObj("../assets/objects/teapot-low.obj");

        this.actors.push(actor);
    }

    // Call this once per frame to render everything
    DrawScene() 
    {
        let mvp = this.renderer.GetModelViewProjection();

        // Clear the screen and the depth buffer.
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        for (let actor of this.actors) {
            // Draw the actors
            actor.DrawComponents(mvp);
        }
    }
}