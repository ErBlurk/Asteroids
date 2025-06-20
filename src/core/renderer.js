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

    DrawSkybox() {
        const gl = this.gl;
        const prog = this.skyboxProgram;
        gl.useProgram(prog);
    
        // Disable depth writes but keep testing
        gl.depthMask(false);
    
        // Compute inverse of viewProjection
        const invVP = Matrix4
            .Inverse(new Matrix4(this.GetViewProjectionMatrix()))
            .elements;
        gl.uniformMatrix4fv(this.skyboxMatrixLoc, false, invVP);
    
        // Render cube
        gl.bindBuffer(gl.ARRAY_BUFFER, this.skyboxBuffer);
        gl.enableVertexAttribArray(this.skyboxAttribLoc);
        gl.vertexAttribPointer(this.skyboxAttribLoc, 3, gl.FLOAT, false, 0, 0);
    
        gl.drawArrays(gl.TRIANGLES, 0, 36); // assuming 12 triangles
    
        gl.depthMask(true);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // HUD handling
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    drawHUD() {
        const hud = this.hudCanvas;
        const ctx = this.hudCtx;

        ctx.clearRect(0, 0, hud.width, hud.height);
        ctx.save();
        ctx.translate(0.5, 0.5);

        const cx = hud.width / 2;
        const cy = hud.height / 2;

        const r = Math.min(hud.width, hud.height) * 0.05;
        const sin60 = Math.sqrt(3) / 2;
        const pts = [
            { x: cx, y: cy - r },
            { x: cx - r * sin60, y: cy + r / 2 },
            { x: cx + r * sin60, y: cy + r / 2 }
        ];

        const gap = 12;
        ctx.strokeStyle = "#FFF";
        ctx.lineWidth = 1;

        ctx.beginPath();
        for (let p of pts) {
            const dx = cx - p.x;
            const dy = cy - p.y;
            const len = Math.hypot(dx, dy);
            const stopX = cx - (dx / len) * gap;
            const stopY = cy - (dy / len) * gap;

            ctx.moveTo(Math.round(p.x), Math.round(p.y));
            ctx.lineTo(Math.round(stopX), Math.round(stopY));
        }
        ctx.stroke();

        ctx.fillStyle = "#FFF";
        for (let p of pts) {
            ctx.beginPath();
            ctx.arc(Math.round(p.x), Math.round(p.y), 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // quarter circles (centered around crosshair)
        const qcRadius = Math.min(hud.width, hud.height) * 0.4;

        ctx.beginPath();
        // left quarter: from 135° to 225°
        ctx.arc(cx, cy, qcRadius, 3 * Math.PI / 4, 5 * Math.PI / 4);
        ctx.stroke();

        ctx.beginPath();
        // right quarter: from -45° to 45°
        ctx.arc(cx, cy, qcRadius, -Math.PI / 4, Math.PI / 4);
        ctx.stroke();

        ctx.restore();
    }
}

///////////////////////////////////////////////////////////////////////////////////