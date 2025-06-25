///////////////////////////////////////////////////////////////////////////////////
// Very basic particle system of meshes (namely Icospheres)
///////////////////////////////////////////////////////////////////////////////////

import { Transform } from "../../utils/Math/Transform.js";
import { Vector3 } from "../../utils/Math/Vector3.js";
import { ProceduralIcosphere } from "../../utils/ProceduralGeometry/icosphere.js";
import { MeshComponent } from "../components/mesh_component.js";

export class SmokeSystem
{
    constructor( gl, world, emitterPos = new Vector3( 0, 0, 0 ), options = {} )
    {
        this.gl         = gl;
        this.world      = world;
        this.emitterPos = emitterPos.clone();

        const { count = 100, minRadius = 1, maxRadius = 5, minLife = 1, maxLife = 3, minScaleFactor = 0.5, maxScaleFactor = 1.5, scale = Vector3.unitary, direction = null, coneAngleRadians = Math.PI / 6 } = options;

        this.count            = count;
        this.minRadius        = minRadius;
        this.maxRadius        = maxRadius;
        this.minLife          = minLife;
        this.maxLife          = maxLife;
        this.minScaleFactor   = minScaleFactor;
        this.maxScaleFactor   = maxScaleFactor;
        this.scale            = scale;
        this.direction        = direction;
        this.coneAngleRadians = coneAngleRadians;

        // Cache simple icosphere (one subdivisions) (use for each particle)
        this._sphereGeo = ProceduralIcosphere.buildIcosphere( 1, false );

        this.particles = [];

        this.lightDirection = this.world.directionalLight.direction;
        
        this.initParticles();
    }

    /*
     * Spawn the particles (icospheres)
     */
    initParticles()
    {
        for ( let i = 0; i < this.count; i++ )
        {
            this.spawnParticle();
        }
    }

    /*
     * Spawn an icosphere 
     * Set transform, scale, lifetime, and other parameters
     */
    spawnParticle()
    {
        const transform = new Transform();

        // Initial particle scale
        const startScale = randomRange(this.minScaleFactor, this.maxScaleFactor);

        // Initial position
        transform.position = this.emitterPos.clone();
        transform.scale = this.scale.multiplyScalar(startScale);

        // Speed and direction 
        const speed     = randomRange( this.minRadius, this.maxRadius );
        const dirVector = this.direction ? randomConeVector( this.direction, this.coneAngleRadians ) : randomDiskVector();

        // Velocity, growth (not working), and lifespan
        const velocity = dirVector.multiplyScalarInPlace( speed );
        const lifespan = randomRange( this.minLife, this.maxLife );
        const growth   = (this.maxScaleFactor - startScale) / lifespan;

        // Set the mesh (using the predefined icosphere vertexes)
        const mesh = new MeshComponent( this.gl );
        mesh.setMesh( this._sphereGeo.positions, this._sphereGeo.texCoords, this._sphereGeo.normals );
        mesh.setTransform( transform );
        mesh.setProgram(smokeVS, smokeFS);

        // set the light uniform and the random particle color
        this.gl.useProgram(mesh.prog);
        const colLoc    = this.gl.getUniformLocation(mesh.prog, "uGray");
        const lightLoc  = this.gl.getUniformLocation(mesh.prog, "uLightDirection");
        this.gl.uniform1f(colLoc, randomRange( 0.8, 0.9 ));
        this.gl.uniform3f(lightLoc, this.lightDirection.x, this.lightDirection.y, this.lightDirection.z);

        // Register the particle with some parameters
        this.particles.push({ transform, velocity, age: 0, lifespan, mesh, startScale, growth });
    }

    /*
     * Run once per frame
     * Dictate how the particle evolves in time
     */
    ParticlesTick( deltaTime )
    {
        for ( let i = this.particles.length - 1; i >= 0; i-- )
        {
            const p = this.particles[ i ];

            p.age += deltaTime;

            if ( p.age >= p.lifespan )
            {
                // If too old, remove from the registered particles, skip it next time
                this.particles.splice( i, 1 );
                continue;
            }

            const moveDelta = p.velocity.clone().multiplyScalar( deltaTime );

            p.transform.position.addInPlace( moveDelta );

            // Weird results when scaling - skip scaling, update translation and rotation
            // const newScale = p.startScale + p.growth * p.age; 
            // p.transform.scale = p.transform.scale.clone().multiplyScalar(newScale);
            p.mesh.setTransform( p.transform );
        }
    }

