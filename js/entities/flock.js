/**
 * The Changing Landscape - Flock Manager
 * 
 * Coordinates the collection of sheep (one leader and followers),
 * delegates input, resolves group collisions against vehicles, and checks arrival status.
 */

'use strict';

class Flock {
  constructor() {
    /** @type {Sheep[]} */
    this.members = [];
    this.reset();
  }

  /**
   * Resets all sheep positions back to the starting pasture.
   * @param {{x: number, y: number}} [startPos]
   */
  reset(startPos = CONFIG.WORLD.START_POSITION) {
    this.members = [];
    const count = CONFIG.FLOCK.COUNT;

    for (let i = 0; i < count; i++) {
      const offsetX = i === 0 ? 0 : (Math.random() - 0.5) * 70;
      const offsetY = i === 0 ? 0 : (Math.random() - 0.5) * 40;
      this.members.push(new Sheep(i, startPos.x + offsetX, startPos.y + offsetY));
    }
  }

  /**
   * Retrieves the leader sheep.
   * @returns {Sheep}
   */
  getLeader() {
    return this.members[0];
  }

  /**
   * Updates steering and physics for all members of the flock.
   * @param {{x: number, y: number}} inputVector
   * @param {boolean} isCalling
   * @param {number} trafficSkittishness
   * @param {number} developmentLevel
   * @param {Array} structures
   * @param {(s: Object) => number} getStructureProgress
   * @param {number} dt
   * @param {boolean} isArrived
   * @param {boolean} isPlayState
   */
  update(inputVector, isCalling, trafficSkittishness, developmentLevel, structures, getStructureProgress, dt, isArrived, isPlayState) {
    const leader = this.getLeader();

    if (isPlayState) {
      leader.updateLead(inputVector, isCalling, dt);

      for (let i = 1; i < this.members.length; i++) {
        this.members[i].updateFollower(
          leader,
          this.members,
          isCalling,
          trafficSkittishness,
          developmentLevel,
          dt
        );
      }
    }

    // Integrate physics and obstacles for all sheep
    for (const sheep of this.members) {
      sheep.integratePhysics(dt, isArrived, structures, getStructureProgress);
    }
  }

  /**
   * Tests for collisions between any sheep and passing vehicles.
   * @param {Vehicle[]} vehicles
   * @returns {{hit: boolean, position: {x: number, y: number}|null}}
   */
  checkVehicleCollisions(vehicles) {
    const collisionRadius = CONFIG.FLOCK.COLLISION_RADIUS_VEHICLE;

    for (const sheep of this.members) {
      for (const vehicle of vehicles) {
        // Find closest point on vehicle bounding rectangle to sheep circle center
        const halfLength = vehicle.length / 2;
        const halfWidth = vehicle.width / 2;

        const closestX = MathUtils.clamp(sheep.x, vehicle.x - halfLength, vehicle.x + halfLength);
        const closestY = MathUtils.clamp(sheep.y, vehicle.y - halfWidth, vehicle.y + halfWidth);

        const dist = Math.hypot(sheep.x - closestX, sheep.y - closestY);

        if (dist < collisionRadius) {
          return {
            hit: true,
            position: { x: sheep.x, y: sheep.y }
          };
        }
      }
    }

    return { hit: false, position: null };
  }

  /**
   * Checks if all sheep have successfully gathered within the water trough perimeter.
   * @param {number} troughX
   * @param {number} troughY
   * @param {number} troughRadius
   * @returns {boolean}
   */
  hasAllArrived(troughX, troughY, troughRadius) {
    return this.members.every(sheep => {
      const dist = Math.hypot(sheep.x - troughX, sheep.y - troughY);
      return dist <= troughRadius;
    });
  }

  /**
   * Renders the flock.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} elapsedTime
   */
  render(ctx, elapsedTime) {
    for (const sheep of this.members) {
      sheep.render(ctx, elapsedTime);
    }
  }
}

