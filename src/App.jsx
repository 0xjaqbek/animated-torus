import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Play, Pause, SkipBack, SkipForward, Music } from 'lucide-react';
import { ColorSystem } from './ColorSystem.js';

const AnimatedTorus = () => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const torusRef = useRef(null);
  const animationRef = useRef(null);
  const cameraRef = useRef(null);
  const poloidalSpeedRef = useRef(0);
  const rotationalSpeedRef = useRef(0);
  const transitionRef = useRef(null);
  const colorSystemRef = useRef(null);
  const torusColorsRef = useRef(null);
  
  // Mouse controls state
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [cameraRotation, setCameraRotation] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(5);
  const [poloidalSpeed, setPoloidalSpeed] = useState(0);
  const [rotationalSpeed, setRotationalSpeed] = useState(0);

  // Music player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const audioRef = useRef(null);

  // Transition state
  const [_isTransitioning, setIsTransitioning] = useState(false);

  // Auto-animation state
  const [isAutoAnimating, setIsAutoAnimating] = useState(false);
  const [isTransitioningToAuto, setIsTransitioningToAuto] = useState(false);
  const autoAnimationRef = useRef(null);
  const autoTransitionRef = useRef(null);
  const autoAnimationStartTime = useRef(null);
  const autoTransitionStartTime = useRef(null);
  const baseRotation = useRef({ x: 0, y: 0 });
  const baseZoom = useRef(5);

  // Target values for initial transition
  const TARGET_CAMERA_X = -Math.PI / 2; // -90 degrees
  const TARGET_CAMERA_Y = 0; // 0 degrees
  const TARGET_POLOIDAL_SPEED = 0.04;
  const TARGET_ROTATIONAL_SPEED = 0.04;
  const TARGET_ZOOM = 1.7;
  const TRANSITION_DURATION = 2000; // 2 seconds
  
  // Target values for auto-animation transition
  const AUTO_TRANSITION_DURATION = 3000; // 3 seconds to ease into auto-animation

  // Single transition: move to torus position, then start auto-animation
  const startTransitionToTorusAndAuto = useCallback(() => {
    if (transitionRef.current) return; // Already transitioning
    
    console.log('Starting transition to torus position + auto-animation');
    setIsTransitioning(true);
    const startTime = Date.now();
    
    // Capture starting values
    const startValues = {
      cameraX: cameraRotation.x,
      cameraY: cameraRotation.y,
      zoom: zoom,
      poloidalSpeed: poloidalSpeed,
      rotationalSpeed: rotationalSpeed
    };

    const transitionAnimate = () => {
      if (!audioRef.current || audioRef.current.paused) {
        setIsTransitioning(false);
        transitionRef.current = null;
        return;
      }

      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / TRANSITION_DURATION, 1);
      const easedProgress = easeInOutCubic(progress);

      // Calculate new values - transition to torus position
      const newCameraX = startValues.cameraX + (TARGET_CAMERA_X - startValues.cameraX) * easedProgress;
      const newCameraY = startValues.cameraY + (TARGET_CAMERA_Y - startValues.cameraY) * easedProgress;
      const newZoom = startValues.zoom + (TARGET_ZOOM - startValues.zoom) * easedProgress;
      const newPoloidalSpeed = startValues.poloidalSpeed + (TARGET_POLOIDAL_SPEED - startValues.poloidalSpeed) * easedProgress;
      const newRotationalSpeed = startValues.rotationalSpeed + (TARGET_ROTATIONAL_SPEED - startValues.rotationalSpeed) * easedProgress;

      // Update all states
      setCameraRotation({ x: newCameraX, y: newCameraY });
      setZoom(newZoom);
      setPoloidalSpeed(newPoloidalSpeed);
      setRotationalSpeed(newRotationalSpeed);
      
      // Update refs for the 3D animation
      poloidalSpeedRef.current = newPoloidalSpeed;
      rotationalSpeedRef.current = newRotationalSpeed;

      if (progress < 1) {
        transitionRef.current = requestAnimationFrame(transitionAnimate);
      } else {
        console.log('Transition to torus completed, now starting auto-animation');
        setIsTransitioning(false);
        transitionRef.current = null;
        
        // Set base values for auto-animation
        baseRotation.current = { x: TARGET_CAMERA_X, y: TARGET_CAMERA_Y };
        baseZoom.current = TARGET_ZOOM;
        
        console.log('Base set for auto-animation:', baseRotation.current, 'zoom:', baseZoom.current);
        
        // Start auto-animation immediately after transition
        startAutoTransition();
      }
    };

    transitionRef.current = requestAnimationFrame(transitionAnimate);
  }, [cameraRotation.x, cameraRotation.y, zoom, poloidalSpeed, rotationalSpeed]);

  // Smooth transition into auto-animation using blend approach
  const startAutoTransition = useCallback(() => {
    if (autoTransitionRef.current || autoAnimationRef.current) return; // Already transitioning or animating
    
    console.log('Starting smooth blend to auto-animation!'); // Debug log
    setIsTransitioningToAuto(true);
    autoTransitionStartTime.current = Date.now();
    autoAnimationStartTime.current = Date.now(); // Start auto-animation timer immediately
    
    // Use the TARGET TORUS POSITION as the static base, not current camera position
    const staticTorusPosition = {
      x: TARGET_CAMERA_X,  // -Math.PI / 2
      y: TARGET_CAMERA_Y,  // 0
      zoom: TARGET_ZOOM    // 1.7
    };
    
    // Set base position for auto-animation calculations to the torus position
    baseRotation.current = { x: TARGET_CAMERA_X, y: TARGET_CAMERA_Y };
    baseZoom.current = TARGET_ZOOM;
    
    console.log('Static torus position for transition:', staticTorusPosition);
    console.log('Base for auto-animation:', baseRotation.current);

    const transitionAnimate = () => {
      if (!audioRef.current || audioRef.current.paused) {
        console.log('Audio stopped during auto-transition');
        setIsTransitioningToAuto(false);
        autoTransitionRef.current = null;
        return;
      }

      const transitionElapsed = Date.now() - autoTransitionStartTime.current;
      const transitionProgress = Math.min(transitionElapsed / AUTO_TRANSITION_DURATION, 1);
      const blendFactor = easeInOutCubic(transitionProgress); // 0 = static torus position, 1 = full auto
      
      // Calculate auto-animation values using continuous time
      const autoElapsed = (Date.now() - autoAnimationStartTime.current) / 1000;
      
      // Auto-animation parameters
      const cameraFrequency = 0.2;
      const zoomFrequency = 0.15;
      const maxAngleRange = Math.PI / 2;
      
      // Calculate auto-animation target values FROM the torus position
      const autoXMovement = Math.sin(autoElapsed * cameraFrequency) * maxAngleRange * 0.5;
      const autoYMovement = Math.cos(autoElapsed * cameraFrequency * 0.7) * maxAngleRange * 0.8;
      const autoZoomMovement = Math.sin(autoElapsed * zoomFrequency) * 0.8;
      
      const autoTargetX = Math.max(-Math.PI/2, Math.min(Math.PI/2, 
        baseRotation.current.x + autoXMovement
      ));
      const autoTargetY = baseRotation.current.y + autoYMovement;
      const autoTargetZoom = Math.max(0.6, Math.min(2.2, 1.4 + autoZoomMovement));
      
      // Blend between static TORUS position and auto-animation
      const newCameraX = staticTorusPosition.x + (autoTargetX - staticTorusPosition.x) * blendFactor;
      const newCameraY = staticTorusPosition.y + (autoTargetY - staticTorusPosition.y) * blendFactor;
      const newZoom = staticTorusPosition.zoom + (autoTargetZoom - staticTorusPosition.zoom) * blendFactor;
      
      setCameraRotation({ x: newCameraX, y: newCameraY });
      setZoom(newZoom);
      
      if (transitionProgress < 1) {
        autoTransitionRef.current = requestAnimationFrame(transitionAnimate);
      } else {
        console.log('Blend transition completed, switching to full auto-animation');
        setIsTransitioningToAuto(false);
        autoTransitionRef.current = null;
        
        // Continue with full auto-animation (timer already running)
        startAutoAnimation();
      }
    };

    autoTransitionRef.current = requestAnimationFrame(transitionAnimate);
  }, []);

  // Get the base URL for production deployment
  const getAssetUrl = (filename) => {
    const base = import.meta.env.BASE_URL || '/';
    return `${base}${filename}`;
  };

  // Placeholder songs
  const songs = [
    {
      title: "jedynka",
      artist: "Pronoia",
      url: getAssetUrl("AUD-20241228-WA0000.mp3")
    },
    {
      title: "dwojka", 
      artist: "Pronoia",
      url: getAssetUrl("AUD-20241228-WA0001.mp3")
    },
    {
      title: "trzeci",
      artist: "Pronoia", 
      url: getAssetUrl("AUD-20241228-WA0002.mp3")
    },
    {
      title: "damiana",
      artist: "Pronoia",
      url: getAssetUrl("AUD-20241228-WA0004.mp3")
    },
    {
      title: "siaja", 
      artist: "Pronoia",
      url: getAssetUrl("AUD-20241228-WA0003.mp3")
    },
    {
      title: "smutny",
      artist: "Pronoia", 
      url: getAssetUrl("AUD-20241228-WA0005.mp3")
    },
    {
      title: "ośem",
      artist: "Pronoia", 
      url: getAssetUrl("osmy.mp3")
    },
  ];

  // Easing function for smooth transitions
  const easeInOutCubic = (t) => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  // Auto-animation function (continues from transition)
  const startAutoAnimation = useCallback(() => {
    if (autoAnimationRef.current) return; // Already animating
    
    console.log('Starting full auto-animation (continuing from transition)!'); // Debug log
    setIsAutoAnimating(true);
    // Note: autoAnimationStartTime is already set during transition for continuity

    const animate = () => {
      // Check if we should continue
      if (!audioRef.current || audioRef.current.paused) {
        console.log('Audio stopped, ending auto-animation');
        setIsAutoAnimating(false);
        autoAnimationRef.current = null;
        return;
      }

      // Use the continuous timer that started during transition
      const elapsed = (Date.now() - autoAnimationStartTime.current) / 1000; // in seconds
      
      // Slow, meditative movement speeds
      const cameraFrequency = 0.2; // Very slow camera movement
      const zoomFrequency = 0.15; // Even slower zoom changes
      
      // Create smooth movements up to 90 degrees
      const maxAngleRange = Math.PI / 2; // 90 degrees in radians
      
      // X rotation: smooth sine wave between -45° and +45° from base position
      const xMovement = Math.sin(elapsed * cameraFrequency) * maxAngleRange * 0.5;
      
      // Y rotation: smooth cosine wave for different phase, full 90° range
      const yMovement = Math.cos(elapsed * cameraFrequency * 0.7) * maxAngleRange * 0.8;
      
      // Zoom: smooth oscillation between 0.6 and 2.2
      const zoomCenter = 1.4;
      const zoomRange = 0.8;
      const zoomMovement = Math.sin(elapsed * zoomFrequency) * zoomRange;
      
      // Calculate new values
      const newCameraX = Math.max(-Math.PI/2, Math.min(Math.PI/2, 
        baseRotation.current.x + xMovement
      ));
      const newCameraY = baseRotation.current.y + yMovement;
      const newZoom = Math.max(0.6, Math.min(2.2, zoomCenter + zoomMovement));
      
      // Debug log every 120 frames (about every 2 seconds)
      if (Math.floor(elapsed * 60) % 120 === 0) {
        console.log(`Auto-animation: elapsed=${elapsed.toFixed(1)}s, x=${newCameraX.toFixed(2)}, y=${newCameraY.toFixed(2)}, zoom=${newZoom.toFixed(2)}`);
      }
      
      // Apply the changes
      setCameraRotation({ x: newCameraX, y: newCameraY });
      setZoom(newZoom);

      autoAnimationRef.current = requestAnimationFrame(animate);
    };

    // Start the animation loop
    autoAnimationRef.current = requestAnimationFrame(animate);
  }, []);

  // Stop auto-animation and transition
  const stopAutoAnimation = useCallback(() => {
    console.log('Stopping auto-animation and transitions'); // Debug log
    
    if (autoAnimationRef.current) {
      cancelAnimationFrame(autoAnimationRef.current);
      autoAnimationRef.current = null;
    }
    
    if (autoTransitionRef.current) {
      cancelAnimationFrame(autoTransitionRef.current);
      autoTransitionRef.current = null;
    }
    
    setIsAutoAnimating(false);
    setIsTransitioningToAuto(false);
  }, []);

  // Update camera position based on rotation and zoom
  const updateCamera = useCallback(() => {
    if (cameraRef.current) {
      const camera = cameraRef.current;
      const radius = zoom;
      
      camera.position.x = radius * Math.sin(cameraRotation.y) * Math.cos(cameraRotation.x);
      camera.position.y = radius * Math.sin(cameraRotation.x);
      camera.position.z = radius * Math.cos(cameraRotation.y) * Math.cos(cameraRotation.x);
      
      camera.lookAt(0, 0, 0);
    }
  }, [zoom, cameraRotation]);

  // Mouse event handlers with auto-animation stopping
  const handleMouseDown = useCallback((event) => {
    setIsMouseDown(true);
    setMousePos({ x: event.clientX, y: event.clientY });
    // Stop auto-animation when user takes manual control
    if (isAutoAnimating || isTransitioningToAuto) {
      stopAutoAnimation();
    }
  }, [isAutoAnimating, isTransitioningToAuto, stopAutoAnimation]);

  const handleMouseMove = useCallback((event) => {
    if (!isMouseDown) return;
    
    const deltaX = event.clientX - mousePos.x;
    const deltaY = event.clientY - mousePos.y;
    
    setCameraRotation(prev => ({
      x: Math.max(-Math.PI/2, Math.min(Math.PI/2, prev.x + deltaY * 0.01)),
      y: prev.y + deltaX * 0.01
    }));
    
    setMousePos({ x: event.clientX, y: event.clientY });
  }, [isMouseDown, mousePos]);

  const handleMouseUp = useCallback(() => {
    setIsMouseDown(false);
  }, []);

  // Touch event handlers with auto-animation stopping
  const handleTouchStart = useCallback((event) => {
    event.preventDefault();
    const touch = event.touches[0];
    setIsMouseDown(true);
    setMousePos({ x: touch.clientX, y: touch.clientY });
    // Stop auto-animation when user takes manual control
    if (isAutoAnimating || isTransitioningToAuto) {
      stopAutoAnimation();
    }
  }, [isAutoAnimating, isTransitioningToAuto, stopAutoAnimation]);

  const handleTouchMove = useCallback((event) => {
    event.preventDefault();
    if (!isMouseDown) return;
    
    const touch = event.touches[0];
    const deltaX = touch.clientX - mousePos.x;
    const deltaY = touch.clientY - mousePos.y;
    
    setCameraRotation(prev => ({
      x: Math.max(-Math.PI/2, Math.min(Math.PI/2, prev.x + deltaY * 0.01)),
      y: prev.y + deltaX * 0.01
    }));
    
    setMousePos({ x: touch.clientX, y: touch.clientY });
  }, [isMouseDown, mousePos]);

  const handleTouchEnd = useCallback((event) => {
    event.preventDefault();
    setIsMouseDown(false);
  }, []);

  // Handle zoom change with auto-animation stopping
  const handleZoomChange = useCallback((event) => {
    const newZoom = parseFloat(event.target.value);
    setZoom(newZoom);
    // Stop auto-animation when user manually adjusts zoom
    if (isAutoAnimating || isTransitioningToAuto) {
      stopAutoAnimation();
    }
  }, [isAutoAnimating, isTransitioningToAuto, stopAutoAnimation]);

  // Handle speed changes
  const handlePoloidalSpeedChange = useCallback((event) => {
    const newSpeed = parseFloat(event.target.value);
    setPoloidalSpeed(newSpeed);
    poloidalSpeedRef.current = newSpeed;
  }, []);

  const handleRotationalSpeedChange = useCallback((event) => {
    const newSpeed = parseFloat(event.target.value);
    setRotationalSpeed(newSpeed);
    rotationalSpeedRef.current = newSpeed;
  }, []);

  // Music control functions
  const togglePlayPause = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        stopAutoAnimation();
      } else {
        // Start playing and begin transition immediately
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          
          // Initialize beat detection for the current audio element
          if (colorSystemRef.current) {
            colorSystemRef.current.initializeBeatDetection(audioRef.current);
          }
          
          console.log('Song started, beginning immediate transition to torus + auto-animation!'); // Debug log
          
          // Start transition immediately
          startTransitionToTorusAndAuto();
        }).catch(console.error);
      }
    }
  }, [isPlaying, startTransitionToTorusAndAuto]);

  const nextSong = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    stopAutoAnimation();
    const nextIndex = (currentSongIndex + 1) % songs.length;
    setCurrentSongIndex(nextIndex);
    // Start color transition to new song
    if (colorSystemRef.current) {
      colorSystemRef.current.startSongTransition(nextIndex);
    }
  }, [currentSongIndex, songs.length, stopAutoAnimation]);

  const previousSong = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    stopAutoAnimation();
    const prevIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    setCurrentSongIndex(prevIndex);
    // Start color transition to new song
    if (colorSystemRef.current) {
      colorSystemRef.current.startSongTransition(prevIndex);
    }
  }, [currentSongIndex, songs.length, stopAutoAnimation]);

  const handleSongEnd = useCallback(() => {
    stopAutoAnimation();
    nextSong();
  }, [nextSong, stopAutoAnimation]);

  useEffect(() => {
    // Initialize ref values
    poloidalSpeedRef.current = 0;
    rotationalSpeedRef.current = 0;
    
    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    // Add renderer to DOM
    if (mountRef.current) {
      mountRef.current.appendChild(renderer.domElement);
    }

    // Torus geometry
    const torusGeometry = new THREE.TorusGeometry(1, 0.4, 32, 100);
    const originalPositions = torusGeometry.attributes.position.array.slice();
    
    // Initialize color system
    colorSystemRef.current = new ColorSystem(scene);
    
    // Add colors to torus geometry
    const torusColors = colorSystemRef.current.addColorsToTorus(torusGeometry);
    torusColorsRef.current = torusColors;
    
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const lineWidth = isTouchDevice ? 1 : 2;
    
    const torusMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true, // Enable vertex colors
      wireframe: true,
      wireframeLinewidth: lineWidth
    });

    const torus = new THREE.Mesh(torusGeometry, torusMaterial);
    scene.add(torus);
    torusRef.current = torus;

    // Initial camera position
    camera.position.set(0, 0, zoom);
    camera.lookAt(0, 0, 0);

    // Animation variables
    let time = 0;

    // Animation loop
    const animate = () => {
      time += 0.02;

      if (torusRef.current) {
        const geometry = torusRef.current.geometry;
        const positions = geometry.attributes.position.array;
        
        for (let i = 0; i < positions.length; i += 3) {
          const origX = originalPositions[i];
          const origY = originalPositions[i + 1];
          const origZ = originalPositions[i + 2];
          
          const mainRadius = Math.sqrt(origX * origX + origY * origY);
          const rotationSpeed = -time * rotationalSpeedRef.current + mainRadius * 1.5;
          const cosAngle = Math.cos(rotationSpeed);
          const sinAngle = Math.sin(rotationSpeed);
          
          const toroidalAngle = Math.atan2(origY, origX);
          
          const tubeCenter = 1.0;
          const tubeRadial = mainRadius - tubeCenter;
          const tubeVertical = origZ;
          
          const tubeRadius = Math.sqrt(tubeRadial * tubeRadial + tubeVertical * tubeVertical);
          const poloidalAngle = Math.atan2(tubeVertical, tubeRadial);
          
          const poloidalRotation = time * poloidalSpeedRef.current;
          const newPoloidalAngle = poloidalAngle + poloidalRotation;
          
          const newTubeRadial = tubeRadius * Math.cos(newPoloidalAngle);
          const newTubeVertical = tubeRadius * Math.sin(newPoloidalAngle);
          const newMainRadius = tubeCenter + newTubeRadial;
          
          const poloidalX = newMainRadius * Math.cos(toroidalAngle);
          const poloidalY = newMainRadius * Math.sin(toroidalAngle);
          
          const finalX = poloidalX * cosAngle - poloidalY * sinAngle;
          const finalY = poloidalX * sinAngle + poloidalY * cosAngle;
          
          positions[i] = finalX;
          positions[i + 1] = finalY;
          positions[i + 2] = newTubeVertical;
        }
        
        geometry.attributes.position.needsUpdate = true;
        
        // Update color system with beat detection
        if (colorSystemRef.current && torusColorsRef.current) {
          colorSystemRef.current.update(time, geometry, torusColorsRef.current);
          geometry.attributes.color.needsUpdate = true;
        }
      }

      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (transitionRef.current) {
        cancelAnimationFrame(transitionRef.current);
      }
      if (autoAnimationRef.current) {
        cancelAnimationFrame(autoAnimationRef.current);
      }
      if (autoTransitionRef.current) {
        cancelAnimationFrame(autoTransitionRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      if (colorSystemRef.current) {
        colorSystemRef.current.dispose();
      }
      renderer.dispose();
      torusGeometry.dispose();
      torusMaterial.dispose();
    };
  }, []);

  // Update camera when rotation or zoom changes
  useEffect(() => {
    updateCamera();
  }, [updateCamera]);

  // Add mouse and touch event listeners to the canvas
  useEffect(() => {
    const canvas = rendererRef.current?.domElement;
    if (!canvas) return;

    // Mouse events
    canvas.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    // Touch events
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      // Mouse events cleanup
      canvas.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);

      // Touch events cleanup
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing touch-none" />
      
      {/* Audio element */}
      <audio 
        ref={audioRef}
        src={songs[currentSongIndex].url}
        onEnded={handleSongEnd}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Control sliders - horizontal at top */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 p-4 rounded-lg">
        <div className="flex space-x-6 items-center">
          {/* Zoom control */}
          <div className="text-center">
            <div className="text-white text-sm mb-2 font-mono">Zoom</div>
            <input
              type="range"
              min="0.5"
              max="15"
              step="0.1"
              value={zoom}
              onChange={handleZoomChange}
              className="w-20 slider-horizontal"
            />
            <div className="text-gray-400 text-xs mt-1 font-mono">
              {zoom.toFixed(1)}
            </div>
          </div>

          {/* Poloidal speed control */}
          <div className="text-center">
            <div className="text-white text-sm mb-2 font-mono">Poloidalny</div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={poloidalSpeed}
              onChange={handlePoloidalSpeedChange}
              className="w-20 slider-horizontal"
            />
            <div className="text-gray-400 text-xs mt-1 font-mono">
              {poloidalSpeed.toFixed(2)}
            </div>
          </div>

          {/* Rotational speed control */}
          <div className="text-center">
            <div className="text-white text-sm mb-2 font-mono">Rotacyjny</div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={rotationalSpeed}
              onChange={handleRotationalSpeedChange}
              className="w-20 slider-horizontal"
            />
            <div className="text-gray-400 text-xs mt-1 font-mono">
              {rotationalSpeed.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Music Player - Desktop: top-right, Mobile: bottom-center */}
      <div className="absolute top-4 right-4 lg:block hidden bg-black bg-opacity-80 p-4 rounded-lg border border-gray-600">
        {/* Desktop Music Player */}
        <div className="text-center mb-3 min-w-[200px]">
          <div className="flex items-center justify-center mb-2">
            <Music size={16} className="text-white mr-2" />
            <span className="text-white text-sm font-mono">Now Playing</span>
          </div>
          <div className="text-white text-sm font-medium mb-1">
            {songs[currentSongIndex].title}
          </div>
          <div className="text-gray-400 text-xs">
            {songs[currentSongIndex].artist}
          </div>
        </div>
        
        {/* Music Controls */}
        <div className="flex items-center justify-center space-x-3">
          <button
            onClick={previousSong}
            className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
            title="Previous"
          >
            <SkipBack size={18} className="text-white" />
          </button>
          
          <button
            onClick={togglePlayPause}
            className="p-3 rounded-full bg-white hover:bg-gray-200 transition-colors"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause size={20} className="text-black" />
            ) : (
              <Play size={20} className="text-black ml-1" />
            )}
          </button>
          
          <button
            onClick={nextSong}
            className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
            title="Next"
          >
            <SkipForward size={18} className="text-white" />
          </button>
        </div>
      </div>

      {/* Mobile Music Player - Bottom */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 lg:hidden block bg-black bg-opacity-90 p-3 rounded-lg border border-gray-600 w-11/12 max-w-sm">
        <div className="text-center mb-2">
          <div className="flex items-center justify-center mb-1">
            <Music size={14} className="text-white mr-2" />
            <span className="text-white text-xs font-mono">Now Playing</span>
          </div>
          <div className="text-white text-sm font-medium mb-1 truncate">
            {songs[currentSongIndex].title}
          </div>
          <div className="text-gray-400 text-xs truncate">
            {songs[currentSongIndex].artist}
          </div>
        </div>
        
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={previousSong}
            className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
            title="Previous"
          >
            <SkipBack size={16} className="text-white" />
          </button>
          
          <button
            onClick={togglePlayPause}
            className="p-2 rounded-full bg-white hover:bg-gray-200 transition-colors"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause size={18} className="text-black" />
            ) : (
              <Play size={18} className="text-black ml-0.5" />
            )}
          </button>
          
          <button
            onClick={nextSong}
            className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
            title="Next"
          >
            <SkipForward size={16} className="text-white" />
          </button>
        </div>
      </div>
      
      {/* Camera Orientation - Desktop */}
      <div className="absolute bottom-4 left-4 lg:block hidden text-white font-mono text-sm bg-black bg-opacity-70 p-3 rounded-lg">
        <div className="text-center">
          <div className="text-gray-400 text-xs mb-1 flex items-center justify-center">
            Camera
            {(isAutoAnimating || isTransitioningToAuto) && (
              <span className="ml-2 text-green-400 text-xs animate-pulse">●</span>
            )}
            {colorSystemRef.current?.getBeatData()?.isBeating && (
              <span className="ml-2 text-red-400 text-xs">♪</span>
            )}
          </div>
          <div className="text-white text-xs">
            X: {(cameraRotation.x * 180 / Math.PI).toFixed(1)}°
          </div>
          <div className="text-white text-xs">
            Y: {(cameraRotation.y * 180 / Math.PI).toFixed(1)}°
          </div>
          {isTransitioningToAuto && (
            <div className="text-yellow-400 text-xs mt-1">Transitioning</div>
          )}
          {isAutoAnimating && (
            <div className="text-green-400 text-xs mt-1">Auto</div>
          )}
        </div>
      </div>

      {/* Camera Orientation - Mobile */}
      <div className="absolute bottom-4 left-4 lg:hidden block text-white font-mono text-xs bg-black bg-opacity-70 p-2 rounded-lg">
        <div className="text-center">
          <div className="text-gray-400 text-xs mb-1 flex items-center justify-center">
            Camera
            {(isAutoAnimating || isTransitioningToAuto) && (
              <span className="ml-1 text-green-400 text-xs animate-pulse">●</span>
            )}
            {colorSystemRef.current?.getBeatData()?.isBeating && (
              <span className="ml-1 text-red-400 text-xs">♪</span>
            )}
          </div>
          <div className="text-white text-xs">
            X: {(cameraRotation.x * 180 / Math.PI).toFixed(1)}°
          </div>
          <div className="text-white text-xs">
            Y: {(cameraRotation.y * 180 / Math.PI).toFixed(1)}°
          </div>
          {isTransitioningToAuto && (
            <div className="text-yellow-400 text-xs mt-1">Transitioning</div>
          )}
          {isAutoAnimating && (
            <div className="text-green-400 text-xs mt-1">Auto</div>
          )}
        </div>
      </div>

      <style jsx>{`
        .slider-horizontal {
          -webkit-appearance: none;
          appearance: none;
          background: #4B5563;
          outline: none;
          border-radius: 5px;
          height: 6px;
        }
        .slider-horizontal::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: 2px solid #000;
        }
        .slider-horizontal::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: 2px solid #000;
        }
      `}</style>
    </div>
  );
};

export default AnimatedTorus;