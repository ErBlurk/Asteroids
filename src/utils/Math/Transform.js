///////////////////////////////////////////////////////////////////////////////////
// Transform.js
//
// A Transform encapsulates position, rotation, scale, and automatically builds
// a 4×4 “matrix” (local‐to‐world) whenever you ask for it.
//
///////////////////////////////////////////////////////////////////////////////////

import { Vector3 } from "./Vector3.js";
import { Rotator } from "./Rotator.js";
import { Matrix4 } from "./Matrix4.js";

export class Transform {
    constructor() {
        // By default: no translation, no rotation, unit scale
        this.position = Vector3.zero();   // [0, 0, 0]
        this.rotation = Rotator.zero();   // [0, 0, 0]
        this.scale    = Vector3.unitary(); // [1, 1, 1]

        // Cached Matrix4
        this.matrix = new Matrix4();
        this._dirty = true;
    }

    // Mark “dirty” when any component changes
    setPosition3(x, y, z) {
        this.position.set(x, y, z);
        this._dirty = true;
        return this;
    }

    setRotation3(pitch, yaw, roll) {
        this.rotation.set(pitch, yaw, roll);
        this._dirty = true;
        return this;
    }

    setScale3(sx, sy, sz) {
        this.scale.set(sx, sy, sz);
        this._dirty = true;
        return this;
    }

    setPosition(position) {
        this.position.set(position.x, position.y, position.z);
        this._dirty = true;
        return this;
    }

    setRotation(rotation) {
        this.rotation.set(rotation.pitch, rotation.yaw, rotation.roll);
        this._dirty = true;
        return this;
    }

    setScale(scale) {
        this.scale.set(scale.x, scale.y, scale.z);
        this._dirty = true;
        return this;
    }

    // Call this if you've mutated position/rotation/scale directly
    markDirty() {
        this._dirty = true;
    }

    // Computes (or returns cached) local‐to‐world matrix: T * R * S
    getMatrix() {
        if (!this._dirty) {
            return this.matrix;
        }

        // 1) Build translation matrix
        const T = Matrix4.translation(
            this.position.x,
            this.position.y,
            this.position.z
        );

        // 2) Build rotation matrix from Euler angles
        const R = this.rotation.toMatrix4();

        // 3) Build scale matrix
        const S = Matrix4.scale(
            this.scale.x,
            this.scale.y,
            this.scale.z
        );

        // Combine: M = T * R * S
        // (Recall that with column‐major, M = T × (R × S).)
        const RS = Matrix4.multiplyArrays(R.elements, S.elements);
        const TRS = Matrix4.multiplyArrays(T.elements, RS);
        this.matrix.elements.set(TRS);

        this._dirty = false;
        return this.matrix;
    }

    static random(rangePos = 1.0, rangeRot = 1.0, rangeScale = 1.0)
    {
        let t = new Transform();

        // Position
        t.position.x = Math.random() * rangePos;
        t.position.y = Math.random() * rangePos;
        t.position.z = Math.random() * rangePos;

        // Orientation
        t.rotation.pitch = Math.random() * rangeRot;
        t.rotation.roll = Math.random() * rangeRot;
        t.rotation.yaw = Math.random() * rangeRot;

        // Scale
        t.scale.x = Math.random() * rangeScale;
        t.scale.y = Math.random() * rangeScale;
        t.scale.z = Math.random() * rangeScale;

        return t;
    }
}
