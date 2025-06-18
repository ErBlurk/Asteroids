///////////////////////////////////////////////////////////////////////////////////
// Matrix4.js
//
// A simple 4×4 matrix class in column‐major format. Contains common construction
// (identity, translation, rotation, scale), multiplication, and helpers.
///////////////////////////////////////////////////////////////////////////////////

export class Matrix4 {
    constructor(elements = null) {
        // If `elements` is provided, assume it’s a length‐16 column‐major array.
        // Otherwise, initialize to identity.
        if (elements && elements.length === 16) {
            this.elements = new Float32Array(elements);
        } else {
            this.elements = new Float32Array(16);
            this.setIdentity();
        }
    }

    // Copy constructor
    clone() {
        return new Matrix4(this.elements);
    }

    // Sets this to identity matrix.
    setIdentity() {
        const e = this.elements;
        e[0] = 1; e[4] = 0; e[8]  = 0; e[12] = 0;
        e[1] = 0; e[5] = 1; e[9]  = 0; e[13] = 0;
        e[2] = 0; e[6] = 0; e[10] = 1; e[14] = 0;
        e[3] = 0; e[7] = 0; e[11] = 0; e[15] = 1;
        return this;
    }

    // Sets this to a translation matrix T(x,y,z).
    setTranslation(x, y, z) {
        this.setIdentity();
        this.elements[12] = x;
        this.elements[13] = y;
        this.elements[14] = z;
        return this;
    }

    // Sets this to a scaling matrix S(sx, sy, sz).
    setScale(sx, sy, sz) {
        const e = this.elements;
        e[0] = sx; e[4] = 0;  e[8]  = 0;  e[12] = 0;
        e[1] = 0;  e[5] = sy; e[9]  = 0;  e[13] = 0;
        e[2] = 0;  e[6] = 0;  e[10] = sz; e[14] = 0;
        e[3] = 0;  e[7] = 0;  e[11] = 0;  e[15] = 1;
        return this;
    }

    // Sets this to a rotation matrix from a Rotator (pitch, yaw, roll).
    setRotationFromRotator(rotator) {
        const R = rotator.toMatrix4().elements;
        this.elements.set(R);
        return this;
    }

    // Multiply this matrix in place by another: this = this * m
    multiply(m) {
        const result = Matrix4.multiplyArrays(this.elements, m.elements);
        this.elements.set(result);
        return this;
    }

    // Returns a new Matrix4 = A * B
    static multiplyArrays(A, B) {
        // A and B are length‐16 Float32Array (column‐major).
        const C = new Float32Array(16);
        for (let i = 0; i < 4; i++) {     // row
            for (let j = 0; j < 4; j++) { // column
                let sum = 0;
                for (let k = 0; k < 4; k++) {
                    // C[i + 4*j] = sum over k of A[i + 4*k] * B[k + 4*j]
                    sum += A[i + 4 * k] * B[k + 4 * j];
                }
                C[i + 4 * j] = sum;
            }
        }
        return C;
    }

    // Returns a new identity matrix
    static identity() {
        return new Matrix4().setIdentity();
    }

    // Creates a pure‐translation matrix
    static translation(x, y, z) {
        return new Matrix4().setTranslation(x, y, z);
    }

    // Creates a pure‐scale matrix
    static scale(sx, sy, sz) {
        return new Matrix4().setScale(sx, sy, sz);
    }

    // Creates a rotation matrix from a Rotator
    static rotationFromRotator(rotator) {
        return new Rotator(rotator.pitch, rotator.yaw, rotator.roll).toMatrix4();
    }

