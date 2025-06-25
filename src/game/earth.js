import { Actor } from "../core/actor.js"

export class Earth extends Actor 
{
    constructor(gl, world, transform)
    {
        super(gl, world, transform);

        this.bTickEnable = true;

        this.InitMesh();

        this.transform.rotation.roll = 10 * Math.PI / 180; // 10° tilt
    }

    async InitMesh()
    {
        await this.LoadObj("../assets/objects/mercury.obj"); // Handles collision component 

        const VertShader = './src/shaders/mercury.vert';
        const FragShader = './src/shaders/mercury.frag';
        await this.InitShaders(VertShader, FragShader);

        await this.LoadTexture("../assets/textures/earth_diffuse.png", true);

        this.mesh.setTransform(this.transform);
    }

    Tick(deltaTime)
    {
        // Rotate 10 degrees per second
        this.transform.rotation.yaw += (30 * Math.PI / 180.0) * deltaTime; 
    }

    Destroy()
    {
        // DO NOTHING;
        // Make mercury indestructible
    }
}