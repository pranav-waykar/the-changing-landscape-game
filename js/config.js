/**
 * The Changing Landscape - Configuration & Constants
 * 
 * Centralized game constants, physical properties, world coordinates,
 * stage metadata, and structure definitions.
 */

'use strict';

const CONFIG = Object.freeze({
  CANVAS: Object.freeze({
    WIDTH: 960,
    HEIGHT: 540,
    ASPECT_RATIO: 16 / 9,
    MAX_DPR: 2
  }),

  WORLD: Object.freeze({
    // Road geometry
    ROAD_Y: 240,
    ROAD_HEIGHT: 112,
    ROAD_CENTER_Y: 296, // 240 + 112 / 2
    LANES: Object.freeze([
      240 + 28, // Lane 0: Westbound (leftward), Y = 268
      240 + 84  // Lane 1: Eastbound (rightward), Y = 324
    ]),

    // Pastoral coordinates
    START_POSITION: Object.freeze({ x: 90, y: 480 }),
    TROUGH: Object.freeze({ x: 810, y: 70, radius: 95 }),

    // World boundaries for sheep
    BOUNDS: Object.freeze({
      MIN_X: 12,
      MAX_X: 960 - 12,
      MIN_Y: 14,
      MAX_Y: 540 - 14
    })
  }),

  FLOCK: Object.freeze({
    COUNT: 10,
    LEAD_SPEED: 140,
    LEAD_CALL_SPEED: 95,
    LEAD_ACCELERATION: 8,
    FOLLOWER_ACCELERATION: 3,
    
    // Steering & Flocking behaviors
    CALL_PULL_SPEED: 150,
    CALL_MIN_DISTANCE: 38,
    COHESION_DISTANCE: 110,
    COHESION_FORCE_MAX: 70,
    COHESION_RAMP_DISTANCE: 200,
    
    SEPARATION_DISTANCE: 24,
    SEPARATION_FORCE: 50,
    
    BASE_WANDER_SPEED: 55,
    HIGHWAY_FEAR_DISTANCE: 150,
    HIGHWAY_FEAR_FORCE: 22,

    COLLISION_RADIUS_VEHICLE: 8,
    COLLISION_RADIUS_STRUCTURE: 9
  }),

  TRAFFIC: Object.freeze({
    MIN_DEVELOPMENT_LEVEL: 2.0,
    SPAWN_X_OFFSET: 110,
    DESPAWN_X_OFFSET: 200,
    MIN_SPAWN_SPACING: 160,
    SPAWN_RETRY_DELAY: 0.3,
    SAFE_FOLLOWING_GAP: 80,

    SPEED_BASE_MIN: 95,
    SPEED_BASE_MAX: 230,
    SPAWN_INTERVAL_MIN: 1.0,
    SPAWN_INTERVAL_MAX: 4.5,

    VEHICLE_TYPES: Object.freeze({
      bike:  Object.freeze({ length: 22, width: 10, speedFactor: 1.15 }),
      car:   Object.freeze({ length: 46, width: 24, speedFactor: 1.00 }),
      truck: Object.freeze({ length: 84, width: 30, speedFactor: 0.78 }),
      bus:   Object.freeze({ length: 96, width: 30, speedFactor: 0.85 })
    }),

    PALETTE: Object.freeze([
      '#b5372c',
      '#2f5d8a',
      '#e0b43a',
      '#e9e4d2',
      '#4a7a4e',
      '#c26a2e',
      '#5b4b8a'
    ])
  }),

  STAGES: Object.freeze({
    MAX_STAGE: 6,
    AUTO_ADVANCE_RATE: 1 / 22, // 22 seconds per stage in auto mode
    MANUAL_TRANSITION_SPEED: 0.8,
    TARGET_LEVELS: Object.freeze([0, 1.8, 2.5, 3.5, 4.99, 6.0]),
    
    NAMES: Object.freeze([
      'Open grassland',
      'The road appears',
      'Vehicles arrive',
      'Traffic builds',
      'Roadside development',
      'A busy landscape'
    ]),

    SHORT_NAMES: Object.freeze([
      'Open',
      'Road',
      'Vehicles',
      'Traffic',
      'Roadside',
      'Busy'
    ])
  }),

  STRUCTURES: Object.freeze([
    Object.freeze({ type: 'stall', x: 300, y: 372, width: 56,  height: 44, appearLevel: 4.05, color: '#d9a22b' }),
    Object.freeze({ type: 'shop',  x: 60,  y: 165, width: 100, height: 60, appearLevel: 4.10, color: '#3f6f8a' }),
    Object.freeze({ type: 'shop',  x: 110, y: 365, width: 96,  height: 62, appearLevel: 4.25, color: '#a8432f' }),
    Object.freeze({ type: 'stall', x: 230, y: 175, width: 56,  height: 44, appearLevel: 4.35, color: '#4a7a4e' }),
    Object.freeze({ type: 'shop',  x: 520, y: 368, width: 104, height: 64, appearLevel: 4.50, color: '#6b7f3a' }),
    Object.freeze({ type: 'shop',  x: 400, y: 160, width: 110, height: 64, appearLevel: 4.60, color: '#3f6f8a' }),
    Object.freeze({ type: 'sign',  x: 700, y: 380, width: 72,  height: 22, appearLevel: 4.70, color: '#2c3f6b', text: 'DHABA' }),
    Object.freeze({ type: 'sign',  x: 600, y: 170, width: 72,  height: 22, appearLevel: 4.80, color: '#a8432f', text: 'HOTEL' }),
    Object.freeze({ type: 'shop',  x: 810, y: 372, width: 90,  height: 60, appearLevel: 4.90, color: '#a8432f' }),
    Object.freeze({ type: 'stall', x: 720, y: 178, width: 56,  height: 44, appearLevel: 5.05, color: '#c26a2e' }),
    Object.freeze({ type: 'house', x: 380, y: 440, width: 110, height: 80, appearLevel: 5.20 }),
    Object.freeze({ type: 'house', x: 130, y: 60,  width: 120, height: 85, appearLevel: 5.25 }),
    Object.freeze({ type: 'house', x: 640, y: 445, width: 120, height: 75, appearLevel: 5.45 }),
    Object.freeze({ type: 'house', x: 330, y: 40,  width: 110, height: 80, appearLevel: 5.50 }),
    Object.freeze({ type: 'sign',  x: 210, y: 430, width: 72,  height: 22, appearLevel: 5.60, color: '#2c3f6b', text: 'PETROL' }),
    Object.freeze({ type: 'sign',  x: 520, y: 60,  width: 72,  height: 22, appearLevel: 5.70, color: '#4a7a4e', text: 'TEA' }),
    Object.freeze({ type: 'stall', x: 545, y: 470, width: 56,  height: 44, appearLevel: 5.80, color: '#3f6f8a' }),
    Object.freeze({ type: 'shop',  x: 870, y: 150, width: 70,  height: 60, appearLevel: 5.90, color: '#6b7f3a' })
  ]),

  ENVIRONMENT: Object.freeze({
    TUFT_COUNT: 240,
    DUST_COUNT: 40,
    RNG_SEED: 7
  })
});