    // Computes and returns the inverse of this matrix (if invertible).
    // For brevity, we implement a general 4×4 inverse. If you only need
    // normal‐matrix (inverse‐transpose of upper‐left 3×3), see getNormalMatrix().
    invert() {
        const m = this.elements;
        const inv = new Float32Array(16);
        inv[0] =   m[5]  * m[10] * m[15] - 
                   m[5]  * m[11] * m[14] - 
                   m[9]  * m[6]  * m[15] + 
                   m[9]  * m[7]  * m[14] +
                   m[13] * m[6]  * m[11] - 
                   m[13] * m[7]  * m[10];
        inv[4] =  -m[4]  * m[10] * m[15] + 
                   m[4]  * m[11] * m[14] + 
                   m[8]  * m[6]  * m[15] - 
                   m[8]  * m[7]  * m[14] - 
                   m[12] * m[6]  * m[11] + 
                   m[12] * m[7]  * m[10];
        inv[8] =   m[4]  * m[9]  * m[15] - 
                   m[4]  * m[11] * m[13] - 
                   m[8]  * m[5]  * m[15] + 
                   m[8]  * m[7]  * m[13] + 
                   m[12] * m[5]  * m[11] - 
                   m[12] * m[7]  * m[9];
        inv[12] = -m[4]  * m[9]  * m[14] + 
                   m[4]  * m[10] * m[13] +
                   m[8]  * m[5]  * m[14] - 
                   m[8]  * m[6]  * m[13] - 
                   m[12] * m[5]  * m[10] + 
                   m[12] * m[6]  * m[9];
        inv[1] =  -m[1]  * m[10] * m[15] + 
                   m[1]  * m[11] * m[14] + 
                   m[9]  * m[2]  * m[15] - 
                   m[9]  * m[3]  * m[14] - 
                   m[13] * m[2]  * m[11] + 
                   m[13] * m[3]  * m[10];
        inv[5] =   m[0]  * m[10] * m[15] - 
                   m[0]  * m[11] * m[14] - 
                   m[8]  * m[2]  * m[15] + 
                   m[8]  * m[3]  * m[14] + 
                   m[12] * m[2]  * m[11] - 
                   m[12] * m[3]  * m[10];
        inv[9] =  -m[0]  * m[9]  * m[15] + 
                   m[0]  * m[11] * m[13] + 
                   m[8]  * m[1]  * m[15] - 
                   m[8]  * m[3]  * m[13] - 
                   m[12] * m[1]  * m[11] + 
                   m[12] * m[3]  * m[9];
        inv[13] =  m[0]  * m[9]  * m[14] - 
                   m[0]  * m[10] * m[13] - 
                   m[8]  * m[1]  * m[14] + 
                   m[8]  * m[2]  * m[13] + 
                   m[12] * m[1]  * m[10] - 
                   m[12] * m[2]  * m[9];
        inv[2] =   m[1]  * m[6]  * m[15] - 
                   m[1]  * m[7]  * m[14] - 
                   m[5]  * m[2]  * m[15] + 
                   m[5]  * m[3]  * m[14] + 
                   m[13] * m[2]  * m[7]  - 
                   m[13] * m[3]  * m[6];
        inv[6] =  -m[0]  * m[6]  * m[15] + 
                   m[0]  * m[7]  * m[14] + 
                   m[4]  * m[2]  * m[15] - 
                   m[4]  * m[3]  * m[14] - 
                   m[12] * m[2]  * m[7]  + 
                   m[12] * m[3]  * m[6];
        inv[10] =  m[0]  * m[5]  * m[15] - 
                   m[0]  * m[7]  * m[13] - 
                   m[4]  * m[1]  * m[15] + 
                   m[4]  * m[3]  * m[13] + 
                   m[12] * m[1]  * m[7]  - 
                   m[12] * m[3]  * m[5];
        inv[14] = -m[0]  * m[5]  * m[14] + 
                   m[0]  * m[6]  * m[13] + 
                   m[4]  * m[1]  * m[14] - 
                   m[4]  * m[2]  * m[13] - 
                   m[12] * m[1]  * m[6]  + 
                   m[12] * m[2]  * m[5];
        inv[3] =  -m[1]  * m[6]  * m[11] + 
                   m[1]  * m[7]  * m[10] + 
                   m[5]  * m[2]  * m[11] - 
                   m[5]  * m[3]  * m[10] - 
                   m[9]  * m[2]  * m[7]  + 
                   m[9]  * m[3]  * m[6];
        inv[7] =   m[0]  * m[6]  * m[11] - 
                   m[0]  * m[7]  * m[10] - 
                   m[4]  * m[2]  * m[11] + 
                   m[4]  * m[3]  * m[10] + 
                   m[8]  * m[2]  * m[7]  - 
                   m[8]  * m[3]  * m[6];
        inv[11] = -m[0]  * m[5]  * m[11] + 
                   m[0]  * m[7]  * m[9]  + 
                   m[4]  * m[1]  * m[11] - 
                   m[4]  * m[3]  * m[9]  - 
                   m[8]  * m[1]  * m[7]  + 
                   m[8]  * m[3]  * m[5];
        inv[15] =  m[0]  * m[5]  * m[10] - 
                   m[0]  * m[6]  * m[9]  - 
                   m[4]  * m[1]  * m[10] + 
                   m[4]  * m[2]  * m[9]  + 
                   m[8]  * m[1]  * m[6]  - 
                   m[8]  * m[2]  * m[5];

        let det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
        if (det === 0) {
            console.warn("Matrix4.invert(): determinant is zero, cannot invert.");
            return this.setIdentity();
        }

        det = 1.0 / det;
        for (let i = 0; i < 16; i++) {
            inv[i] *= det;
        }
        this.elements.set(inv);
        return this;
    }

