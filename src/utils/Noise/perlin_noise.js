/**
 * PerlinNoise: smooth, seeded Perlin noise with optional fractal smoothing (fBM).
 * Usage:
 *   const noise = new PerlinNoise(seed);
 *   let n = noise.noise3D(x, y, z);
 *   let fbm = noise.fbm3D(x, y, z, octaves, lacunarity, gain);
 */

export class PerlinNoise
{
    constructor(seed = 0)
    {
        this.perm = new Uint8Array(512);
        this._buildPermutation(seed);
    }

    // Build a permutation table by shuffling [0..255] with a simple PRNG
    _buildPermutation(seed)
    {
        // xorshift32
        let x = seed || 1;
        function rand()
        {
            x ^= x << 13;
            x ^= x >>> 17;
            x ^= x << 5;
            return (x >>> 0) / 0xFFFFFFFF;
        }
        const p = new Uint8Array(256);
        for (let i = 0; i < 256; i++) p[i] = i;
        for (let i = 255; i > 0; i--)
        {
            const j = Math.floor(rand() * (i + 1));
            [p[i], p[j]] = [p[j], p[i]];
        }
        // duplicate
        for (let i = 0; i < 512; i++)
        {
            this.perm[i] = p[i & 255];
        }
    }

    // Quintic fade for smooth interpolation
    static fade(t)
    {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    static lerp(a, b, t)
    {
        return a + t * (b - a);
    }

    static grad(hash, x, y, z)
    {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
        return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
    }

    /**
     * Basic 3D Perlin noise, smooth and continuous in [-1,1].
     */
    noise3D(x, y, z)
    {
        const p = this.perm;
        const xi = Math.floor(x) & 255,
            yi = Math.floor(y) & 255,
            zi = Math.floor(z) & 255;
        const xf = x - Math.floor(x),
            yf = y - Math.floor(y),
            zf = z - Math.floor(z);
        const u = PerlinNoise.fade(xf),
            v = PerlinNoise.fade(yf),
            w = PerlinNoise.fade(zf);

        const aaa = p[p[p[xi] + yi] + zi];
        const aba = p[p[p[xi] + yi + 1] + zi];
        const aab = p[p[p[xi] + yi] + zi + 1];
        const abb = p[p[p[xi] + yi + 1] + zi + 1];
        const baa = p[p[p[xi + 1] + yi] + zi];
        const bba = p[p[p[xi + 1] + yi + 1] + zi];
        const bab = p[p[p[xi + 1] + yi] + zi + 1];
        const bbb = p[p[p[xi + 1] + yi + 1] + zi + 1];

        const x1 = PerlinNoise.lerp(
            PerlinNoise.grad(aaa, xf, yf, zf),
            PerlinNoise.grad(baa, xf - 1, yf, zf),
            u
        );
        const x2 = PerlinNoise.lerp(
            PerlinNoise.grad(aba, xf, yf - 1, zf),
            PerlinNoise.grad(bba, xf - 1, yf - 1, zf),
            u
        );
        const y1 = PerlinNoise.lerp(x1, x2, v);

        const x3 = PerlinNoise.lerp(
            PerlinNoise.grad(aab, xf, yf, zf - 1),
            PerlinNoise.grad(bab, xf - 1, yf, zf - 1),
            u
        );
        const x4 = PerlinNoise.lerp(
            PerlinNoise.grad(abb, xf, yf - 1, zf - 1),
            PerlinNoise.grad(bbb, xf - 1, yf - 1, zf - 1),
            u
        );
        const y2 = PerlinNoise.lerp(x3, x4, v);

        return PerlinNoise.lerp(y1, y2, w);
    }

    fbm3D(x, y, z, octaves = 4, lacunarity = 2.0, persistence = 0.5)
    {
        let sum = 0;
        let amp = 1;
        let freq = 1;
        let maxAmp = 0;

        for (let i = 0; i < octaves; i++)
        {
            sum += amp * this.noise3D(x * freq, y * freq, z * freq);
            maxAmp += amp;

            freq *= lacunarity;
            amp *= persistence;
        }

        // Now sum/maxAmp is guaranteed in [-1..1]
        return sum / maxAmp;
    }

}
