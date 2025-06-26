# Asteroids

A 3D WebGL‐based arcade game for the 2024/2025 Interactive Graphics course at La Sapienza.  
Written in plain JavaScript and raw WebGL, no frameworks.

---

## Features

- **OBJ model loading** (with optional YZ axis swap)  
- **Texture & emissive-map support**
- **Procedural asteroid meshes** via Perlin-noise subdivisions  
- **Flight controls** (WASD + QE + pointer-lock mouselook)  
- **Spring-arm orbital camera** with dynamic FOV zoom based on speed  
- **Centralized scene management** (`world.js`)  
- **Particle systems** (icosphere smoke with randomized scale & imposed direction)  
- **Raycasting & Amanatides–Woo grid traversal** (tractor-beam, drag-and-shoot)  
- **Sphere-based collision detection** backed by a spatial grid  
- **Skybox** with a smooth four-color gradient  
- **Basic HUD** (crosshair)  
- **Drag-and-shoot asteroids**   

---

## Under-the-hood extras

These are in the code already:

- **Automatic bounding-box generation** for all meshes (used for culling/collision)  
- **Device-pixel-ratio canvas resizing** for crisp output on high-DPI screens  
- **Per-particle random greyscale tint** & semi-transparent, lit smoke  
- **Runtime toggles** to swap axes, show normals or textures  
- **On-screen debug overlay** for live position/rotation readouts  

---

Enjoy exploring (and smashing) the asteroids! 🚀  
