export class SpatialGrid
{
    constructor(cellSize = 20)
    {
        this.cellSize = cellSize;
        this.cells = new Map();
    }

    clear()
    {
        this.cells.clear();
    }

    _key(x, y, z)
    {
        return `${x},${y},${z}`;
    }

    _coords(transform)
    {
        const p = transform.position;
        return [
            Math.floor(p.x / this.cellSize),
            Math.floor(p.y / this.cellSize),
            Math.floor(p.z / this.cellSize)
        ];
    }

    add(comp)
    {
        const [cx, cy, cz] = this._coords(comp.transform);
        const key = this._key(cx, cy, cz);
        let bucket = this.cells.get(key);
        if (!bucket)
        {
            bucket = new Set();
            this.cells.set(key, bucket);
        }
        bucket.add(comp);
    }

    queryNearby(comp)
    {
        const [cx, cy, cz] = this._coords(comp.transform);
        const neighbors = new Set();
        for (let dx = -1; dx <= 1; dx++)
        {
            for (let dy = -1; dy <= 1; dy++)
            {
                for (let dz = -1; dz <= 1; dz++)
                {
                    const key = this._key(cx + dx, cy + dy, cz + dz);
                    const bucket = this.cells.get(key);
                    if (bucket)
                    {
                        for (const c of bucket)
                        {
                            neighbors.add(c);
                        }
                    }
                }
            }
        }
        return Array.from(neighbors);
    }
}