/**
 * The Changing Landscape - Input Manager
 * 
 * Handles unified keyboard, mouse, pointer capture, and touch inputs.
 * Normalizes input vectors for lead sheep navigation and manages accessibility hotkeys.
 */

'use strict';

class InputManager {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {HTMLElement} callButton
   * @param {Object} callbacks Event hooks for stage navigation and actions
   */
  constructor(canvas, callButton, callbacks = {}) {
    this.canvas = canvas;
    this.callButton = callButton;
    this.callbacks = callbacks;

    this.keys = Object.create(null);
    this.calling = false;
    this.hasUsedCall = false;
    this.activePointer = null;

    this._bindKeyboardEvents();
    this._bindPointerEvents();
    this._bindCallButtonEvents();
  }

  /**
   * Binds global keyboard listeners.
   * @private
   */
  _bindKeyboardEvents() {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();

      // Prevent window scrolling on navigation keys
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        e.preventDefault();
      }

      // Action triggers (retry / continue)
      if (key === 'enter' || key === 'r') {
        if (typeof this.callbacks.onActionKey === 'function') {
          this.callbacks.onActionKey(key);
        }
      }

      // Deliberation Pause / Freeze toggle (P key)
      if (key === 'p') {
        if (typeof this.callbacks.onTogglePause === 'function') {
          this.callbacks.onTogglePause();
        }
      }

      // Flock calling
      if (key === ' ') {
        this.calling = true;
        this.hasUsedCall = true;
      }

      // Stage jumping hotkeys (1-6)
      if (key >= '1' && key <= '6' && key.length === 1) {
        if (typeof this.callbacks.onStageJump === 'function') {
          this.callbacks.onStageJump(parseInt(key, 10));
        }
      } else if (e.key === 'PageDown') {
        if (typeof this.callbacks.onNextStage === 'function') {
          this.callbacks.onNextStage();
        }
      } else if (e.key === 'PageUp') {
        if (typeof this.callbacks.onPrevStage === 'function') {
          this.callbacks.onPrevStage();
        }
      } else if (key === 'm') {
        if (typeof this.callbacks.onToggleAuto === 'function') {
          this.callbacks.onToggleAuto();
        }
      } else if (key === 'h') {
        if (typeof this.callbacks.onToggleToolbar === 'function') {
          this.callbacks.onToggleToolbar();
        }
      }

      this.keys[key] = true;
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (key === ' ') {
        this.calling = false;
      }
      this.keys[key] = false;
    });
  }

  /**
   * Translates client pointer coordinates into canvas virtual coordinate space (960 x 540).
   * @private
   * @param {PointerEvent} e
   * @returns {{x: number, y: number}}
   */
  _getCanvasPointerPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = CONFIG.CANVAS.WIDTH / rect.width;
    const scaleY = CONFIG.CANVAS.HEIGHT / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  /**
   * Binds pointer events for touch & mouse dragging navigation.
   * @private
   */
  _bindPointerEvents() {
    this.canvas.addEventListener('pointerdown', (e) => {
      this.activePointer = this._getCanvasPointerPos(e);
      try {
        this.canvas.setPointerCapture(e.pointerId);
      } catch (err) {
        // Ignore if pointer capture fails
      }
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (this.activePointer) {
        this.activePointer = this._getCanvasPointerPos(e);
      }
    });

    const clearPointer = () => {
      this.activePointer = null;
    };

    this.canvas.addEventListener('pointerup', clearPointer);
    this.canvas.addEventListener('pointercancel', clearPointer);
  }

  /**
   * Binds pointer events for the dedicated on-screen Call button.
   * @private
   */
  _bindCallButtonEvents() {
    if (!this.callButton) return;

    const startCall = (e) => {
      e.preventDefault();
      this.calling = true;
      this.hasUsedCall = true;
    };

    const stopCall = (e) => {
      e.preventDefault();
      this.calling = false;
    };

    this.callButton.addEventListener('pointerdown', startCall);
    this.callButton.addEventListener('pointerup', stopCall);
    this.callButton.addEventListener('pointerleave', stopCall);
    this.callButton.addEventListener('pointercancel', stopCall);
  }

  /**
   * Calculates the normalized movement vector for the lead sheep based on
   * current keyboard inputs or pointer drag position.
   * @param {{x: number, y: number}} leadPosition
   * @returns {{x: number, y: number}}
   */
  getMovementVector(leadPosition) {
    let ax = 0;
    let ay = 0;

    // Keyboard navigation (WASD or Arrow keys)
    const right = this.keys['arrowright'] || this.keys['d'] ? 1 : 0;
    const left  = this.keys['arrowleft']  || this.keys['a'] ? 1 : 0;
    const down  = this.keys['arrowdown']  || this.keys['s'] ? 1 : 0;
    const up    = this.keys['arrowup']    || this.keys['w'] ? 1 : 0;

    ax = right - left;
    ay = down - up;

    // Pointer / touch drag navigation fallback if no keyboard input
    if (ax === 0 && ay === 0 && this.activePointer && leadPosition) {
      const dx = this.activePointer.x - leadPosition.x;
      const dy = this.activePointer.y - leadPosition.y;
      const dist = Math.hypot(dx, dy);

      // Deadzone threshold of 10 pixels to avoid jitter
      if (dist > 10) {
        ax = dx / dist;
        ay = dy / dist;
      }
    }

    // Normalize diagonal magnitude
    const magnitude = Math.hypot(ax, ay);
    if (magnitude > 1) {
      ax /= magnitude;
      ay /= magnitude;
    }

    return { x: ax, y: ay };
  }

  /**
   * Returns whether the shepherd is currently calling the flock.
   * @returns {boolean}
   */
  isCalling() {
    return this.calling;
  }

  /**
   * Resets the hasUsedCall flag (e.g. on new game restart).
   */
  resetCallUsage() {
    this.hasUsedCall = false;
  }
}

