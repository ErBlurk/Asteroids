///////////////////////////////////////////////////////////////////////////////////
// object.js
// A generic “game object” that lives in the world and carries position + rotation.
// Acts as a base class for Actors, Pawns, Lights, etc.
///////////////////////////////////////////////////////////////////////////////////

import { Transform } from "../utils/Math/Transform.js";

export class GameObject
{
    constructor() 
    {
        this.transform = new Transform();
    }

    setPosition(x, y, z) 
    {
        this.transform.position.x = x;
        this.transform.position.y = y;
        this.transform.position.z = z;
    }

    setRotation(x, y, z) 
    {
        this.transform.rotation.x = x;
        this.transform.rotation.y = y;
        this.transform.rotation.z = z;
    }

    setScale(x, y, z)
    {
        this.transform.scale.x = x;
        this.transform.scale.y = y;
        this.transform.scale.z = z;
    }

    getWorldMatrix() 
    {
        return this.transform.getMatrix();
    }
}