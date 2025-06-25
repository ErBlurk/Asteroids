////////////////////////////////////////////////////////////////////////////////////////////////////
// Raycasting - Amantide's and Woo
// https://github.com/cgyurgyik/fast-voxel-traversal-algorithm/blob/master/overview/FastVoxelTraversalOverview.md
////////////////////////////////////////////////////////////////////////////////////////////////////

export class RayCast
{
    constructor(world)
    {
        this.world = world;
        this.cellSize = world.grid.cellSize;
    }

    /**
     * Perform a grid-traversal raycast from origin to end.
     * 
     * Amanatide's algorithm
     */
    raycast(origin, end, ignoreActor = null)
    {
        const dir = end.clone().subtract(origin).normalize();
        const maxDist = end.clone().subtract(origin).length();

        // grid traversal setup (DDA)
        let cx = Math.floor(origin.x / this.cellSize);
        let cy = Math.floor(origin.y / this.cellSize);
        let cz = Math.floor(origin.z / this.cellSize);

        const stepX = dir.x > 0 ? 1 : dir.x < 0 ? -1 : 0;
        const stepY = dir.y > 0 ? 1 : dir.y < 0 ? -1 : 0;
        const stepZ = dir.z > 0 ? 1 : dir.z < 0 ? -1 : 0;

        const nextX = (cx + (stepX > 0 ? 1 : 0)) * this.cellSize;
        const nextY = (cy + (stepY > 0 ? 1 : 0)) * this.cellSize;
        const nextZ = (cz + (stepZ > 0 ? 1 : 0)) * this.cellSize;

        const tDeltaX = stepX !== 0 ? this.cellSize / Math.abs(dir.x) : Infinity;
        const tDeltaY = stepY !== 0 ? this.cellSize / Math.abs(dir.y) : Infinity;
        const tDeltaZ = stepZ !== 0 ? this.cellSize / Math.abs(dir.z) : Infinity;

        let tMaxX = stepX !== 0 ? (nextX - origin.x) / dir.x : Infinity;
        let tMaxY = stepY !== 0 ? (nextY - origin.y) / dir.y : Infinity;
        let tMaxZ = stepZ !== 0 ? (nextZ - origin.z) / dir.z : Infinity;

        let t = 0;
        let hit = null;

        while (t <= maxDist)
        {
            const key = `${cx},${cy},${cz}`;
            const bucket = this.world.grid.cells.get(key);
            if (bucket)
            {
                for (const col of bucket)
                {
                    // skip ignored actor’s sphere
                    if (ignoreActor && col === ignoreActor.collision) continue;

                    // sphere‐intersection
                    const center = col.transform.position;
                    const L = center.clone().subtract(origin);
                    const tca = L.dot(dir);
                    if (tca < 0) continue;

                    const d2 = L.lengthSq() - tca * tca;
                    if (d2 > col.radius * col.radius) continue;

                    // Check if distance is feasible
                    const thc = Math.sqrt(col.radius * col.radius - d2);
                    const t0 = tca - thc;
                    const tHit = (t0 >= 0 ? t0 : tca + thc);
                    if (tHit < 0 || tHit > maxDist) continue;

                    // Get the hit actor
                    const actor = this.world.actors.find(a => a.collision === col) || null;
                    if (actor === ignoreActor) continue;

                    // Set the hit parameters
                    if (!hit || tHit < hit.distance)
                    {
                        const point = origin.clone().add(dir.clone().multiplyScalar(tHit));
                        const normal = point.clone().subtract(center).normalize();
                        hit = { actor, point, normal, distance: tHit };
                    }
                }
                if (hit) break;
            }

            // advance DDA
            if (tMaxX < tMaxY)
            {
                if (tMaxX < tMaxZ)
                {
                    cx += stepX; t = tMaxX; tMaxX += tDeltaX;
                } 
                else
                {
                    cz += stepZ; t = tMaxZ; tMaxZ += tDeltaZ;
                }
            } else
            {
                if (tMaxY < tMaxZ)
                {
                    cy += stepY; t = tMaxY; tMaxY += tDeltaY;
                } 
                else
                {
                    cz += stepZ; t = tMaxZ; tMaxZ += tDeltaZ;
                }
            }
        }

        return hit;
    }
}
