import  { Renderer } from "./core/renderer.js"
import { World } from "./core/world.js";

var rotX = 0, rotY = 0, transZ = 3;

window.onload = function() {

	var world = new World();

    canvas.zoom = function(s) {
        world.renderer.position.z *= s / canvas.height + 1;
        world.renderer.UpdateProjectionMatrix();
        world.DrawScene();
    }

    canvas.onwheel = function(event) { // Correctly handled here
        canvas.zoom(0.3 * event.deltaY);
        world.DrawScene(); // Make sure to redraw after zoom
    }

    canvas.onmousedown = function(event) { // Correctly handled here
        var cx = event.clientX;
        var cy = event.clientY;
        if (event.ctrlKey) {
            canvas.onmousemove = function(event) { // <-- Pass 'event' here
                canvas.zoom(5 * (event.clientY - cy));
                cy = event.clientY;
                world.DrawScene(); // Make sure to redraw after zoom
            }
        } else {
            canvas.onmousemove = function(event) { // <-- And pass 'event' here
                world.renderer.rotation.pitch += (cx - event.clientX) / canvas.width * 5;
                world.renderer.rotation.roll += (cy - event.clientY) / canvas.height * 5;
                cx = event.clientX;
                cy = event.clientY;
                world.renderer.UpdateProjectionMatrix(); // Only necessary if projection matrix depends on rotation, which it doesn't here.
                world.DrawScene();

                if (document.getElementById("rotX")) {
                    document.getElementById("rotX").innerHTML = rotX.toFixed(2);
                }
                if (document.getElementById("rotY")) {
                    document.getElementById("rotY").innerHTML = rotY.toFixed(2);
                }
            }
        }
    }
    canvas.onmouseup = canvas.onmouseleave = function() {
        canvas.onmousemove = null;
    }

    world.DrawScene(); // Initial draw
};

function WindowResize() {
    UpdateCanvasSize();
    DrawScene();
}