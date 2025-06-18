///////////////////////////////////////////////////////////////////////////////////
// Below is the core WebGL initialization code.
///////////////////////////////////////////////////////////////////////////////////
import { Matrix4 } from "../utils/Math/Matrix4.js";
import { Actor } from "../core/actor.js";
import { Vector3 } from "../utils/Math/Vector3.js";
import { Rotator } from "../utils/Math/Rotator.js";

const MAX_RENDER_DISTANCE = 100;

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
    UpdateCanvasSize() {
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
    }

    UpdateProjectionMatrix() {        
        var r = this.canvas.width / this.canvas.height;
        var n = (this.position.z - MAX_RENDER_DISTANCE);
        const min_n = 0.001;
        if (n < min_n) n = min_n;
        var f = (this.position.z + MAX_RENDER_DISTANCE);;
        var fov = 3.145 * 60 / 180;
        var s = 1 / Math.tan(fov / 2);
        this.perspectiveMatrix = [
            s / r, 0, 0, 0,
            0, s, 0, 0,
            0, 0, (n + f) / (f - n), 1,
            0, 0, -2 * n * f / (f - n), 0
        ];
    }

    // This is the main function that handled WebGL drawing
    GetModelViewProjection() 
    {
        return Matrix4.GetModelViewProjection(this.perspectiveMatrix, this.position.x, this.position.y, this.position.z, this.rotation.roll, this.rotation.pitch);
    }
}

///////////////////////////////////////////////////////////////////////////////////