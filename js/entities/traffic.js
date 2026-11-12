/**
 * The Changing Landscape - Traffic Manager
 * 
 * Coordinates multi-lane vehicle spawning, speed scaling across stages,
 * headway distance regulation, and vehicle lifecycle.
 */

'use strict';

class TrafficManager {
  constructor() {
    /** @type {Vehicle[]} */
    this.vehicles = [];
    this.laneTimers = [1, 2];
  }

  /**
   * Clears all vehicles and resets lane spawn timers.
   */
  reset() {
    this.vehicles = [];
    this.laneTimers = [1, 2];
  }

  /**
   * Spawns a new vehicle in the designated lane if clearance permits.
   * @param {number} lane 0 (Westbound) or 1 (Eastbound)
   * @param {number} trafficIntensity [0, 1]
   */
  spawn(lane, trafficIntensity) {
    const direction = lane === 1 ? 1 : -1;
    const startX = direction > 0 ? -CONFIG.TRAFFIC.SPAWN_X_OFFSET : CONFIG.CANVAS.WIDTH + CONFIG.TRAFFIC.SPAWN_X_OFFSET;

    // Safety check: ensure incoming spawn point is not blocked by a nearby vehicle
    const hasNearbyVehicle = this.vehicles.some(v =>
      v.lane === lane && Math.abs(v.x - startX) < CONFIG.TRAFFIC.MIN_SPAWN_SPACING
    );

    if (hasNearbyVehicle) {
      this.laneTimers[lane] = CONFIG.TRAFFIC.SPAWN_RETRY_DELAY;
      return;
    }

    // Determine vehicle type based on weighted distribution
    const roll = Math.random();
    let type = 'car';
    if (roll < 0.30) {
      type = 'bike';
    } else if (roll < 0.70) {
      type = 'car';
    } else if (roll < 0.88) {
      type = 'truck';
    } else {
      type = 'bus';
    }

    const typeConfig = CONFIG.TRAFFIC.VEHICLE_TYPES[type];
    const palette = CONFIG.TRAFFIC.PALETTE;
    const color = palette[Math.floor(Math.random() * palette.length)];

    // Calculate speed scaled by stage traffic intensity
    const baseSpeed = MathUtils.lerp(
      CONFIG.TRAFFIC.SPEED_BASE_MIN,
      CONFIG.TRAFFIC.SPEED_BASE_MAX,
      trafficIntensity
    ) * (0.75 + Math.random() * 0.6) * typeConfig.speedFactor;

    this.vehicles.push(new Vehicle({
      lane,
      direction,
      x: startX,
      y: CONFIG.WORLD.LANES[lane],
      length: typeConfig.length,
      width: typeConfig.width,
      type,
      color,
      speed: baseSpeed
    }));

    // Schedule next vehicle spawn for this lane
    const baseInterval = MathUtils.lerp(
      CONFIG.TRAFFIC.SPAWN_INTERVAL_MAX,
      CONFIG.TRAFFIC.SPAWN_INTERVAL_MIN,
      trafficIntensity
    );
    this.laneTimers[lane] = baseInterval * (0.5 + Math.random() * 1.3);
  }

  /**
   * Updates traffic simulation, spawns vehicles, and removes off-screen instances.
   * @param {number} dt Delta time in seconds
   * @param {number} developmentLevel Current world development (0.0 - 6.0)
   */
  update(dt, developmentLevel) {
    // Traffic only emerges in stage 3 (developmentLevel >= 2.0)
    if (developmentLevel < CONFIG.TRAFFIC.MIN_DEVELOPMENT_LEVEL) {
      if (this.vehicles.length > 0) {
        this.vehicles.length = 0;
      }
      return;
    }

    const trafficIntensity = MathUtils.clamp(
      (developmentLevel - CONFIG.TRAFFIC.MIN_DEVELOPMENT_LEVEL) / 4,
      0,
      1
    );

    // Update spawn timers per lane
    for (let lane = 0; lane < 2; lane++) {
      this.laneTimers[lane] -= dt;
      if (this.laneTimers[lane] <= 0) {
        this.spawn(lane, trafficIntensity);
      }
    }

    // Update each vehicle's position and speed matching
    for (const vehicle of this.vehicles) {
      const sameLaneVehicles = this.vehicles.filter(v => v.lane === vehicle.lane);
      vehicle.update(dt, sameLaneVehicles);
    }

    // Filter out vehicles that have driven off-screen
    this.vehicles = this.vehicles.filter(v => !v.isOutOfBounds(CONFIG.CANVAS.WIDTH));
  }

  /**
   * Renders all active vehicles.
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    for (const vehicle of this.vehicles) {
      vehicle.render(ctx);
    }
  }
}

