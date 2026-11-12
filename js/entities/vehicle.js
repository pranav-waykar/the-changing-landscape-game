/**
 * The Changing Landscape - Vehicle Entity
 * 
 * Implements road vehicles (bike, car, truck, bus), distance-keeping / speed matching,
 * and top-down vector rendering with headlights and shadows.
 */

'use strict';

class Vehicle {
  /**
   * @param {Object} params
   * @param {number} params.lane 0 (westbound) or 1 (eastbound)
   * @param {number} params.direction -1 (west) or 1 (east)
   * @param {number} params.x Initial horizontal position
   * @param {number} params.y Vertical lane coordinate
   * @param {number} params.length Vehicle bounding length
   * @param {number} params.width Vehicle bounding width
   * @param {string} params.type 'bike' | 'car' | 'truck' | 'bus'
   * @param {string} params.color
   * @param {number} params.speed Initial speed (px/sec)
   */
  constructor({ lane, direction, x, y, length, width, type, color, speed }) {
    this.lane = lane;
    this.direction = direction;
    this.x = x;
    this.y = y;
    this.length = length;
    this.width = width;
    this.type = type;
    this.color = color;
    this.baseSpeed = speed;
    this.currentSpeed = speed;
  }

  /**
   * Updates vehicle position and adjusts speed to maintain safe following distance behind traffic ahead.
   * @param {number} dt Delta time in seconds
   * @param {Vehicle[]} vehiclesInSameLane Other vehicles sharing this lane
   */
  update(dt, vehiclesInSameLane) {
    this.currentSpeed = this.baseSpeed;

    // Check distance to any vehicle directly ahead in the same lane
    for (const other of vehiclesInSameLane) {
      if (other === this) continue;

      // Distance between vehicle fronts/rears in movement direction
      const frontDist = (other.x - this.x) * this.direction;
      const bumperGap = frontDist - (other.length + this.length) / 2;

      if (bumperGap > 0 && bumperGap < CONFIG.TRAFFIC.SAFE_FOLLOWING_GAP) {
        this.currentSpeed = Math.min(this.currentSpeed, other.currentSpeed);
      }
    }

    this.x += this.direction * this.currentSpeed * dt;
  }

  /**
   * Tests whether the vehicle has traveled beyond the visible boundaries plus despawn margins.
   * @param {number} canvasWidth
   * @returns {boolean}
   */
  isOutOfBounds(canvasWidth = CONFIG.CANVAS.WIDTH) {
    const margin = CONFIG.TRAFFIC.DESPAWN_X_OFFSET;
    return this.x < -margin || this.x > canvasWidth + margin;
  }

  /**
   * Renders the vehicle using clean vector shapes matching its specific vehicle class.
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.direction, 1);

    const length = this.length;
    const width = this.width;

    // Contact drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    MathUtils.drawRoundedRect(ctx, -length / 2 + 2, -width / 2 + 4, length, width, 5);
    ctx.fill();

    // Body rendering by vehicle type
    if (this.type === 'bike') {
      this._renderBike(ctx, length, width);
    } else if (this.type === 'truck') {
      this._renderTruck(ctx, length, width);
    } else if (this.type === 'bus') {
      this._renderBus(ctx, length, width);
    } else {
      this._renderCar(ctx, length, width);
    }

    // Glowing headlights
    ctx.fillStyle = 'rgba(255, 236, 170, 0.95)';
    ctx.fillRect(length / 2 - 2, -width / 2 + 2, 3, 3);
    ctx.fillRect(length / 2 - 2, width / 2 - 5, 3, 3);

    ctx.restore();
  }

  _renderBike(ctx, length, width) {
    ctx.fillStyle = this.color;
    MathUtils.drawRoundedRect(ctx, -length / 2, -3, length, 6, 3);
    ctx.fill();

    // Rider and helmet
    ctx.fillStyle = '#2b2b2b';
    ctx.beginPath();
    ctx.arc(-1, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e8dfc4';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  _renderTruck(ctx, length, width) {
    const cargoLength = length * 0.68;
    const cabLength = length * 0.3;

    // Cargo bed
    ctx.fillStyle = this.color;
    MathUtils.drawRoundedRect(ctx, -length / 2, -width / 2, cargoLength, width, 3);
    ctx.fill();

    // Bed recess
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.fillRect(-length / 2 + 6, -width / 2 + 4, cargoLength - 12, width - 8);

    // Cab
    ctx.fillStyle = '#c9a227';
    MathUtils.drawRoundedRect(ctx, length / 2 - cabLength, -width / 2 + 1, cabLength, width - 2, 4);
    ctx.fill();

    // Windshield
    ctx.fillStyle = '#1d2a33';
    ctx.fillRect(length / 2 - 9, -width / 2 + 4, 5, width - 8);
  }

  _renderBus(ctx, length, width) {
    // Bus chassis
    ctx.fillStyle = this.color;
    MathUtils.drawRoundedRect(ctx, -length / 2, -width / 2, length, width, 5);
    ctx.fill();

    // Passenger window row
    ctx.fillStyle = '#1d2a33';
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(-length / 2 + 8 + i * 13, -width / 2 + 4, 9, width - 8);
    }

    // Front windshield
    ctx.fillRect(length / 2 - 8, -width / 2 + 4, 5, width - 8);
  }

  _renderCar(ctx, length, width) {
    // Car chassis
    ctx.fillStyle = this.color;
    MathUtils.drawRoundedRect(ctx, -length / 2, -width / 2, length, width, 6);
    ctx.fill();

    // Windshield & windows
    ctx.fillStyle = '#1d2a33';
    MathUtils.drawRoundedRect(ctx, length * 0.08, -width / 2 + 3, length * 0.2, width - 6, 2);
    ctx.fill();

    MathUtils.drawRoundedRect(ctx, -length * 0.34, -width / 2 + 3, length * 0.14, width - 6, 2);
    ctx.fill();

    // Roof panel shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
    ctx.fillRect(-length * 0.2, -width / 2 + 3, length * 0.26, width - 6);
  }
}

