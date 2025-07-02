import * as THREE from 'three';

export class ColorSystem {
  constructor(scene) {
    this.scene = scene;
    this.currentSongIndex = 0;
    this.transitionProgress = 0;
    this.isTransitioning = false;
    this.transitionStartTime = 0;
    this.transitionDuration = 2000; // 2 seconds for color transition
    
    // Beat detection
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.beatIntensity = 0;
    this.beatThreshold = 0.3;
    this.lastBeatTime = 0;
    this.beatCooldown = 100; // ms between beats
    this.energyHistory = [];
    this.energyHistorySize = 20;
    
    // Song color palettes - 3 colors that smoothly cross each other
    this.songPalettes = [
      // Song 1 - jedynka - Blue/Purple/Cyan
      [
        new THREE.Color(0x00ffff), // Cyan
        new THREE.Color(0x0080ff), // Blue
        new THREE.Color(0x8000ff)  // Purple
      ],
      // Song 2 - dwojka - Red/Orange/Pink
      [
        new THREE.Color(0xff4040), // Red
        new THREE.Color(0xff8040), // Orange
        new THREE.Color(0xff4080)  // Pink
      ],
      // Song 3 - trzeci - Green/Lime/Emerald
      [
        new THREE.Color(0x40ff40), // Green
        new THREE.Color(0x80ff40), // Lime
        new THREE.Color(0x40ff80)  // Emerald
      ],
      // Song 4 - damiana - Yellow/Gold/Amber
      [
        new THREE.Color(0xffff40), // Yellow
        new THREE.Color(0xffd040), // Gold
        new THREE.Color(0xff8040)  // Amber
      ],
      // Song 5 - siaja - Violet/Magenta/Indigo
      [
        new THREE.Color(0x8040ff), // Violet
        new THREE.Color(0xff40ff), // Magenta
        new THREE.Color(0x4040ff)  // Indigo
      ],
      // Song 6 - smutny - Teal/Turquoise/Sea
      [
        new THREE.Color(0x40ffff), // Teal
        new THREE.Color(0x40d0ff), // Turquoise
        new THREE.Color(0x4080ff)  // Sea blue
      ],
      // Song 7 - ośem - White/Silver/Blue
      [
        new THREE.Color(0xffffff), // White
        new THREE.Color(0xc0c0c0), // Silver
        new THREE.Color(0x8080ff)  // Light blue
      ]
    ];
  }

