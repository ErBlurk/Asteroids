///////////////////////////////////////////////////////////////////////////////////
// DirectionalLight.js
//
// A DirectionalLight represents a light source infinitely far away,
// with a consistent direction and color. It uses a Transform to define
// its orientation (direction).
//
///////////////////////////////////////////////////////////////////////////////////

import { Transform } from "./Transform";
import { Vector3 } from "./Vector3";

export class DirectionalLight 
{
    constructor() {
        // The transform defines the light's orientation.
        // The 'position' of the transform doesn't matter for a directional light,
        // only its rotation (which defines the direction).
        this.transform = new Transform();

        // Light color (RGB components)
        this.color = Vector3.unitary(); // Default to white light [1, 1, 1]

        // Light intensity
        this.intensity = 1.0; // Default to full intensity
    }

    setColor(r, g, b) 
    {
        this.color.set(r, g, b);
        return this;
    }

    setIntensity(intensity) 
    {
        this.intensity = intensity;
        return this;
    }

    setDirection(pitch, yaw, roll) 
    {
        this.transform.setRotation(pitch, yaw, roll);
        return this;
    }

    getDirection() 
    {
        // The directional light points along its local negative Z-axis.
        // We transform this local direction by the light's world matrix.
        // Since we only care about direction, translation and scale don't affect it.
        const lightLocalDirection = new Vector3(0, 0, -1); // Points along negative Z

        // Get the world matrix from the transform
        const worldMatrix = this.transform.getMatrix();

        // Transform the local direction into world space.
        // For directions, we only apply the rotation part of the matrix.
        // A common way to do this is to multiply by the 3x3 rotation sub-matrix
        // or by transforming with the full matrix and then normalizing,
        // ignoring the translation component.
        const worldDirection = worldMatrix.transformVector3(lightLocalDirection);

        // Normalize the result to ensure it's a unit vector.
        return worldDirection.normalize();
    }

    getEffectiveColor() 
    {
        return this.color.multiplyScalar(this.intensity);
    }

    getShaderUniforms() 
    {
        return {
            direction: this.getDirection().toArray(), // Assuming Vector3 has an .elements property [x, y, z]
            color: this.getEffectiveColor().toArray(), // Assuming Vector3 has an .elements property [r, g, b]
        };
    }
}