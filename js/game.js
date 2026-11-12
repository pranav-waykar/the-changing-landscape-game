/**
 * The Changing Landscape - Game Engine
 * 
 * Orchestrates the game lifecycle, state machine transitions,
 * simulation ticks, physics collision resolution, and rendering pipeline.
 */

'use strict';

/**
 * Enumeration of game states.
 * @enum {string}
 */
const GameState = Object.freeze({
  INTRO: 'intro',
  PLAYING: 'play',
  SHEEP_HIT: 'hit',
  ARRIVED: 'arrive',
  GAME_OVER: 'end'
});

class Game {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {HTMLElement} overlayElement
   * @param {HTMLElement} callButton
   * @param {HTMLElement} presentationBarElement
   */
  constructor(canvas, overlayElement, callButton, presentationBarElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Simulation & Stage State
    this.state = GameState.INTRO;
    this.developmentLevel = 0.0;
    this.targetDevelopmentLevel = 0.0;
    this.isAutoMode = true;

    // Timers & Metrics
    this.elapsedTime = 0.0;
    this.playTime = 0.0;
    this.currentTripTime = 0.0;
    this.hitTimer = 0.0;
    this.arriveTimer = 0.0;
    this.lastHitPosition = null;

    this.stageFlashTimer = 0.0;
    this.lastStageIndex = 0;

    // Player statistics
    this.tripTimes = [];
    this.totalHits = 0;

    // Subsystems
    this.landscape = new Landscape();
    this.road = new Road();
    this.structures = new StructureManager();
    this.flock = new Flock();
    this.traffic = new TrafficManager();

    // UI & Input Managers
    this._initUI(overlayElement, presentationBarElement);
    this._initInput(callButton);

    // Initial setup
    this.flock.reset(CONFIG.WORLD.START_POSITION);
    this.ui.showIntroCard();
    this.ui.syncPresentationBar(this.getCurrentStageNumber(), this.isAutoMode);

    // Sync presentation toolbar periodically
    this.syncIntervalId = setInterval(() => {
      this.ui.syncPresentationBar(this.getCurrentStageNumber(), this.isAutoMode);
    }, 300);
  }

  /**
   * Initializes the UI Manager and registers action delegates.
   * @private
   */
  _initUI(overlayElement, presentationBarElement) {
    this.ui = new UIManager(overlayElement, presentationBarElement, {
      begin: () => this.startNewGame(),
      retry: () => this.retryAfterHit(),
      again: () => this.resetEntireGame(),
      onPrevStage: () => this.jumpToStage(this.getCurrentStageNumber() - 1),
      onNextStage: () => this.jumpToStage(this.getCurrentStageNumber() + 1),
      onJumpStage: (stageNum) => this.jumpToStage(stageNum),
      onToggleAuto: () => this.toggleAutoMode()
    });
  }

  /**
   * Initializes input handling with keyboard and pointer events.
   * @private
   */
  _initInput(callButton) {
    this.input = new InputManager(this.canvas, callButton, {
      onActionKey: (key) => {
        // Pressing Enter or R triggers the visible modal action (e.g. retry after hit)
        if (!this.ui.overlay.hidden) {
          const actionBtn = this.ui.overlay.querySelector('button[data-action]');
          if (actionBtn) actionBtn.click();
        }
      },
      onStageJump: (stageNum) => this.jumpToStage(stageNum),
      onNextStage: () => this.jumpToStage(this.getCurrentStageNumber() + 1),
      onPrevStage: () => this.jumpToStage(this.getCurrentStageNumber() - 1),
      onToggleAuto: () => this.toggleAutoMode(),
      onToggleToolbar: () => this.ui.toggleToolbarVisibility()
    });
  }

  /**
   * Returns current active stage index (1 to 6).
   * @returns {number}
   */
  getCurrentStageNumber() {
    const level = this.isAutoMode ? this.developmentLevel : this.targetDevelopmentLevel;
    return Math.min(CONFIG.STAGES.MAX_STAGE, Math.floor(level) + 1);
  }

