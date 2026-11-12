/**
 * The Changing Landscape - Landscape & Environment
 * 
 * Renders the pastoral grassland, dynamic soil color transitions,
 * procedural wind-swayed grass tufts, ancient trodden dirt path,
 * water trough with animated ripples, and atmospheric dust/vignette.
 */

'use strict';

class Landscape {
  constructor() {
    this._initProceduralElements();
  }

  /**
   * Initializes deterministic procedural grass tufts and drifting dust particles.
   * @private
   */
  _initProceduralElements() {
    const prng = MathUtils.createLCG(CONFIG.ENVIRONMENT.RNG_SEED);
    const W = CONFIG.CANVAS.WIDTH;
    const H = CONFIG.CANVAS.HEIGHT;

    this.tufts = Array.from({ length: CONFIG.ENVIRONMENT.TUFT_COUNT }, () => ({
      x: prng() * W,
      y: prng() * H,
      height: 5 + prng() * 7,
      phase: prng() * 6
    }));

    this.dustParticles = Array.from({ length: CONFIG.ENVIRONMENT.DUST_COUNT }, () => ({
      x: prng() * W,
      y: prng() * H,
      radius: 1 + prng() * 2,
      speed: 10 + prng() * 30
    }));
  }

  /**
   * Renders the base pastoral ground and dynamic grass tufts.
   * Ground shifts from lush spring green to arid dry earth as development advances.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} developmentLevel
   * @param {number} roadProgress
   * @param {number} elapsedTime
   */
  renderGround(ctx, developmentLevel, roadProgress, elapsedTime) {
    const W = CONFIG.CANVAS.WIDTH;
    const H = CONFIG.CANVAS.HEIGHT;
    const devRatio = MathUtils.clamp(developmentLevel / 6, 0, 1);

    // Dynamic ground base color: lush green -> dusty dried soil
    const greenGround = [166, 182, 108];
    const dryGround = [168, 158, 120];
    ctx.fillStyle = MathUtils.mixRgb(greenGround, dryGround, devRatio);
    ctx.fillRect(0, 0, W, H);

    // Subtle sun/lighting ambient gradient
    const sunGrad = ctx.createLinearGradient(0, 0, 0, H);
    sunGrad.addColorStop(0, 'rgba(255, 240, 190, 0.12)');
    sunGrad.addColorStop(1, 'rgba(60, 70, 30, 0.12)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, W, H);

    // Procedural wind-swayed grass tufts
    const greenTuft = [120, 140, 70];
    const dryTuft = [130, 120, 86];
    const tuftColor = MathUtils.mixRgb(greenTuft, dryTuft, devRatio);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = tuftColor;
    ctx.globalAlpha = 1 - 0.55 * devRatio;

    const roadTop = CONFIG.WORLD.ROAD_Y - 6;
    const roadBottom = CONFIG.WORLD.ROAD_Y + CONFIG.WORLD.ROAD_HEIGHT + 6;

    for (const tuft of this.tufts) {
      // Once the road is paved, suppress tufts under asphalt
      if (roadProgress > 0 && tuft.y > roadTop && tuft.y < roadBottom) {
        continue;
      }

      // Wind oscillation sway
      const sway = Math.sin(elapsedTime * 1.4 + tuft.x * 0.02 + tuft.phase) * 2 * (1 - devRatio * 0.5);

      ctx.beginPath();
      // Left blade
      ctx.moveTo(tuft.x - 2, tuft.y);
      ctx.lineTo(tuft.x - 3 + sway, tuft.y - tuft.height);
      // Center blade
      ctx.moveTo(tuft.x, tuft.y);
      ctx.lineTo(tuft.x + sway, tuft.y - tuft.height - 2);
      // Right blade
      ctx.moveTo(tuft.x + 2, tuft.y);
      ctx.lineTo(tuft.x + 3 + sway, tuft.y - tuft.height + 1);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Renders the ancient shepherd trail worn into the prairie.
   * Visually displays the bisecting and severing of the trail when the highway emerges.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} [roadProgress=0]
   */
  renderTroddenPath(ctx, roadProgress = 0) {
    const start = CONFIG.WORLD.START_POSITION;
    const trough = CONFIG.WORLD.TROUGH;
    const H = CONFIG.CANVAS.HEIGHT;

    ctx.save();

    // Soft outer trodden soil
    ctx.strokeStyle = 'rgba(255, 243, 200, 0.2)';
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.quadraticCurveTo(480, H / 2 + 40, trough.x, trough.y + 20);
    ctx.stroke();

    // Compacted center groove
    ctx.strokeStyle = 'rgba(120, 100, 60, 0.12)';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Severed trail edges when highway emerges
    if (roadProgress > 0.1) {
      const roadTop = CONFIG.WORLD.ROAD_Y;
      const roadBottom = CONFIG.WORLD.ROAD_Y + CONFIG.WORLD.ROAD_HEIGHT;

      // Subtle severed trail dust mounds at the road shoulders
      ctx.fillStyle = `rgba(168, 140, 95, ${0.4 * roadProgress})`;

      // Southern severance (where path hits southern shoulder)
      ctx.beginPath();
      ctx.ellipse(395, roadBottom + 3, 16, 5, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // Northern severance (where path resumes on northern shoulder)
      ctx.beginPath();
      ctx.ellipse(565, roadTop - 3, 16, 5, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Renders the stone water trough destination with animated ripple waves.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} elapsedTime
   */
  renderWaterTrough(ctx, elapsedTime) {
    const tx = CONFIG.WORLD.TROUGH.x;
    const ty = CONFIG.WORLD.TROUGH.y;

    ctx.save();

    // Trough shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    MathUtils.drawRoundedRect(ctx, tx - 38, ty - 12, 84, 40, 10);
    ctx.fill();

    // Stone masonry rim
    ctx.fillStyle = '#8c8577';
    MathUtils.drawRoundedRect(ctx, tx - 42, ty - 20, 84, 40, 10);
    ctx.fill();

    // Water pool
    ctx.fillStyle = '#5d8fa6';
    MathUtils.drawRoundedRect(ctx, tx - 35, ty - 13, 70, 26, 7);
    ctx.fill();

    // Animated water surface ripple
    const ripplePhase = (elapsedTime % 2) / 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 1 - ripplePhase;

    ctx.beginPath();
    ctx.ellipse(tx, ty, 8 + ripplePhase * 18, 3 + ripplePhase * 5, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Renders the atmospheric haze, blowing dust storms, and cinematic vignette.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} developmentLevel
   * @param {number} elapsedTime
   */
  renderAtmosphere(ctx, developmentLevel, elapsedTime) {
    const W = CONFIG.CANVAS.WIDTH;
    const H = CONFIG.CANVAS.HEIGHT;

    // Atmospheric heat & dust haze in later stages
    const haze = MathUtils.clamp((developmentLevel - 3) / 3, 0, 1);
    if (haze > 0) {
      // Haze warm tint
      ctx.fillStyle = `rgba(196, 150, 100, ${0.2 * haze})`;
      ctx.fillRect(0, 0, W, H);

      // Drifting dust motes
      ctx.fillStyle = `rgba(235, 215, 180, ${0.35 * haze})`;
      for (const particle of this.dustParticles) {
        const px = (particle.x + elapsedTime * particle.speed) % W;
        const py = particle.y + Math.sin(elapsedTime + particle.x) * 6;

        ctx.beginPath();
        ctx.arc(px, py, particle.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Radial lens vignette
    const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(40, 30, 10, 0.28)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
  }
}

