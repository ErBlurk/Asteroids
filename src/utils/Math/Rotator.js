///////////////////////////////////////////////////////////////////////////////////
// Rotator.js
//
// A simple “Euler angles” holder (pitch, yaw, roll) in radians.
// Also provides static zero() and unitary() methods similarly.
///////////////////////////////////////////////////////////////////////////////////

import { Matrix4 } from "./Matrix4.js";

export class Rotator {
    constructor(pitch = 0, yaw = 0, roll = 0) {
        // We assume pitch = rotation around X, yaw = rotation around Y, roll = rotation around Z.
        this.pitch = pitch;
        this.yaw   = yaw;
        this.roll  = roll;
    }

    clone() {
        return new Rotator(this.pitch, this.yaw, this.roll);
    }

    set(pitch, yaw, roll) {
        this.pitch = pitch;
        this.yaw   = yaw;
        this.roll  = roll;
        return this;
    }

    copy(r) {
        this.pitch = r.pitch;
        this.yaw   = r.yaw;
        this.roll  = r.roll;
        return this;
    }

    // Rotates this Rotator by adding the given deltas (in radians).
    add(pitchDelta, yawDelta, rollDelta) {
        this.pitch += pitchDelta;
        this.yaw   += yawDelta;
        this.roll  += rollDelta;
        return this;
    }

    addInPlace(rotation) {
        this.pitch += rotation.pitch;
        this.yaw += rotation.yaw;
        this.roll += rotation.roll;
        return this;
    }

    // Converts these Euler angles into a 4×4 rotation matrix (Matrix4).
    // Matrix4 class is defined later; this method returns a new Matrix4.
    toMatrix4() {
        const cp = Math.cos(this.pitch),  sp = Math.sin(this.pitch);
        const cy = Math.cos(this.yaw),    sy = Math.sin(this.yaw);
        const cr = Math.cos(this.roll),   sr = Math.sin(this.roll);

        // We’ll build R = Rz(roll) * Ry(yaw) * Rx(pitch)
        // Note: Column‐major format, so each array index is column-first.

        // Rx (pitch)
        const Rx = [
            1,   0,  0, 0,
            0,  cp, sp, 0,
            0, -sp, cp, 0,
            0,   0,  0, 1
        ];

        // Ry (yaw)
        const Ry = [
            cy, 0, -sy, 0,
             0, 1,   0, 0,
            sy, 0,  cy, 0,
             0, 0,   0, 1
        ];

        // Rz (roll)
        const Rz = [
            cr, sr, 0, 0,
           -sr, cr, 0, 0,
             0,  0, 1, 0,
             0,  0, 0, 1
        ];

        // Multiply: Rz * Ry * Rx
        const Rzy = Matrix4.multiplyArrays(Rz, Ry); 
        const R    = Matrix4.multiplyArrays(Rzy, Rx);
        return new Matrix4(R);
    }

    // Static methods

    // Returns a new Rotator(0, 0, 0)
    static zero() {
        return new Rotator(0, 0, 0);
    }

    // Returns a new Rotator(1, 1, 1) (radians)
    static unitary() {
        return new Rotator(1, 1, 1);
    }
}
