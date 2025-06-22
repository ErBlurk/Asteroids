import { World } from "./core/world.js";
import { Pawn } from "./core/pawn.js"
import { Transform } from "./utils/Math/Transform.js";
import { Actor } from "./core/actor.js";

var world = null;

window.onload = function() {

	world = new World();
    world.StartGameLoop();

    // Main player with controller
    var player = new Pawn(world.gl, world, new Transform())
    world.SpawnActor(player);

    world.DrawScene(); // Initial draw
};

export function WindowResize() {
    if(world && world.renderer)
    {
        world.renderer.UpdateCanvasSize();
    }
}

window.WindowResize = WindowResize;