  /**
   * Transitions game to playing state from the intro screen.
   */
  startNewGame() {
    this.ui.hideCard();
    if (this.isAutoMode) {
      this.resetAllMetrics();
    } else {
      this.tripTimes = [];
      this.totalHits = 0;
      this.currentTripTime = 0.0;
      this.traffic.reset();
      this.lastStageIndex = 0;
      this.flock.reset(CONFIG.WORLD.START_POSITION);
    }
    this.state = GameState.PLAYING;
  }

  /**
   * Retries the current stage crossing following a sheep-vehicle collision.
   */
  retryAfterHit() {
    this.ui.hideCard();
    this.flock.reset(CONFIG.WORLD.START_POSITION);
    this.traffic.reset();
    this.state = GameState.PLAYING;
  }

  /**
   * Completely resets the world back to Stage 1 Open Grassland.
   */
  resetEntireGame() {
    this.ui.hideCard();
    this.resetAllMetrics();
    this.state = GameState.PLAYING;
  }

  /**
   * Resets all world metrics, progression, and entities.
   */
  resetAllMetrics() {
    this.developmentLevel = 0.0;
    this.targetDevelopmentLevel = 0.0;
    this.tripTimes = [];
    this.totalHits = 0;
    this.currentTripTime = 0.0;
    this.traffic.reset();
    this.lastStageIndex = 0;
    this.input.resetCallUsage();
    this.flock.reset(CONFIG.WORLD.START_POSITION);
  }

  /**
   * Jumps world development to a specific stage in manual presentation mode.
   * @param {number} stageNumber 1 to 6
   */
  jumpToStage(stageNumber) {
    const clampedStage = MathUtils.clamp(stageNumber, 1, CONFIG.STAGES.MAX_STAGE);
    this.isAutoMode = false;
    this.targetDevelopmentLevel = CONFIG.STAGES.TARGET_LEVELS[clampedStage - 1];
    this.ui.syncPresentationBar(this.getCurrentStageNumber(), this.isAutoMode);
  }

  /**
   * Toggles between automatic time-based stage progression and manual mode.
   */
  toggleAutoMode() {
    this.isAutoMode = !this.isAutoMode;
    if (!this.isAutoMode) {
      this.targetDevelopmentLevel = this.developmentLevel;
    }
    this.ui.syncPresentationBar(this.getCurrentStageNumber(), this.isAutoMode);
  }