  // Initialize beat detection
  initializeBeatDetection(audioElement) {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      
      // Configure analyser
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      
      // Connect audio element to analyser
      const source = this.audioContext.createMediaElementSource(audioElement);
      source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
      
      console.log('Beat detection initialized successfully');
    } catch (error) {
      console.error('Failed to initialize beat detection:', error);
    }
  }

  // Detect beats from audio data
  detectBeats() {
    if (!this.analyser || !this.dataArray) return;
    
    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Calculate energy in bass frequencies (0-100Hz roughly)
    let bassEnergy = 0;
    const bassEnd = Math.floor(this.dataArray.length * 0.1); // Lower 10% of frequencies
    
    for (let i = 0; i < bassEnd; i++) {
      bassEnergy += this.dataArray[i];
    }
    
    bassEnergy /= bassEnd;
    bassEnergy /= 255; // Normalize to 0-1
    
    // Store energy history
    this.energyHistory.push(bassEnergy);
    if (this.energyHistory.length > this.energyHistorySize) {
      this.energyHistory.shift();
    }
    
    // Calculate average energy
    const avgEnergy = this.energyHistory.reduce((sum, energy) => sum + energy, 0) / this.energyHistory.length;
    
    // Beat detection: current energy is significantly higher than average
    const now = Date.now();
    const energyVariance = bassEnergy - avgEnergy;
    
    if (energyVariance > this.beatThreshold && 
        bassEnergy > 0.1 && 
        now - this.lastBeatTime > this.beatCooldown) {
      
      this.beatIntensity = Math.min(energyVariance * 3, 1); // Amplify and cap at 1
      this.lastBeatTime = now;
    } else {
      // Gradually decrease beat intensity
      this.beatIntensity *= 0.9;
    }
    
    // Get overall volume for color intensity
    let totalEnergy = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      totalEnergy += this.dataArray[i];
    }
    totalEnergy /= this.dataArray.length;
    totalEnergy /= 255;
    
    return {
      beatIntensity: this.beatIntensity,
      volume: totalEnergy,
      bassEnergy: bassEnergy
    };
  }

  // Add colors to torus geometry
  addColorsToTorus(torusGeometry) {
    const positions = torusGeometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    
    // Calculate colors for each vertex
    this.updateTorusColors(torusGeometry, colors, 0);
    
    torusGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return colors;
  }

  // Update torus colors based on position, time, and beat detection
  updateTorusColors(torusGeometry, colorsArray, time) {
    const positions = torusGeometry.attributes.position.array;
    const palette = this.getCurrentPalette();
    
    // Get beat data
    const beatData = this.detectBeats() || { beatIntensity: 0, volume: 0.5, bassEnergy: 0 };
    
    // Beat effects
    const beatPulse = 1 + beatData.beatIntensity * 0.5; // Pulse multiplier
    const volumeIntensity = 0.3 + beatData.volume * 0.7; // Base intensity + volume
    const bassBoost = 1 + beatData.bassEnergy * 0.3; // Bass frequency boost
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // Calculate toroidal and poloidal angles
      const toroidalAngle = Math.atan2(y, x);
      const mainRadius = Math.sqrt(x * x + y * y);
      const tubeCenter = 1.0;
      const tubeRadial = mainRadius - tubeCenter;
      const poloidalAngle = Math.atan2(z, tubeRadial);
      
      // Create smooth color transitions based on angles and time
      const colorPhase1 = (toroidalAngle + time * 0.5) / (Math.PI * 2);
      const colorPhase2 = (poloidalAngle + time * 0.3) / (Math.PI * 2);
      const colorPhase3 = (toroidalAngle + poloidalAngle + time * 0.7) / (Math.PI * 2);
      
      // Add beat synchronization to color phases
      const beatPhaseOffset = beatData.beatIntensity * Math.PI * 0.5;
      
      // Normalize phases to 0-1 with beat influence
      const phase1 = (Math.sin(colorPhase1 * Math.PI * 2 + beatPhaseOffset) + 1) * 0.5;
      const phase2 = (Math.sin(colorPhase2 * Math.PI * 2 + beatPhaseOffset * 0.7) + 1) * 0.5;
      const phase3 = (Math.sin(colorPhase3 * Math.PI * 2 + beatPhaseOffset * 1.3) + 1) * 0.5;
      
      // Mix the three colors based on phases
      const totalPhase = phase1 + phase2 + phase3;
      const weight1 = phase1 / totalPhase;
      const weight2 = phase2 / totalPhase;
      const weight3 = phase3 / totalPhase;
      
      const finalColor = new THREE.Color();
      finalColor.setRGB(
        palette[0].r * weight1 + palette[1].r * weight2 + palette[2].r * weight3,
        palette[0].g * weight1 + palette[1].g * weight2 + palette[2].g * weight3,
        palette[0].b * weight1 + palette[1].b * weight2 + palette[2].b * weight3
      );
      
      // Apply beat effects to color intensity
      finalColor.multiplyScalar(volumeIntensity * beatPulse * bassBoost);
      
      // Ensure colors don't exceed 1.0
      finalColor.r = Math.min(finalColor.r, 1.0);
      finalColor.g = Math.min(finalColor.g, 1.0);
      finalColor.b = Math.min(finalColor.b, 1.0);
      
      const colorIndex = (i / 3) * 3;
      colorsArray[colorIndex] = finalColor.r;
      colorsArray[colorIndex + 1] = finalColor.g;
      colorsArray[colorIndex + 2] = finalColor.b;
    }
  }

  // Get current color palette (with transition blending)
  getCurrentPalette() {
    if (!this.isTransitioning) {
      return this.songPalettes[this.currentSongIndex];
    }
    
    // Blend between current and next palette
    const currentPalette = this.songPalettes[this.currentSongIndex];
    const nextIndex = (this.currentSongIndex + 1) % this.songPalettes.length;
    const nextPalette = this.songPalettes[nextIndex];
    
    const progress = this.transitionProgress;
    const blendedPalette = [];
    
    for (let i = 0; i < 3; i++) {
      blendedPalette[i] = new THREE.Color();
      blendedPalette[i].lerpColors(currentPalette[i], nextPalette[i], progress);
    }
    
    return blendedPalette;
  }

  // Start color transition when song changes
  startSongTransition(newSongIndex) {
    this.currentSongIndex = newSongIndex;
    this.isTransitioning = true;
    this.transitionStartTime = Date.now();
    this.transitionProgress = 0;
    
    // Reset beat detection history for new song
    this.energyHistory = [];
    this.beatIntensity = 0;
    this.lastBeatTime = 0;
  }

  // Update transition progress
  updateTransition() {
    if (!this.isTransitioning) return;
    
    const elapsed = Date.now() - this.transitionStartTime;
    this.transitionProgress = Math.min(elapsed / this.transitionDuration, 1);
    
    if (this.transitionProgress >= 1) {
      this.isTransitioning = false;
      this.transitionProgress = 0;
    }
  }

  // Update color system (call this in your main animation loop)
  update(time, torusGeometry, colorsArray) {
    this.updateTransition();
    this.updateTorusColors(torusGeometry, colorsArray, time);
  }

  // Get current beat data for external use (like UI visualization)
  getBeatData() {
    return {
      beatIntensity: this.beatIntensity,
      isBeating: this.beatIntensity > 0.1
    };
  }

  // Clean up
  dispose() {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}