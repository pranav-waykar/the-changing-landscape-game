/**
 * The Changing Landscape - Sheep Entity
 * 
 * Implements individual sheep dynamics, Reynolds-style flocking behavior
 * (separation, wander/cohesion, road avoidance), walking bob animations,
 * and vector-based rendering.
 */

'use strict';

class Sheep {
  /**
   * @param {number} index Index within the flock (0 is lead)
   * @param {number} x
   * @param {number} y
   */
  constructor(index, x, y) {
    this.index = index;
    this.isLead = index === 0;

    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = -Math.PI / 2; // Facing upward initially

    // Wander timer and angle for followers
    this.wanderTimer = 0;
    this.wanderAngle = Math.random() * Math.PI * 2;
  }

  /**
   * Updates lead sheep movement based on direct player input.
   * @param {{x: number, y: number}} inputVector Normalized input direction
   * @param {boolean} isCalling Whether calling slowed pace is active
   * @param {number} dt Delta time in seconds
   */
  updateLead(inputVector, isCalling, dt) {
    const targetSpeed = isCalling ? CONFIG.FLOCK.LEAD_CALL_SPEED : CONFIG.FLOCK.LEAD_SPEED;
    const targetVx = inputVector.x * targetSpeed;
    const targetVy = inputVector.y * targetSpeed;

    const lerpFactor = Math.min(1, CONFIG.FLOCK.LEAD_ACCELERATION * dt);
    this.vx += (targetVx - this.vx) * lerpFactor;
    this.vy += (targetVy - this.vy) * lerpFactor;
  }

  /**
   * Updates follower sheep steering forces:
   * 1. Wandering impulse
   * 2. Direct pull when called
   * 3. Cohesion toward leader if strayed
   * 4. Road aversion when highway is active
   * 5. Separation from other flock members
   * 
   * @param {Sheep} leader
   * @param {Sheep[]} flock
   * @param {boolean} isCalling
   * @param {number} trafficSkittishness [0, 1]
   * @param {number} developmentLevel
   * @param {number} dt
   */
  updateFollower(leader, flock, isCalling, trafficSkittishness, developmentLevel, dt) {
    // 1. Update wandering orientation timer
    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) {
      const jitter = (Math.random() - 0.5) * (1.6 + trafficSkittishness * 2.4);
      this.wanderAngle += jitter;
      this.wanderTimer = 0.6 + Math.random() * 1.2;
    }

    const dx = leader.x - this.x;
    const dy = leader.y - this.y;
    const distToLeader = Math.hypot(dx, dy) || 1;

    let steerX = 0;
    let steerY = 0;

    // 2. Shepherd Call or Active Leader Movement vs. Static Grazing
    // When the leader moves, follower sheep naturally gather and follow.
    // When the leader stops (static state), follower sheep wander and graze.
    const isLeaderMoving = Math.hypot(leader.vx, leader.vy) > 12;
    const shouldGatherAndFollow = isCalling || isLeaderMoving;

    if (shouldGatherAndFollow && distToLeader > CONFIG.FLOCK.CALL_MIN_DISTANCE) {
      steerX = (dx / distToLeader) * CONFIG.FLOCK.CALL_PULL_SPEED;
      steerY = (dy / distToLeader) * CONFIG.FLOCK.CALL_PULL_SPEED;
    } else {
      // Natural grazing and wandering when leader is stationary
      const wanderSpeed = CONFIG.FLOCK.BASE_WANDER_SPEED * (1 + trafficSkittishness * 0.5);
      steerX = Math.cos(this.wanderAngle) * wanderSpeed;
      steerY = Math.sin(this.wanderAngle) * wanderSpeed;

      // Cohesion toward leader if strayed too far
      if (distToLeader > CONFIG.FLOCK.COHESION_DISTANCE) {
        const excess = (distToLeader - CONFIG.FLOCK.COHESION_DISTANCE) / CONFIG.FLOCK.COHESION_RAMP_DISTANCE;
        const cohesionStrength = MathUtils.clamp(excess, 0, 1) * CONFIG.FLOCK.COHESION_FORCE_MAX;
        steerX += (dx / distToLeader) * cohesionStrength;
        steerY += (dy / distToLeader) * cohesionStrength;
      }

      // Highway fear: push away from road center if road has emerged
      if (developmentLevel >= CONFIG.TRAFFIC.MIN_DEVELOPMENT_LEVEL) {
        const roadDist = Math.abs(this.y - CONFIG.WORLD.ROAD_CENTER_Y);
        if (roadDist < CONFIG.FLOCK.HIGHWAY_FEAR_DISTANCE) {
          const pushDir = Math.sign(CONFIG.WORLD.ROAD_CENTER_Y - this.y);
          steerY += pushDir * CONFIG.FLOCK.HIGHWAY_FEAR_FORCE * trafficSkittishness;
        }
      }
    }