    // Returns a new Matrix4 that is the inverse of this one.
    inverted() {
        return this.clone().invert();
    }

    // Computes the 3×3 “normal matrix” (inverse‐transpose of the upper‐left 3×3 of this 4×4).
    // Returns a Float32Array of length 9 in column-major order.
    getNormalMatrix() {
        // Extract upper‐left 3×3
        const m = this.elements;
        const a00 = m[0], a01 = m[4], a02 = m[8];
        const a10 = m[1], a11 = m[5], a12 = m[9];
        const a20 = m[2], a21 = m[6], a22 = m[10];

        // Compute determinant of 3×3
        const det =
            a00 * (a11 * a22 - a12 * a21) -
            a01 * (a10 * a22 - a12 * a20) +
            a02 * (a10 * a21 - a11 * a20);

        let invDet = det !== 0 ? 1.0 / det : 0;

        // Compute inverse of 3×3
        const b00 =   (a11 * a22 - a12 * a21) * invDet;
        const b01 = - (a01 * a22 - a02 * a21) * invDet;
        const b02 =   (a01 * a12 - a02 * a11) * invDet;
        const b10 = - (a10 * a22 - a12 * a20) * invDet;
        const b11 =   (a00 * a22 - a02 * a20) * invDet;
        const b12 = - (a00 * a12 - a02 * a10) * invDet;
        const b20 =   (a10 * a21 - a11 * a20) * invDet;
        const b21 = - (a00 * a21 - a01 * a20) * invDet;
        const b22 =   (a00 * a11 - a01 * a10) * invDet;

        // Transpose (to complete “inverse-transpose”)
        return new Float32Array([
            b00, b10, b20,
            b01, b11, b21,
            b02, b12, b22
        ]);
    }

    // Transpose this matrix in place
    transpose() {
        const m = this.elements;
        let tmp;

        tmp = m[1]; m[1] = m[4]; m[4] = tmp;
        tmp = m[2]; m[2] = m[8]; m[8] = tmp;
        tmp = m[3]; m[3] = m[12]; m[12] = tmp;
        tmp = m[6]; m[6] = m[9]; m[9] = tmp;
        tmp = m[7]; m[7] = m[13]; m[13] = tmp;
        tmp = m[11]; m[11] = m[14]; m[14] = tmp;

        return this;
    }

    // Multiplies two matrices and returns the result A*B.
    // The arguments A and B are arrays, representing column-major matrices.
    static MatrixMult( A, B )
    {
        var C = [];
        for ( var i=0; i<4; ++i ) {
            for ( var j=0; j<4; ++j ) {
                var v = 0;
                for ( var k=0; k<4; ++k ) {
                    v += A[j+4*k] * B[k+4*i];
                }
                C.push(v);
            }
        }
        return C;
    }

    static GetModelViewProjection( projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY )
    {
        // rotationX and rotationY are already in correct format, no need to convert to degrees or radians

        // Rotation around X axis
        var rotX = [
            1, 0, 							0, 						0,
            0, Math.cos(rotationX), 		Math.sin(rotationX),	0,
            0, Math.sin(rotationX) * -1, 	Math.cos(rotationX), 	0,
            0, 0, 							0, 						1
        ];

        // Rotation around Y axis
        var rotY = [
            Math.cos(rotationY), 	0, Math.sin(rotationY) * -1, 	0,
            0, 						1, 0, 							0,
            Math.sin(rotationY), 	0, Math.cos(rotationY), 		0,
            0, 						0, 0, 							1
        ];

        // Total rotation
        var rotXY = this.MatrixMult(rotX, rotY);

        // Transform position matrix
        var trans = [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            translationX, translationY, translationZ, 1
        ];

        // Calculate the resultin projected transform matrix, don't invert order
        var model = this.MatrixMult(rotXY, trans); // Model = Rotation * Translation
        var mvp = this.MatrixMult(projectionMatrix, model); // MVP = Projection * Model
        return mvp;
    }

