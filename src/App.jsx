import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Play, Pause, SkipBack, SkipForward, Music } from 'lucide-react';

const AnimatedTorus = () => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const torusRef = useRef(null);
  const animationRef = useRef(null);
  const cameraRef = useRef(null);
  const poloidalSpeedRef = useRef(0);
  const rotationalSpeedRef = useRef(0);
  
  // Mouse controls state
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [cameraRotation, setCameraRotation] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(5);
  const [poloidalSpeed, setPoloidalSpeed] = useState(0);
  const [rotationalSpeed, setRotationalSpeed] = useState(0);

  // Music player state (ADDED)
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const audioRef = useRef(null);

  // Get the base URL for production deployment (ADDED)
  const getAssetUrl = (filename) => {
    const base = import.meta.env.BASE_URL || '/';
    return `${base}${filename}`;
  };

  // Placeholder songs (ADDED)
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
      url: getAssetUrl("AUD-20241228-WA0003.mp3")
    },
    {
      title: "siaja", 
      artist: "Pronoia",
      url: getAssetUrl("AUD-20241228-WA0004.mp3")
    },
    {
      title: "ośem",
      artist: "Pronoia", 
      url: getAssetUrl("AUD-20241228-WA0005.mp3")
    }
  ];

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

  // Mouse event handlers
  const handleMouseDown = useCallback((event) => {
    setIsMouseDown(true);
    setMousePos({ x: event.clientX, y: event.clientY });
  }, []);

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

  // Touch event handlers
  const handleTouchStart = useCallback((event) => {
    event.preventDefault();
    const touch = event.touches[0];
    setIsMouseDown(true);
    setMousePos({ x: touch.clientX, y: touch.clientY });
  }, []);

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

  // Handle zoom change
  const handleZoomChange = useCallback((event) => {
    setZoom(parseFloat(event.target.value));
  }, []);

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

  // Music control functions (ADDED)
  const togglePlayPause = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(console.error);
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const nextSong = useCallback(() => {
    // Pause current song and reset play button
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    
    // Change to next song
    const nextIndex = (currentSongIndex + 1) % songs.length;
    setCurrentSongIndex(nextIndex);
  }, [currentSongIndex, songs.length]);

  const previousSong = useCallback(() => {
    // Pause current song and reset play button
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    
    // Change to previous song
    const prevIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    setCurrentSongIndex(prevIndex);
  }, [currentSongIndex, songs.length]);

  const handleSongEnd = useCallback(() => {
    nextSong();
  }, [nextSong]);

  useEffect(() => {
    // Inicjalizuj ref values
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

    // Torus geometry - zwiększam segmenty dla płynniejszej animacji
    const torusGeometry = new THREE.TorusGeometry(1, 0.4, 32, 100);
    
    // Zachowaj oryginalne pozycje wierzchołków
    const originalPositions = torusGeometry.attributes.position.array.slice();
    
    // Wykryj ekran dotykowy i dostosuj grubość linii
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const lineWidth = isTouchDevice ? 1 : 2; // Cieńsze linie na ekranach dotykowych
    
    // Wireframe material
    const torusMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      wireframeLinewidth: lineWidth
    });

    // Create torus mesh
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

      // WERSJA 15 rotacja + idealny ruch poloidalny
      if (torusRef.current) {
        const geometry = torusRef.current.geometry;
        const positions = geometry.attributes.position.array;
        
        for (let i = 0; i < positions.length; i += 3) {
          // Pobierz oryginalne pozycje
          const origX = originalPositions[i];
          const origY = originalPositions[i + 1];
          const origZ = originalPositions[i + 2];
          
          // WERSJA 15: Lekka rotacja wokół osi Z (przeciwny kierunek)
          const mainRadius = Math.sqrt(origX * origX + origY * origY);
          const rotationSpeed = -time * rotationalSpeedRef.current + mainRadius * 1.5; // minus dla przeciwnego kierunku
          const cosAngle = Math.cos(rotationSpeed);
          const sinAngle = Math.sin(rotationSpeed);
          
          // Ruch poloidalny w płaszczyźnie R-Z (zachowany idealny)
          const toroidalAngle = Math.atan2(origY, origX);
          
          const tubeCenter = 1.0;
          const tubeRadial = mainRadius - tubeCenter;
          const tubeVertical = origZ;
          
          const tubeRadius = Math.sqrt(tubeRadial * tubeRadial + tubeVertical * tubeVertical);
          const poloidalAngle = Math.atan2(tubeVertical, tubeRadial);
          
          const poloidalRotation = time * poloidalSpeedRef.current; // usuń fazowanie dla równomierności
          const newPoloidalAngle = poloidalAngle + poloidalRotation;
          
          const newTubeRadial = tubeRadius * Math.cos(newPoloidalAngle);
          const newTubeVertical = tubeRadius * Math.sin(newPoloidalAngle);
          const newMainRadius = tubeCenter + newTubeRadial;
          
          // Najpierw poloidalny, potem rotacja Z
          const poloidalX = newMainRadius * Math.cos(toroidalAngle);
          const poloidalY = newMainRadius * Math.sin(toroidalAngle);
          
          // Zastosuj lekkę rotację wokół osi Z
          const finalX = poloidalX * cosAngle - poloidalY * sinAngle;
          const finalY = poloidalX * sinAngle + poloidalY * cosAngle;
          
          positions[i] = finalX;              // X
          positions[i + 1] = finalY;          // Y  
          positions[i + 2] = newTubeVertical; // Z
        }
        
        geometry.attributes.position.needsUpdate = true;
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
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
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
      
      {/* Audio element (ADDED) */}
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

      {/* Music Player - Desktop: top-right, Mobile: bottom-center (ADDED) */}
      <div className="absolute top-4 right-4 lg:block hidden bg-black bg-opacity-80 p-4 rounded-lg border border-gray-600">
        {/* Desktop Music Player */}
        {/* Song Info */}
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

      {/* Mobile Music Player - Bottom (ADDED) */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 lg:hidden block bg-black bg-opacity-90 p-3 rounded-lg border border-gray-600 w-11/12 max-w-sm">
        {/* Mobile Song Info - Compact */}
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
        
        {/* Mobile Music Controls - Compact */}
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
          <div className="text-gray-400 text-xs mb-1">Camera</div>
          <div className="text-white text-xs">
            X: {(cameraRotation.x * 180 / Math.PI).toFixed(1)}°
          </div>
          <div className="text-white text-xs">
            Y: {(cameraRotation.y * 180 / Math.PI).toFixed(1)}°
          </div>
        </div>
      </div>

      {/* Camera Orientation - Mobile */}
      <div className="absolute top-4 left-4 lg:hidden block text-white font-mono text-xs bg-black bg-opacity-70 p-2 rounded-lg">
        <div className="text-center">
          <div className="text-gray-400 text-xs mb-1">Camera</div>
          <div className="text-white text-xs">
            X: {(cameraRotation.x * 180 / Math.PI).toFixed(1)}°
          </div>
          <div className="text-white text-xs">
            Y: {(cameraRotation.y * 180 / Math.PI).toFixed(1)}°
          </div>
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