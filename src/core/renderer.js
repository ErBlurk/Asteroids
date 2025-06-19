///////////////////////////////////////////////////////////////////////////////////
// Below is the core WebGL initialization code.
///////////////////////////////////////////////////////////////////////////////////
import { Matrix4 } from "../utils/Math/Matrix4.js";
import { Actor } from "../core/actor.js";
import { Vector3 } from "../utils/Math/Vector3.js";
import { Rotator } from "../utils/Math/Rotator.js";

const MAX_RENDER_DISTANCE = 1024;

export class Renderer {
    constructor()
    {
        this.position = new Vector3();
        this.rotation = new Rotator();

        this.gl = null;
        this.canvas = null;
        this.perspectiveMatrix = null;
        this.InitWebGL();
    }

    // Called once to initialize
    InitWebGL() {
        // Initialize the WebGL canvas
        this.canvas = document.getElementById("canvas");
        this.hudCanvas = document.getElementById("hud");
        this.hudCtx    = this.hudCanvas.getContext("2d");
        this.canvas.oncontextmenu = function () { return false; };
        this.gl = this.canvas.getContext("webgl", { antialias: false, depth: true });	// Initialize the GL context
        if (!this.gl) {
            alert("Unable to initialize WebGL. Your browser or machine may not support it.");
            return;
        }

        // Initialize settings
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.enable(this.gl.DEPTH_TEST);

        // Initialize the programs and buffers for drawing
        // actor = new Actor(gl);
        // actor.LoadObj("../assets/objects/teapot-low.obj");

        // Set the viewport size
        this.UpdateCanvasSize();
    }

    // Called every time the window size is changed.
    /*UpdateCanvasSize() {
        this.canvas.style.width = "100%";
        this.canvas.style.height = "100%";
        const pixelRatio = window.devicePixelRatio || 1;
        this.canvas.width = pixelRatio * this.canvas.clientWidth;
        this.canvas.height = pixelRatio * this.canvas.clientHeight;
        const width = (canvas.width / pixelRatio);
        const height = (canvas.height / pixelRatio);
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

        this.UpdateProjectionMatrix();
    }*/


    UpdateCanvasSize() {
        const pixelRatio = window.devicePixelRatio || 1;
    
        // 1) Measure CSS size of GL canvas
        const cssWidth  = this.canvas.clientWidth;
        const cssHeight = this.canvas.clientHeight;
    
        // 2) Resize GL drawing buffer
        this.canvas.width  = Math.floor(cssWidth  * pixelRatio);
        this.canvas.height = Math.floor(cssHeight * pixelRatio);
        // Make sure CSS stays 100%×100%
        this.canvas.style.width  = cssWidth  + "px";
        this.canvas.style.height = cssHeight + "px";
    
        // 3) Mirror for HUD canvas
        this.hudCanvas.width  = this.canvas.width;
        this.hudCanvas.height = this.canvas.height;
        this.hudCanvas.style.width  = cssWidth  + "px";
        this.hudCanvas.style.height = cssHeight + "px";
    
        // 4) Update WebGL viewport & projection
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.UpdateProjectionMatrix();
    }
        

    UpdateProjectionMatrix() {        
        var r = this.canvas.width / this.canvas.height;
        var n = (this.position.z - MAX_RENDER_DISTANCE);
        const min_n = 0.001;
        if (n < min_n) n = min_n;
        var f = (this.position.z + MAX_RENDER_DISTANCE);;
        var fov = Math.PI * 60 / 180;
        this.perspectiveMatrix = Matrix4.GetPerspective(fov, r, n, f).elements;
        
        // var s = 1 / Math.tan(fov / 2);
        // this.perspectiveMatrix = [
        //     s / r, 0, 0, 0,
        //     0, s, 0, 0,
        //     0, 0, (n + f) / (f - n), 1,
        //     0, 0, -2 * n * f / (f - n), 0
        // ];
    }

    // DEPRECATED - This is the main function that handled WebGL drawing
    GetModelViewProjection() 
    {
        return Matrix4.GetModelViewProjection(this.perspectiveMatrix, this.position.x, this.position.y, this.position.z, this.rotation.pitch, this.rotation.yaw);
    }

    // This is the correct method to get the camera's combined View-Projection matrix
    GetViewProjectionMatrix() {
        const viewMatrix = Matrix4.GetViewMatrix(this.position.x, this.position.y, this.position.z, this.rotation.pitch, this.rotation.yaw);
        
        const projection = new Matrix4(this.perspectiveMatrix);
        const viewProjectionResult = projection.multiply(viewMatrix);

        return viewProjectionResult.elements; // Return the underlying Float32Array for gl.uniformMatrix4fv
    }
}

///////////////////////////////////////////////////////////////////////////////////