  /**
   * Primary update tick.
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    this.elapsedTime += dt;

    // Smoothly interpolate development toward manual target when in presentation mode
    if (!this.isAutoMode && this.state !== GameState.SHEEP_HIT) {
      const step = CONFIG.STAGES.MANUAL_TRANSITION_SPEED * dt;
      this.developmentLevel += MathUtils.clamp(this.targetDevelopmentLevel - this.developmentLevel, -step, step);
    }

    // Clear any lingering vehicles if development regressed below stage 3
    if (this.developmentLevel < CONFIG.TRAFFIC.MIN_DEVELOPMENT_LEVEL && this.traffic.vehicles.length > 0) {
      this.traffic.reset();
    }

    // State: Sheep Hit
    if (this.state === GameState.SHEEP_HIT) {
      this.hitTimer += dt;
      if (this.hitTimer > 0.9 && this.ui.overlay.hidden) {
        this.ui.showHitCard();
      }
      return;
    }

    // Freeze update during intro and end screens
    if (this.state === GameState.INTRO || this.state === GameState.GAME_OVER) {
      return;
    }

    // Auto advancement of landscape development
    if (this.isAutoMode) {
      this.developmentLevel = MathUtils.clamp(
        this.developmentLevel + dt * CONFIG.STAGES.AUTO_ADVANCE_RATE,
        0,
        CONFIG.STAGES.MAX_STAGE
      );
    }

    // Detect stage index transition and trigger HUD flash
    const currentStage = Math.min(CONFIG.STAGES.MAX_STAGE, Math.floor(this.developmentLevel) + 1);
    if (currentStage !== this.lastStageIndex) {
      this.lastStageIndex = currentStage;
      this.stageFlashTimer = 4.0;
    }
    this.stageFlashTimer = Math.max(0, this.stageFlashTimer - dt);

    if (this.state === GameState.PLAYING) {
      this.currentTripTime += dt;
      this.playTime += dt;
    }

    // Calculate traffic skittishness parameter [0, 1]
    const trafficIntensity = MathUtils.clamp(
      (this.developmentLevel - CONFIG.TRAFFIC.MIN_DEVELOPMENT_LEVEL) / 4,
      0,
      1
    );

    // Update Flock
    const leaderPos = this.flock.getLeader();
    const movementVector = this.input.getMovementVector(leaderPos);
    const isCalling = this.input.isCalling();
    const isArrived = this.state === GameState.ARRIVED;
    const isPlayState = this.state === GameState.PLAYING;

    this.flock.update(
      movementVector,
      isCalling,
      trafficIntensity,
      this.developmentLevel,
      CONFIG.STRUCTURES,
      (s) => this.structures.getProgress(s, this.developmentLevel),
      dt,
      isArrived,
      isPlayState
    );

    // Update Traffic
    this.traffic.update(dt, this.developmentLevel);

    // Collision Detection: Sheep vs Traffic
    if (this.state === GameState.PLAYING && this.developmentLevel >= CONFIG.TRAFFIC.MIN_DEVELOPMENT_LEVEL) {
      const collision = this.flock.checkVehicleCollisions(this.traffic.vehicles);
      if (collision.hit) {
        this.state = GameState.SHEEP_HIT;
        this.hitTimer = 0.0;
        this.totalHits++;
        this.lastHitPosition = collision.position;
        return;
      }
    }

    // Arrival Detection: All sheep at water trough
    const trough = CONFIG.WORLD.TROUGH;
    if (this.state === GameState.PLAYING && this.flock.hasAllArrived(trough.x, trough.y, trough.radius)) {
      this.tripTimes.push(this.currentTripTime);
      this.currentTripTime = 0.0;
      this.state = GameState.ARRIVED;
      this.arriveTimer = 0.0;
    }

    // Arrival Resolution Timer
    if (this.state === GameState.ARRIVED) {
      this.arriveTimer += dt;
      if (this.arriveTimer > 1.8) {
        // Complete game if final stage is reached in auto mode
        if (this.isAutoMode && this.developmentLevel >= CONFIG.STAGES.MAX_STAGE) {
          this.state = GameState.GAME_OVER;
          const firstDuration = this.tripTimes[0] || 0;
          const lastDuration = this.tripTimes[this.tripTimes.length - 1] || 0;
          this.ui.showEndCard(firstDuration, lastDuration, this.tripTimes.length, this.totalHits);
        } else {
          // Reset flock for the next crossing
          this.flock.reset(CONFIG.WORLD.START_POSITION);
          this.state = GameState.PLAYING;
        }
      }
    }
  }

  /**
   * Primary render pass.
   */
  render() {
    const ctx = this.ctx;
    const roadProgress = Road.getProgress(this.developmentLevel);

    // 1. Pastoral ground & ancient trodden path
    this.landscape.renderGround(ctx, this.developmentLevel, roadProgress, this.elapsedTime);
    this.landscape.renderTroddenPath(ctx);

    // 2. Water trough destination
    this.landscape.renderWaterTrough(ctx, this.elapsedTime);

    // 3. Highway
    this.road.render(ctx, this.developmentLevel);

    // 4. Roadside structures
    this.structures.render(ctx, this.developmentLevel);

    // 5. Flock
    this.flock.render(ctx, this.elapsedTime);

    // 6. Vehicles
    this.traffic.render(ctx);

    // 7. Atmospheric haze, drifting dust & vignette
    this.landscape.renderAtmosphere(ctx, this.developmentLevel, this.elapsedTime);

    // 8. In-canvas HUD and status messages
    this.ui.renderHUD(ctx, {
      gameState: this.state,
      developmentLevel: this.developmentLevel,
      tripCount: this.tripTimes.length,
      stageFlashTimer: this.stageFlashTimer,
      hasUsedCall: this.input.hasUsedCall,
      playTime: this.playTime,
      hitPosition: this.lastHitPosition,
      hitTimer: this.hitTimer
    });
  }
}

