import { ObjMesh } from "../utils/filetypes/obj.js";
import { MeshComponent } from "../objects/components/mesh_component.js";
import { GameObject } from "../objects/object.js";
import { Transform } from "../utils/Math/Transform.js";
import { BoxComponent } from "../objects/components/box_component.js";
import { World } from "./world.js";
import { Vector3 } from "../utils/Math/Vector3.js";

export class Actor extends GameObject {
    constructor(gl, world, transform) {
        super();

        this.gl = gl;
        this.world = world;
        this.transform = transform;
        if(this.transform == null)
        {
            this.transform = new Transform();
        }
        this.bTickEnable = false;
        this.bHidden = false;
        this.bDirty = false;

        this.mesh = new MeshComponent(gl);
        this.box = new BoxComponent(gl);

        this.components = [];
        this.components.push(this.mesh);
        this.components.push(this.box);
    }

    Tick(deltaTime)
    {
        // Leave blank
    }

    ShowTexture(param) {
        this.mesh.showTexture(param.checked);
    }

    SwapYZ(param) {
        this.mesh.swapYZ(param.checked);
    }

    LoadObj(param) {
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
        this.mesh.setTransform(this.transform);
        this.mesh.setMesh(buffers.positionBuffer, buffers.texCoordBuffer);

        let t = new Transform();
        t.setPosition(this.transform.position);
        t.setRotation(this.transform.rotation);

        let x = this.mesh.boundingBox?.max[0] - this.mesh.boundingBox?.min[0];
        let y = this.mesh.boundingBox?.max[1] - this.mesh.boundingBox?.min[1];
        let z = this.mesh.boundingBox?.max[2] - this.mesh.boundingBox?.min[2];
        t.setScale3(x, y, z);

        this.box.init(t);
    }


    LoadTexture(param) {
        if (param.files && param.files[0]) {
            var reader = new FileReader();
            reader.onload = function (e) {
                var img = document.getElementById('texture-img');
                img.onload = function () {
                    this.mesh.setTexture(img);
                }
                img.src = e.target.result;
            };
            reader.readAsDataURL(param.files[0]);
        }
    }

    DrawComponents(mvp)
    {
        for (let component of this.components) {
            if (this.bDirty && component instanceof MeshComponent)  { //  || component instanceof BoxComponent) {
                component.setPosition(this.transform.position);
                component.setRotation(this.transform.rotation);
            }
            component.draw( mvp );
        }
    }
}
