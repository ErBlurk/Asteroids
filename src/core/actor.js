///////////////////////////////////////////////////////////////////////////////////
// Base object spawnable in the world, can have many components attached
///////////////////////////////////////////////////////////////////////////////////

import { ObjMesh } from "../utils/FileType/obj.js";
import { MeshComponent } from "./components/mesh_component.js";
import { GameObject } from "./gameobject.js";
import { Transform } from "../utils/Math/Transform.js";
import { ConvexCollisionComponent } from "./components/convex_collision_component.js";
import { Vector3 } from "../utils/Math/Vector3.js";

export class Actor extends GameObject
{
    constructor(gl, world, transform)
    {
        super();

        this.gl = gl;
        this.world = world;

        this.bTickEnable = true;
        this.bHidden = false;
        this.bDirty = false;
        this.bPendingDestroy = false;

        if (transform instanceof Transform)
        {
            this.transform = transform;
        } else
        {
            this.transform = new Transform();
        }

        this.mesh = new MeshComponent(gl);
        this.collision = null;
        this.lastCollisionDirection = new Vector3();

        this.components = [];
        this.components.push(this.mesh);
    }

    /*
     * Run once per frame
     */
    Tick(deltaTime)
    {
        // Leave blank
    }

    /*
     * Load shaders from text, compiles them
     */
    async InitShaders(Vertex, Fragment) 
    {
        const VS = await this.mesh.loadShaderSource(Vertex);
        const FS = await this.mesh.loadShaderSource(Fragment);

        // tell the mesh to recompile with GLSL
        this.mesh.setProgram(VS, FS);
    }

    /*
     * Enable/disable actor's main mesh texture
     */
    ShowTexture(param)
    {
        this.mesh.showTexture(param.checked);
    }

    /*
     * Swaps actor's main mesh orientation
     */
    SwapYZ(param)
    {
        this.mesh.swapYZ(param.checked);
    }

    /*
     * Load .obj meshes from file 
     */
    LoadObj(param)
    {
        return new Promise((resolve, reject) =>
        {
            if (typeof param === "string")
            {
                // param is a URL
                const objMesh = new ObjMesh();
                const xhr = new XMLHttpRequest();

                xhr.onreadystatechange = () =>
                {
                    if (xhr.readyState === 4 && xhr.status === 200)
                    {
                        objMesh.parse(xhr.responseText);
                        this.processLoadedMesh(objMesh);
                    }
                };

                xhr.open("GET", param, true);
                xhr.send();
            } 
            else if (param.files && param.files[0])
            {
                // param is a file input element
                const reader = new FileReader();

                reader.onload = (e) =>
                {
                    const objMesh = new ObjMesh();
                    objMesh.parse(e.target.result);
                    this.processLoadedMesh(objMesh);
                };

                reader.readAsText(param.files[0]);
            } else
            {
                console.warn("LoadObj: invalid parameter", param);
            }

            resolve();
        });
    }

    /*
     * Finish processing the newly loaded mesh
     * set the actor's main mesh
     * Init and sets a collision component
     */
    processLoadedMesh(objMesh)
    {
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

    /*
     * Compute and set the collision component based on the passed mesh
     */
    AddCollisionComponent()
    {
        this.collision = new ConvexCollisionComponent(this.mesh);
        this.components.push(this.collision);
    }

    /*
     * Load an image as an HTML IMG from an image file
     */
    async LoadImage(path)
    {
        if (!path) return null;

        try
        {
            // fetch the raw image file
            const res = await fetch(path);
            if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
            const blob = await res.blob();

            // blob -> dataURL
            const dataURL = await new Promise((resolve, reject) =>
            {
                const fr = new FileReader();
                fr.onerror = () => reject(fr.error);
                fr.onload = () => resolve(fr.result);
                fr.readAsDataURL(blob);
            });

            // decode that Data-URL in an <img>, and *return* it
            return await new Promise((resolve, reject) =>
            {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = (e) => reject(new Error("Image decode failed: " + e.message));
                img.src = dataURL;
            });

        } catch (err)
        {
            console.error("LoadImage error:", err);
            return null;
        }
    }

    /*
     * Load the DIFFUSE texture
     * Set the mesh DIFFUSE texture
     */
    async LoadTexture(path, flipUV = false)
    {
        const img = await this.LoadImage(path);
        if (!img) return;

        this.mesh.setTexture(img, flipUV);
    }

    /*
     * Load the EMISSIVE texture
     * Set the mesh EMISSIVE texture
     */
    async LoadEmissiveTexture(path, flipUV = false)
    {
        const img = await this.LoadImage(path);
        if (!img) return;

        this.mesh.setEmissiveTexture(img, flipUV);
    }


    /*
     * Draw all the attached components 
     * (Actually filter only collisions and meshes, might update in the future)
     */
    DrawComponents(viewMatrix, projectionMatrix)
    {
        for (let component of this.components)
        {
            if (component)
            {
                if (component instanceof MeshComponent || component instanceof ConvexCollisionComponent)
                { 
                    component.setPosition(this.transform.position);
                    component.setRotation(this.transform.rotation);
                }
                component.draw(viewMatrix, projectionMatrix);
            }
        }
    }

    /*
     * Mark this actor for despawning
     * Actually handled by world
     */
    Destroy()
    {
        this.bPendingDestroy = true;
    }

    /*
     * If the actor has a valid collision component, it's called on collision with another actor
     * Save the collision direction (as a normal vector)
     */
    onCollision(actor)
    {
        if (actor)
        {
            const dir = actor.transform.position.clone().subtractInPlace(this.transform.position).normalize();
            this.lastCollisionDirection = dir.multiplyScalar(-1);
        }

        // TODO
    }

    /*
     * Executed when world despawns this actor
     */
    onDestroy()
    {
        // TODO
    }
}