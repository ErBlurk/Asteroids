import  { Renderer } from "./core/renderer.js"
import { World } from "./core/world.js";
import { Pawn } from "./core/pawn.js"
import { Transform } from "./utils/Math/Transform.js";

window.onload = function() {

	var world = new World();
    world.StartGameLoop();

    // Main player with controller
    var player = new Pawn(world.gl, world, new Transform())
    player.bTickEnable = true;
    world.SpawnActor(player);

    world.DrawScene(); // Initial draw
};

function WindowResize() {
    UpdateCanvasSize();
    DrawScene();
}