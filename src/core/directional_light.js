import { Vector3 } from "../utils/Math/Vector3.js";

export class DirectionalLight 
{
  constructor(direction = new Vector3(1,1,1)) 
  {
    this.direction = direction.clone().normalize();
  }

  setDirection(dir) 
  {
    this.direction = dir.clone().normalize();
  }
}