    // 3. Separation from peer sheep
    for (const other of flock) {
      if (other === this) continue;
      const ox = this.x - other.x;
      const oy = this.y - other.y;
      const dist = Math.hypot(ox, oy);

      if (dist > 0 && dist < CONFIG.FLOCK.SEPARATION_DISTANCE) {
        steerX += (ox / dist) * CONFIG.FLOCK.SEPARATION_FORCE;
        steerY += (oy / dist) * CONFIG.FLOCK.SEPARATION_FORCE;
      }
    }

    // Apply follower acceleration smoothing
    const lerpFactor = Math.min(1, CONFIG.FLOCK.FOLLOWER_ACCELERATION * dt);
    this.vx += (steerX - this.vx) * lerpFactor;
    this.vy += (steerY - this.vy) * lerpFactor;
  }

  /**
   * Integrates velocity, clamps to world boundaries, updates facing angle,
   * and resolves collisions against roadside structures.
   * @param {number} dt
   * @param {boolean} isArrived
   * @param {Array} structures
   * @param {(s: Object) => number} getStructureProgress
   */
  integratePhysics(dt, isArrived, structures, getStructureProgress) {
    if (isArrived) {
      this.vx *= 0.9;
      this.vy *= 0.9;
    }

    // Integrate position
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Clamp within canvas boundaries
    this.x = MathUtils.clamp(this.x, CONFIG.WORLD.BOUNDS.MIN_X, CONFIG.WORLD.BOUNDS.MAX_X);
    this.y = MathUtils.clamp(this.y, CONFIG.WORLD.BOUNDS.MIN_Y, CONFIG.WORLD.BOUNDS.MAX_Y);

    // Update facing angle based on current speed
    const currentSpeed = Math.hypot(this.vx, this.vy);
    if (currentSpeed > 8) {
      this.angle = Math.atan2(this.vy, this.vx);
    }

    // Obstacle pushout against built structures
    if (structures && getStructureProgress) {
      const collisionRadius = CONFIG.FLOCK.COLLISION_RADIUS_STRUCTURE;
      for (const structure of structures) {
        if (getStructureProgress(structure) < 0.6) continue;

        const totalHeight = structure.type === 'sign' ? structure.height + 14 : structure.height;
        const closestX = MathUtils.clamp(this.x, structure.x, structure.x + structure.width);
        const closestY = MathUtils.clamp(this.y, structure.y, structure.y + totalHeight);

        const diffX = this.x - closestX;
        const diffY = this.y - closestY;
        const dist = Math.hypot(diffX, diffY);

        if (dist < collisionRadius) {
          if (dist > 0) {
            this.x += (diffX / dist) * (collisionRadius - dist);
            this.y += (diffY / dist) * (collisionRadius - dist);
          } else {
            this.y -= collisionRadius;
          }
        }
      }
    }
  }

  /**
   * Renders the sheep with custom procedural wool tufts, ears, face, and collar.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} elapsedTime
   */
  render(ctx, elapsedTime) {
    const speed = Math.hypot(this.vx, this.vy);
    const walkBob = Math.sin(elapsedTime * 10 + this.index) * (speed > 10 ? 0.8 : 0);

    ctx.save();
    ctx.translate(this.x, this.y + walkBob);

    // Ground contact shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(1, 6, 11, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rotate into walking direction
    ctx.rotate(this.angle);

    // Fluffy wool body (composed of overlapping circular lobes)
    ctx.fillStyle = '#f4efe3';
    ctx.strokeStyle = 'rgba(120, 110, 90, 0.5)';
    ctx.lineWidth = 1;

    const woolLobes = [
      [-4, -4, 6],
      [-4,  4, 6],
      [ 2,  0, 7],
      [-7,  0, 6]
    ];

    for (const [lx, ly, lr] of woolLobes) {
      ctx.beginPath();
      ctx.arc(lx, ly, lr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Sheep head / face
    ctx.fillStyle = '#3b322b';
    ctx.beginPath();
    ctx.ellipse(10, 0, 5, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillRect(7, -6, 3, 2.4);
    ctx.fillRect(7, 3.6, 3, 2.4);

    // Collar / Harness (Orange for lead, Blue for followers)
    ctx.fillStyle = this.isLead ? '#e07a1f' : '#4a7fa8';
    ctx.beginPath();
    ctx.arc(-3, 0, this.isLead ? 3.6 : 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

