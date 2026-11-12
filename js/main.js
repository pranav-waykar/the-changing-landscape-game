/**
 * The Changing Landscape - Main Entry Point
 * 
 * Bootstraps canvas scaling for HiDPI/Retina screens, instantiates the Game,
 * and maintains the fixed-timestep animation loop.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const overlay = document.getElementById('overlay');
  const callButton = document.getElementById('call-button');
  const presentationBar = document.getElementById('presentation-bar');
  const audioButton = document.getElementById('audio-toggle-button');
  const pauseButton = document.getElementById('pause-toggle-button');

  if (!canvas || !overlay) {
    console.error('Critical initialization error: Canvas or overlay element missing.');
    return;
  }

  // Setup HiDPI / Retina resolution
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, CONFIG.CANVAS.MAX_DPR);
  
  canvas.width = CONFIG.CANVAS.WIDTH * dpr;
  canvas.height = CONFIG.CANVAS.HEIGHT * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Instantiate the game
  const game = new Game(canvas, overlay, callButton, presentationBar, audioButton, pauseButton);

  // Game Loop
  let lastTimestamp = performance.now();

  function gameLoop(currentTimestamp) {
    // Clamp delta time to 50ms maximum to prevent tunneling after tab dormancy
    const dt = Math.min(0.05, (currentTimestamp - lastTimestamp) / 1000);
    lastTimestamp = currentTimestamp;

    game.update(dt);
    game.render();

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
});

