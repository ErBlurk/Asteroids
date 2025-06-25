///////////////////////////////////////////////////////////////////////////////////
// Vector3.js
//
// A simple 3D‐vector class with common operations.
// Includes static “zero” and “unitary” (1,1,1) as requested.
///////////////////////////////////////////////////////////////////////////////////

export class Vector3
{
    constructor(x = 0, y = 0, z = 0)
    {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    // Instance methods

    clone()
    {
        return new Vector3(this.x, this.y, this.z);
    }

    set(x, y, z)
    {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    copy(v)
    {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
    }

    add(v)
    {
        return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
    }

    addInPlace(v)
    {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }

    subtract(v)
    {
        return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
    }

    subtractInPlace(v)
    {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }

    multiplyScalar(s)
    {
        return new Vector3(this.x * s, this.y * s, this.z * s);
    }

    multiplyScalarInPlace(s)
    {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        return this;
    }

    dot(v)
    {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    cross(v)
    {
        return new Vector3(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x
        );
    }

    lengthSq()
    {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    length()
    {
        return Math.sqrt(this.lengthSq());
    }

    normalize()
    {
        const len = this.length();
        if (len > 0)
        {
            this.x /= len;
            this.y /= len;
            this.z /= len;
        }
        return this;
    }

    normalized()
    {
        const len = this.length();
        if (len > 0)
        {
            return new Vector3(this.x / len, this.y / len, this.z / len);
        }
        return new Vector3(0, 0, 0);
    }

    // Returns an array [x, y, z]
    toArray()
    {
        return [this.x, this.y, this.z];
    }

    // Static methods

    // Returns a new Vector3(0, 0, 0)
    static zero()
    {
        return new Vector3(0, 0, 0);
    }

    // Returns a new Vector3(1, 1, 1)
    static unitary()
    {
        return new Vector3(1, 1, 1);
    }

    static random()
    {
        return new Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
    }
}
