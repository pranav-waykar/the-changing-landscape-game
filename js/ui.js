/**
 * The Changing Landscape - UI Manager
 * 
 * Handles modal dialog cards (intro, collision retry, game completion),
 * in-canvas HUD rendering (stage status, crossing count, tutorial prompts, arrival toast),
 * and presentation stage switcher toolbar synchronization.
 */

'use strict';

class UIManager {
  /**
   * @param {HTMLElement} overlayElement
   * @param {HTMLElement} presentationBarElement
   * @param {HTMLElement} [audioButtonElement]
   * @param {HTMLElement} [pauseButtonElement]
   * @param {Object} actionHandlers
   */
  constructor(overlayElement, presentationBarElement, audioButtonElement, pauseButtonElement, actionHandlers = {}) {
    this.overlay = overlayElement;
    this.presentationBar = presentationBarElement;
    this.audioButton = audioButtonElement;
    this.pauseButton = pauseButtonElement;
    this.actions = actionHandlers;

    this._initOverlayEvents();
    this._initPresentationBar();
    this._initStageButtons();
  }

  /**
   * Initializes header stage control button listeners.
   * @private
   */
  _initStageButtons() {
    if (this.audioButton) {
      this.audioButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof this.actions.onToggleAudio === 'function') {
          this.actions.onToggleAudio();
        }
      });
    }

    if (this.pauseButton) {
      this.pauseButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof this.actions.onTogglePause === 'function') {
          this.actions.onTogglePause();
        }
      });
    }
  }

  /**
   * Initializes overlay click delegation for card action buttons.
   * @private
   */
  _initOverlayEvents() {
    this.overlay.addEventListener('click', (e) => {
      const button = e.target.closest('button[data-action]');
      if (!button) return;

      const action = button.dataset.action;
      if (typeof this.actions[action] === 'function') {
        this.actions[action]();
      }
    });
  }

  /**
   * Builds the stage navigation buttons inside the presentation toolbar.
   * @private
   */
  _initPresentationBar() {
    if (!this.presentationBar) return;

    const shortNames = CONFIG.STAGES.SHORT_NAMES;
    let buttonsHtml = '<button data-stage="prev" aria-label="Previous Stage">Previous</button>';

    shortNames.forEach((name, index) => {
      const stageNum = index + 1;
      buttonsHtml += `<button data-stage="${stageNum}">${stageNum} ${name}</button>`;
    });

    buttonsHtml += '<button data-stage="next" aria-label="Next Stage">Next</button>';
    buttonsHtml += '<button data-stage="pause" aria-label="Pause for Deliberation">Pause (P)</button>';
    buttonsHtml += '<button data-stage="audio" aria-label="Toggle Sound">Sound: on</button>';
    buttonsHtml += '<button data-stage="auto" aria-label="Toggle Auto Progress">Auto: on</button>';

    this.presentationBar.innerHTML = buttonsHtml;

    this.presentationBar.addEventListener('click', (e) => {
      const button = e.target.closest('button[data-stage]');
      if (!button) return;

      button.blur();
      const target = button.dataset.stage;

      if (target === 'prev') {
        if (typeof this.actions.onPrevStage === 'function') this.actions.onPrevStage();
      } else if (target === 'next') {
        if (typeof this.actions.onNextStage === 'function') this.actions.onNextStage();
      } else if (target === 'pause') {
        if (typeof this.actions.onTogglePause === 'function') this.actions.onTogglePause();
      } else if (target === 'audio') {
        if (typeof this.actions.onToggleAudio === 'function') this.actions.onToggleAudio();
      } else if (target === 'auto') {
        if (typeof this.actions.onToggleAuto === 'function') this.actions.onToggleAuto();
      } else {
        const stageNum = parseInt(target, 10);
        if (typeof this.actions.onJumpStage === 'function') this.actions.onJumpStage(stageNum);
      }
    });
  }

  /**
   * Shows a modal card with the provided HTML markup.
   * @param {string} htmlContent
   */
  showCard(htmlContent) {
    this.overlay.innerHTML = `<div class="card">${htmlContent}</div>`;
    this.overlay.hidden = false;
  }

  /**
   * Hides the modal overlay.
   */
  hideCard() {
    this.overlay.hidden = true;
  }

  /**
   * Displays the game introduction card.
   */
  showIntroCard() {
    this.showCard(`
      <h1>The Changing Landscape</h1>
      <p class="sub">An interactive study of how a highway reshapes open land</p>
      <p>You are a shepherd. Take your flock across the grassland to the water.</p>
      <ul>
        <li>Move the lead sheep with the arrow keys or WASD, or drag on touch screens.</li>
        <li>Hold Space to call the others to you. You move slower while calling.</li>
        <li>Every sheep must reach the trough.</li>
      </ul>
      <button data-action="begin">Begin</button>
    `);
  }

  /**
   * Displays the sheep collision retry card.
   */
  showHitCard() {
    this.showCard(`
      <h2>A sheep was hit.</h2>
      <p>The road keeps its pace. Bring the flock back and try again.</p>
      <button data-action="retry">Try again</button>
    `);
  }

  /**
   * Displays the thematic end screen with journey statistics.
   * @param {number} firstDuration
   * @param {number} lastDuration
   * @param {number} totalTrips
   * @param {number} totalHits
   */
  showEndCard(firstDuration, lastDuration, totalTrips, totalHits) {
    const hitsText = totalHits === 1 ? '1 time' : `${totalHits} times`;
    this.showCard(`
      <h2>The grassland is the same. The journey is not.</h2>
      <p>Your first crossing took ${firstDuration.toFixed(0)} seconds. Your last took ${lastDuration.toFixed(0)}.</p>
      <p>You crossed ${totalTrips} times and lost sheep to the road ${hitsText}. Nothing in the landscape asked you to slow down, yet the road made you.</p>
      <button data-action="again">Walk it again</button>
    `);
  }

  /**
   * Synchronizes presentation toolbar and header button states with the current game progression.
   * @param {number} currentStage 1 to 6
   * @param {boolean} isAuto
   * @param {boolean} isPaused
   * @param {boolean} isMuted
   */
  syncPresentationBar(currentStage, isAuto, isPaused = false, isMuted = false) {
    if (this.audioButton) {
      this.audioButton.textContent = isMuted ? 'Sound: off' : 'Sound: on';
      this.audioButton.classList.toggle('muted', isMuted);
    }

    if (this.pauseButton) {
      this.pauseButton.textContent = isPaused ? 'Resume (P)' : 'Pause (P)';
      this.pauseButton.classList.toggle('active', isPaused);
      this.pauseButton.classList.toggle('on', isPaused);
    }

    if (!this.presentationBar) return;

    const buttons = this.presentationBar.querySelectorAll('button[data-stage]');
    buttons.forEach((btn) => {
      const stageKey = btn.dataset.stage;

      if (stageKey === 'auto') {
        btn.textContent = `Auto: ${isAuto ? 'on' : 'off'}`;
        btn.classList.toggle('on', isAuto);
      } else if (stageKey === 'pause') {
        btn.textContent = isPaused ? 'Resume (P)' : 'Pause (P)';
        btn.classList.toggle('on', isPaused);
      } else if (stageKey === 'audio') {
        btn.textContent = isMuted ? 'Sound: off' : 'Sound: on';
        btn.classList.toggle('on', !isMuted);
      } else {
        const isCurrent = stageKey === String(currentStage);
        btn.classList.toggle('on', isCurrent);
      }
    });
  }

  /**
   * Toggles visibility of the presentation toolbar.
   */
  toggleToolbarVisibility() {
    if (this.presentationBar) {
      this.presentationBar.hidden = !this.presentationBar.hidden;
    }
  }

  /**
   * Renders the in-canvas HUD: stage indicator pill, crossing counter,
   * tutorial call hints, arrival notification, and hit shockwaves.
   * 
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} state
   * @param {string} state.gameState
   * @param {number} state.developmentLevel
   * @param {number} state.tripCount
   * @param {number} state.stageFlashTimer
   * @param {boolean} state.hasUsedCall
   * @param {number} state.playTime
   * @param {{x: number, y: number}|null} state.hitPosition
   * @param {number} state.hitTimer
   */
  renderHUD(ctx, state) {
    const W = CONFIG.CANVAS.WIDTH;
    const H = CONFIG.CANVAS.HEIGHT;

    // 1. Vehicle Collision Shockwave Ring
    if (state.gameState === 'hit' && state.hitPosition) {
      const alpha = MathUtils.clamp(1 - state.hitTimer, 0, 1);
      ctx.save();
      ctx.strokeStyle = `rgba(200, 60, 40, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(state.hitPosition.x, state.hitPosition.y, 10 + state.hitTimer * 60, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Do not draw stage/crossing badges during initial intro screen
    if (state.gameState === 'intro') return;

    // Deliberation Pause Badge
    if (state.isPaused) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const titleText = 'PAUSED FOR DELIBERATION';
      const subText = 'Click anywhere or press P to resume with co-shepherds';

      ctx.font = '700 15px Mukta, sans-serif';
      const w1 = ctx.measureText(titleText).width;

      ctx.font = '500 13px Mukta, sans-serif';
      const w2 = ctx.measureText(subText).width;

      // Generously sized card with comfortable padding so text never touches border
      const cardWidth = Math.max(420, Math.max(w1, w2) + 64);
      const cardHeight = 56;
      const cardX = W / 2 - cardWidth / 2;
      const cardY = 14;

      // Soft drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.20)';
      MathUtils.drawRoundedRect(ctx, cardX + 2, cardY + 3, cardWidth, cardHeight, 10);
      ctx.fill();

      // Card Face
      ctx.fillStyle = 'rgba(252, 248, 238, 0.98)';
      ctx.strokeStyle = '#c8651b';
      ctx.lineWidth = 2.5;
      MathUtils.drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 10);
      ctx.fill();
      ctx.stroke();

      // Title
      ctx.fillStyle = '#2d2a22';
      ctx.font = '700 15px Mukta, sans-serif';
      ctx.fillText(titleText, W / 2, cardY + 20);

      // Subtitle
      ctx.fillStyle = '#7a4214';
      ctx.font = '500 13px Mukta, sans-serif';
      ctx.fillText(subText, W / 2, cardY + 39);

      ctx.restore();
    }

    ctx.save();
    ctx.font = '500 14px Mukta, sans-serif';
    ctx.textBaseline = 'middle';

    // 2. Stage Indicator Pill
    const stageIndex = Math.min(6, Math.floor(state.developmentLevel) + 1);
    const stageTitle = `Stage ${stageIndex} of 6: ${CONFIG.STAGES.NAMES[stageIndex - 1]}`;
    ctx.textAlign = 'left';

    const stageWidth = ctx.measureText(stageTitle).width + 22;
    const flashBoost = 0.3 * MathUtils.clamp(state.stageFlashTimer, 0, 1);
    ctx.fillStyle = `rgba(248, 243, 229, ${0.62 + flashBoost})`;
    MathUtils.drawRoundedRect(ctx, 14, 14, stageWidth, 28, 6);
    ctx.fill();

    ctx.fillStyle = '#2d2a22';
    ctx.fillText(stageTitle, 25, 28);

    // 3. Crossing Counter & Live Stopwatch Pill
    const currentSeconds = (state.currentTripTime || 0).toFixed(1);
    let crossingText = `Crossing ${state.tripCount + 1}  •  ${currentSeconds}s`;
    if (state.lastTripDuration !== null && state.lastTripDuration !== undefined) {
      crossingText += `  (Prev: ${state.lastTripDuration.toFixed(1)}s)`;
    }

    const crossingWidth = ctx.measureText(crossingText).width + 22;
    ctx.fillStyle = 'rgba(248, 243, 229, 0.62)';
    MathUtils.drawRoundedRect(ctx, 14, 48, crossingWidth, 26, 6);
    ctx.fill();

    ctx.fillStyle = '#2d2a22';
    ctx.fillText(crossingText, 25, 61);

    // 4. Tutorial Call Prompt (shows if player hasn't called after 3s)
    if (state.gameState === 'play' && !state.hasUsedCall && state.playTime > 3 && state.playTime < 25) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(248, 243, 229, 0.8)';
      MathUtils.drawRoundedRect(ctx, W / 2 - 150, H - 46, 300, 28, 6);
      ctx.fill();

      ctx.fillStyle = '#2d2a22';
      ctx.fillText('Hold Space to call the flock', W / 2, H - 32);
    }

    // 5. Water Arrival Banner
    if (state.gameState === 'arrive') {
      ctx.textAlign = 'center';
      const lastDurationText = state.lastTripDuration ? ` (${state.lastTripDuration.toFixed(1)}s)` : '';
      const arrivalTitle = `Water. The flock is together.${lastDurationText}`;

      ctx.font = '700 20px Mukta, sans-serif';
      const bannerWidth = Math.max(340, ctx.measureText(arrivalTitle).width + 48);

      ctx.fillStyle = 'rgba(248, 243, 229, 0.94)';
      MathUtils.drawRoundedRect(ctx, W / 2 - bannerWidth / 2, H / 2 - 24, bannerWidth, 48, 8);
      ctx.fill();

      ctx.fillStyle = '#2d2a22';
      ctx.fillText(arrivalTitle, W / 2, H / 2);
    }

    ctx.restore();
  }
}

