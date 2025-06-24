import { ObjMesh } from "../utils/filetypes/obj.js";
import { MeshComponent } from "./components/mesh_component.js";
import { GameObject } from "./gameobject.js";
import { Transform } from "../utils/Math/Transform.js";
import { ConvexCollisionComponent } from "./components/convex_collision_component.js";


export class Actor extends GameObject {
    constructor(gl, world, transform) {
        super();

        this.gl = gl;
        this.world = world;
    
        this.bTickEnable = true;
        this.bHidden = false;
        this.bDirty = false;
        this.bPendingDestroy = false;

        if (transform instanceof Transform) {
            this.transform = transform;
        } else {
            this.transform = new Transform();
        }

        this.mesh = new MeshComponent(gl);
        this.collision = null;

        this.components = [];
        this.components.push(this.mesh);
    }

    OnCollisionTrigger(actor)
    {
        console.log("Colliding");
    }

    Tick(deltaTime)
    {
        // Leave blank

        // this.transform.position.addInPlace(new Vector3(0.01, 0, 0));
    }

    async InitShaders(Vertex, Fragment) 
    {
        const VS = await this.mesh.loadShaderSource(Vertex);
        const FS = await this.mesh.loadShaderSource(Fragment);

        // tell the mesh to recompile with GLSL
        this.mesh.setProgram(VS, FS);
    }

    ShowTexture(param) {
        this.mesh.showTexture(param.checked);
    }

    SwapYZ(param) {
        this.mesh.swapYZ(param.checked);
    }

    LoadObj(param) {
        return new Promise((resolve, reject) => {
            if (typeof param === "string") {
                // param is a URL
                const objMesh = new ObjMesh();
                const xhr = new XMLHttpRequest();

                xhr.onreadystatechange = () => {
                    if (xhr.readyState === 4 && xhr.status === 200) {
                        objMesh.parse(xhr.responseText);
                        this.processLoadedMesh(objMesh);
                    }
                };

                xhr.open("GET", param, true);
                xhr.send();
            } else if (param.files && param.files[0]) {
                // param is a file input element
                const reader = new FileReader();

                reader.onload = (e) => {
                    const objMesh = new ObjMesh();
                    objMesh.parse(e.target.result);
                    this.processLoadedMesh(objMesh);
                };

                reader.readAsText(param.files[0]);
            } else {
                console.warn("LoadObj: invalid parameter", param);
            }

            resolve();
        });
    }
    
    processLoadedMesh(objMesh) {
        const box = objMesh.getBoundingBox();
        const shift = [
            -(box.min[0] + box.max[0]) / 2,
            -(box.min[1] + box.max[1]) / 2,
            -(box.min[2] + box.max[2]) / 2
        ];
        const size = [
            (box.max[0] - box.min[0]) / 2,
            (box.max[1] - box.min[1]) / 2,
            (box.max[2] - box.min[2]) / 2
        ];
        const maxSize = Math.max(size[0], size[1], size[2]);
        const scale = 1 / maxSize;

        objMesh.shiftAndScale(shift, scale);

        const buffers = objMesh.getVertexBuffers();
        this.mesh.setMesh(buffers.positionBuffer, buffers.texCoordBuffer, buffers.normalBuffer);

        // once mesh is ready, create and register collision component:
        this.AddCollisionComponent();
    }

    AddCollisionComponent()
    {
        this.collision = new ConvexCollisionComponent(this.mesh);
        this.components.push(this.collision);
    }

    async LoadImage(path) {
        if (!path) return null;

        try {
            // fetch the raw image file
            const res = await fetch(path);
            if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
            const blob = await res.blob();

            // blob -> dataURL
            const dataURL = await new Promise((resolve, reject) => {
                const fr = new FileReader();
                fr.onerror = () => reject(fr.error);
                fr.onload = () => resolve(fr.result);
                fr.readAsDataURL(blob);
            });

            // decode that Data-URL in an <img>, and *return* it
            return await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = (e) => reject(new Error("Image decode failed: " + e.message));
                img.src = dataURL;
            });

        } catch (err) {
            console.error("LoadImage error:", err);
            return null;
        }
    }

    async LoadTexture(path, flipUV = false) {
        const img = await this.LoadImage(path);
        if (!img) return;

        this.mesh.setTexture(img, flipUV);
    }

    async LoadEmissionMap(path, flipUV = false) {
        const img = await this.LoadImage(path);
        if (!img) return;
        
        //this.mesh.setEmissionMap(img, flipUV);
    }


    DrawComponents(viewMatrix, projectionMatrix)
    {
        for (let component of this.components) {
            if(component)
            {
                if (component instanceof MeshComponent || component instanceof ConvexCollisionComponent)  { //  || component instanceof BoxComponent) {
                    component.setPosition(this.transform.position);
                    component.setRotation(this.transform.rotation);
                }
                component.draw( viewMatrix, projectionMatrix );
            }
        }
    }

    Destroy()
    {
        this.bPendingDestroy = true;
    }

    onCollision(actor)
    {
        //this.Destroy();
        //console.log("Collided");
    }
}