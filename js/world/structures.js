/**
 * The Changing Landscape - Structure Manager
 * 
 * Manages roadside built structures: tea stalls, general stores/shops,
 * road signs (DHABA, HOTEL, PETROL, TEA), and brick houses.
 * Handles appearance animations, scaling transitions, collision bounds, and rendering.
 */

'use strict';

class StructureManager {
  constructor() {
    this.structures = CONFIG.STRUCTURES;
  }

  /**
   * Calculates construction/appearance progress of a specific structure.
   * Ramps up from 0 to 1 over a development delta of 0.22.
   * @param {Object} structure
   * @param {number} developmentLevel
   * @returns {number} Value in [0.0, 1.0]
   */
  getProgress(structure, developmentLevel) {
    const rawRatio = (developmentLevel - structure.appearLevel) / 0.22;
    return MathUtils.easeOutCubic(MathUtils.clamp(rawRatio, 0, 1));
  }

  /**
   * Renders all active structures based on the current world development level.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} developmentLevel
   */
  render(ctx, developmentLevel) {
    for (const structure of this.structures) {
      const progress = this.getProgress(structure, developmentLevel);
      if (progress <= 0) continue;

      this._renderStructure(ctx, structure, progress);
    }
  }

  /**
   * Renders an individual structure with zoom-in pop and alpha fade.
   * @private
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} s
   * @param {number} progress
   */
  _renderStructure(ctx, s, progress) {
    ctx.save();

    const totalHeight = s.type === 'sign' ? s.height + 14 : s.height;
    const centerX = s.x + s.width / 2;
    const centerY = s.y + totalHeight;

    // Scale pop-in animation from 70% to 100%
    const scale = 0.7 + 0.3 * progress;
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);
    ctx.globalAlpha = progress;

    // Contact drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    MathUtils.drawRoundedRect(ctx, s.x + 5, s.y + 6, s.width, totalHeight, 4);
    ctx.fill();

    // Specific structure architecture
    if (s.type === 'sign') {
      this._renderSign(ctx, s);
    } else if (s.type === 'house') {
      this._renderHouse(ctx, s);
    } else if (s.type === 'stall') {
      this._renderStall(ctx, s);
    } else {
      this._renderShop(ctx, s);
    }

    ctx.restore();
  }

  _renderSign(ctx, s) {
    // Support posts
    ctx.fillStyle = '#4a4338';
    ctx.fillRect(s.x + 8, s.y + s.height, 5, 14);
    ctx.fillRect(s.x + s.width - 13, s.y + s.height, 5, 14);

    // Signboard face
    ctx.fillStyle = s.color;
    MathUtils.drawRoundedRect(ctx, s.x, s.y, s.width, s.height, 3);
    ctx.fill();

    // Sign text
    ctx.fillStyle = '#f6efd8';
    ctx.font = '700 13px Mukta, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.text || '', s.x + s.width / 2, s.y + s.height / 2 + 1);
  }

  _renderHouse(ctx, s) {
    // Outer walls
    ctx.fillStyle = '#bdb7a8';
    MathUtils.drawRoundedRect(ctx, s.x, s.y, s.width, s.height, 3);
    ctx.fill();

    // Inset roof/facade
    ctx.fillStyle = '#d3cdbd';
    MathUtils.drawRoundedRect(ctx, s.x + 5, s.y + 5, s.width - 10, s.height - 10, 2);
    ctx.fill();

    // Circular window or courtyard feature
    ctx.fillStyle = '#2f5d8a';
    ctx.beginPath();
    ctx.arc(s.x + s.width - 24, s.y + 24, 13, 0, Math.PI * 2);
    ctx.fill();

    // Porch / entryway
    ctx.fillStyle = '#a8a291';
    ctx.fillRect(s.x + 14, s.y + s.height - 30, 34, 16);
  }

  _renderStall(ctx, s) {
    // Base counter
    ctx.fillStyle = '#6b4f33';
    ctx.fillRect(s.x + 4, s.y + s.height - 12, s.width - 8, 8);

    // Canopy awning
    ctx.fillStyle = s.color;
    MathUtils.drawRoundedRect(ctx, s.x, s.y, s.width, s.height - 10, 3);
    ctx.fill();

    // Striped canopy rib lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 3;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(s.x + i * s.width / 4, s.y + 2);
      ctx.lineTo(s.x + i * s.width / 4, s.y + s.height - 12);
      ctx.stroke();
    }
  }

  _renderShop(ctx, s) {
    // Storefront building shell
    ctx.fillStyle = '#d8c9a8';
    MathUtils.drawRoundedRect(ctx, s.x, s.y, s.width, s.height, 3);
    ctx.fill();

    // Awning / shutter facade
    ctx.fillStyle = s.color;
    MathUtils.drawRoundedRect(ctx, s.x + 4, s.y + 4, s.width - 8, s.height - 18, 2);
    ctx.fill();

    // Corrugated metal shutter texture
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      const lineX = s.x + 4 + i * (s.width - 8) / 6;
      ctx.beginPath();
      ctx.moveTo(lineX, s.y + 4);
      ctx.lineTo(lineX, s.y + s.height - 14);
      ctx.stroke();
    }

    // Display counter step
    ctx.fillStyle = '#d9a22b';
    ctx.fillRect(s.x + 4, s.y + s.height - 14, s.width - 8, 10);
  }
}