    static GetViewMatrix(translationX, translationY, translationZ, rotationX, rotationY) {
        // Rotation around X axis
         var rotX = [
            1, 0, 							0, 						0,
            0, Math.cos(rotationX), 		Math.sin(rotationX),	0,
            0, Math.sin(rotationX) * -1, 	Math.cos(rotationX), 	0,
            0, 0, 							0, 						1
        ];

        // Rotation around Y axis
        var rotY = [
            Math.cos(rotationY), 	0, Math.sin(rotationY) * -1, 	0,
            0, 						1, 0, 							0,
            Math.sin(rotationY), 	0, Math.cos(rotationY), 		0,
            0, 						0, 0, 							1
        ];

        // Total rotation
        var rotXY = this.MatrixMult(rotX, rotY);

        // Transform position matrix
        var trans = [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            translationX, translationY, translationZ, 1
        ];

        // Calculate the resultin projected transform matrix, don't invert order
        var model = this.MatrixMult(rotXY, trans); // Model = Rotation * Translation
        return new Matrix4(model);
    }
    
    static GetPerspective(fovY_radians, aspect, near, far) {
        const s = 1 / Math.tan(fovY_radians / 2);
    
        // build the 4×4 array in column‑major order:
        // [  s/aspect,    0,         0,  0,
        //      0,         s,         0,  0,
        //      0,         0,   (n+f)/(f-n), 1,
        //      0,         0,  -2*n*f/(f-n), 0 ]
        const e = new Float32Array(16);
    
        // col 0
        e[0] = s / aspect; e[1] = 0; e[2] = 0; e[3] = 0;
        // col 1
        e[4] = 0; e[5] = s; e[6] = 0; e[7] = 0;
        // col 2
        e[8]  = 0;
        e[9]  = 0;
        e[10] = (near + far) / (far - near);
        e[11] = 1;
        // col 3
        e[12] = 0;
        e[13] = 0;
        e[14] = -2 * near * far / (far - near);
        e[15] = 0;
    
        return new Matrix4(e);
    }
    

    // Creates a look-at view matrix.
    // eye: [x, y, z] position of the camera
    // center: [x, y, z] point the camera is looking at
    // up: [x, y, z] up direction of the camera
    static lookAt(eye, center, up) {
        const x0 = eye[0], x1 = eye[1], x2 = eye[2];
        const y0 = center[0], y1 = center[1], y2 = center[2];
        const z0 = up[0], z1 = up[1], z2 = up[2];

        let fx = y0 - x0;
        let fy = y1 - x1;
        let fz = y2 - x2;

        let rlf = 1 / Math.sqrt(fx * fx + fy * fy + fz * fz);
        fx *= rlf;
        fy *= rlf;
        fz *= rlf;

        let sx = fy * z2 - fz * z1;
        let sy = fz * z0 - fx * z2;
        let sz = fx * z1 - fy * z0;

        let rls = 1 / Math.sqrt(sx * sx + sy * sy + sz * sz);
        sx *= rls;
        sy *= rls;
        sz *= rls;

        let ux = sy * fz - sz * fy;
        let uy = sz * fx - sx * fz;
        let uz = sx * fy - sy * fx;

        const e = new Float32Array(16);
        e[0] = sx; e[4] = ux; e[8] = fx; e[12] = 0;
        e[1] = sy; e[5] = uy; e[9] = fy; e[13] = 0;
        e[2] = sz; e[6] = uz; e[10] = fz; e[14] = 0;
        e[3] = 0; e[7] = 0; e[11] = 0; e[15] = 1;

        const viewMatrix = new Matrix4(e);
        viewMatrix.elements[12] = -(sx * x0 + sy * x1 + sz * x2);
        viewMatrix.elements[13] = -(ux * x0 + uy * x1 + uz * x2);
        viewMatrix.elements[14] = -(fx * x0 + fy * x1 + fz * x2);

        return viewMatrix;
    }
}
