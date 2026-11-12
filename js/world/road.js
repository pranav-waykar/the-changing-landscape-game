/**
 * The Changing Landscape - Road System
 * 
 * Handles the gradual emergence and rendering of the highway,
 * including dirt shoulders, asphalt bed, aggregate fleck textures,
 * dashed centerline dividers, and solid boundary lines.
 */

'use strict';

class Road {
  /**
   * Calculates road construction progress based on development level.
   * Road begins construction at stage 2 (level 1.0) and finishes at 1.7.
   * @param {number} developmentLevel
   * @returns {number} Value in [0.0, 1.0]
   */
  static getProgress(developmentLevel) {
    const rawRatio = (developmentLevel - 1.0) / 0.7;
    return MathUtils.easeOutCubic(MathUtils.clamp(rawRatio, 0, 1));
  }

  /**
   * Renders the highway in its current construction stage.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} developmentLevel
   */
  render(ctx, developmentLevel) {
    const progress = Road.getProgress(developmentLevel);
    if (progress <= 0) return;

    const W = CONFIG.CANVAS.WIDTH;
    const roadY = CONFIG.WORLD.ROAD_Y;
    const fullHeight = CONFIG.WORLD.ROAD_HEIGHT;
    const centerY = CONFIG.WORLD.ROAD_CENTER_Y;

    // Height expands outwards from road centerline during paving
    const currentHeight = fullHeight * progress;
    const topY = centerY - currentHeight / 2;

    ctx.save();

    // 1. Earth/Gravel Shoulder Grading
    ctx.fillStyle = `rgba(196, 174, 130, ${0.9 * progress})`;
    ctx.fillRect(0, topY - 8 * progress, W, currentHeight + 16 * progress);

    // 2. Asphalt Road Bed
    ctx.fillStyle = '#3d3b3a';
    ctx.fillRect(0, topY, W, currentHeight);

    // 3. Subtle asphalt surface aggregate flecks
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let i = 0; i < 30; i++) {
      const speckX = (i * 97) % W;
      const speckY = topY + ((i * 37) % Math.max(1, currentHeight));
      ctx.fillRect(speckX, speckY, 40, 2);
    }

    // 4. Highway lane striping & edge lines (fade in once paving exceeds 60%)
    if (progress > 0.6) {
      const lineAlpha = (progress - 0.6) / 0.4;
      ctx.globalAlpha = lineAlpha;
      ctx.strokeStyle = '#e8dfc4';
      ctx.lineWidth = 2;

      // Dashed centerline divider
      ctx.setLineDash([26, 20]);
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(W, centerY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Solid outer shoulder boundary lines
      ctx.beginPath();
      ctx.moveTo(0, roadY + 5);
      ctx.lineTo(W, roadY + 5);
      ctx.moveTo(0, roadY + fullHeight - 5);
      ctx.lineTo(W, roadY + fullHeight - 5);
      ctx.stroke();
    }

    ctx.restore();
  }
}

