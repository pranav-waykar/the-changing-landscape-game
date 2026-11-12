/**
 * The Changing Landscape - Math & Canvas Utilities
 * 
 * Vector arithmetic, easing curves, color interpolation, PRNG, and drawing helpers.
 */

'use strict';

const MathUtils = {
  /**
   * Constrain a value within minimum and maximum bounds.
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  },

  /**
   * Linear interpolation between two numbers.
   * @param {number} a
   * @param {number} b
   * @param {number} t (0.0 to 1.0)
   * @returns {number}
   */
  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  /**
   * Cubic ease-out curve for smooth deceleration.
   * @param {number} t (0.0 to 1.0)
   * @returns {number}
   */
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  },

  /**
   * Interpolate between two RGB color triplets [r, g, b].
   * @param {number[]} c1
   * @param {number[]} c2
   * @param {number} t
   * @returns {string} CSS rgb(...) string
   */
  mixRgb(c1, c2, t) {
    const r = Math.round(this.lerp(c1[0], c2[0], t));
    const g = Math.round(this.lerp(c1[1], c2[1], t));
    const b = Math.round(this.lerp(c1[2], c2[2], t));
    return `rgb(${r},${g},${b})`;
  },

  /**
   * Euclidean distance between two points.
   * @param {number} x1
   * @param {number} y1
   * @param {number} x2
   * @param {number} y2
   * @returns {number}
   */
  distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  },

  /**
   * Normalizes a 2D vector, avoiding division by zero.
   * @param {number} x
   * @param {number} y
   * @returns {{x: number, y: number, length: number}}
   */
  normalize(x, y) {
    const length = Math.hypot(x, y);
    if (length === 0) return { x: 0, y: 0, length: 0 };
    return { x: x / length, y: y / length, length };
  },

  /**
   * Creates a deterministic pseudorandom number generator using a Linear Congruential Generator (Lehmer PRNG).
   * @param {number} seed
   * @returns {() => number} Returns float in range [0, 1)
   */
  createLCG(seed = 7) {
    let currentSeed = seed;
    return function() {
      currentSeed = (currentSeed * 16807) % 2147483647;
      return currentSeed / 2147483647;
    };
  },

  /**
   * Draws a rounded rectangle path on the given canvas context.
   * Falls back to arc-based corners if ctx.roundRect is unavailable.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   * @param {number} radius
   */
  drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, width, height, radius);
    } else {
      const r = Math.min(radius, width / 2, height / 2);
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + width - r, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + r);
      ctx.lineTo(x + width, y + height - r);
      ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
      ctx.lineTo(x + r, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
  }
};