    /*
     * Draw the active particles meshes
     */
    ParticlesDraw( viewMatrix, projectionMatrix )
    {
        for ( let p of this.particles )
        {
            p.mesh.draw( viewMatrix, projectionMatrix );
        }
    }

    /**
     * Returns true once every particle has expired.
     */
    HasEnded()
    {
        return this.particles.length === 0;
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Randomizer helpers 
////////////////////////////////////////////////////////////////////////////////////////////////////

function randomRange( min, max )
{
    return min + Math.random() * ( max - min );
}

/*
 * For disk like explosion
 * Basically a supernova effect
 * It does not work as expected
 */ 
function randomDiskVector() {
    // Pick a random disk normal (tilt) on the unit sphere
    const normal = randomUnitVector();

    // Build orthonormal basis (u, v) for the disk plane
    const u = Math.abs(normal.y) < 0.99 ? new Vector3(0, 1, 0).cross(normal).normalize() : new Vector3(1, 0, 0).cross(normal).normalize();
    const v = normal.clone().cross(u).normalize();

    // Random angle in [0,2π)
    const theta = Math.random() * 2 * Math.PI;

    // MAGIC, it doesn't work
    return u.multiplyScalar(Math.cos(theta)).addInPlace(v.multiplyScalar(Math.sin(theta))).normalize();
}

/*
 * Return a random direction in a cone of angle angleCone, oriented in a preferred direction
 */
function randomConeVector( direction, coneAngle )
{
    const dir = direction.clone().normalize();

    // Sample a random angle within the cone
    const cosAngle = Math.cos( coneAngle );
    const z        = cosAngle + Math.random() * ( 1 - cosAngle );
    const sinAngle = Math.sqrt( 1 - z * z );
    const phi      = Math.random() * 2 * Math.PI;

    // Build orthonormal basis (dir, tangent, bitangent)
    const up      = Math.abs( dir.y ) < 0.99 ? new Vector3( 0, 1, 0 ) : new Vector3( 1, 0, 0 );
    const tangent = up.clone().cross( dir ).normalize();
    const bitan   = dir.clone().cross( tangent ).normalize();

    // Convert spherical coords (sinAngle, phi, z) into vector
    return dir.multiplyScalar(z).addInPlace(tangent.multiplyScalar(sinAngle * Math.cos(phi))).addInPlace(bitan.multiplyScalar(sinAngle * Math.sin(phi))).normalize();
}

/*
 * Create a random Vector3 and normalize it (built differently than Vector3.random())
 */
function randomUnitVector()
{
    const theta = Math.random() * 2 * Math.PI;
    const z     = Math.random() * 2 - 1;
    const r     = Math.sqrt( 1 - z * z );
    return new Vector3( r * Math.cos( theta ), r * Math.sin( theta ), z );
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Shaders for smoke
////////////////////////////////////////////////////////////////////////////////////////////////////

const smokeVS = `
precision mediump float;
attribute vec3 aPosition;
attribute vec3 aNormal;

uniform mat3 uNormalMatrix;
uniform mat4 uViewProjectionMatrix;
uniform mat4 uModelMatrix;
uniform bool uSwapYZ;

varying vec3 vNormal;

void main()
{
    vec3 pos    = aPosition;
    vNormal     = normalize(uNormalMatrix * aNormal);

    if (uSwapYZ)
        pos = vec3(pos.x, pos.z, pos.y);

    gl_Position = uViewProjectionMatrix * uModelMatrix * vec4(pos, 1.0);
}
`;

const smokeFS = `
precision mediump float;

uniform bool      uUseTexture; 
uniform sampler2D uTexture;    

uniform vec3  uLightDirection;
uniform float uGray;

varying vec3 vNormal;

void main()
{
    // compute diffuse & ambient lighting
    vec3  N         = normalize(vNormal);
    vec3  L         = normalize(uLightDirection);
    float diff      = max(dot(N, L), 0.0);
    float ambient   = 0.5;
    float intensity = ambient + diff * (1.0 - ambient);

    // apply the grey tint
    vec3 color = vec3(uGray * intensity);

    gl_FragColor = vec4(color, 1.0);
}
`;