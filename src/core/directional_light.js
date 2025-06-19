import { Vector3 } from "../utils/Math/Vector3.js";

export class DirectionalLight {
  /**
   * @param {Vector3} direction  world-space direction to the light
   */
  constructor(direction = new Vector3(1,1,1)) {
    this.direction = direction.clone().normalize();
  }

  setDirection(dir) {
    this.direction = dir.clone().normalize();
  }
}
