import { useRef, useEffect, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { Hands, Results } from "@mediapipe/hands";
import { SelfieSegmentation } from "@mediapipe/selfie_segmentation";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { HAND_CONNECTIONS } from "@mediapipe/hands";
import { motion, AnimatePresence } from "motion/react";
import { Zap, X } from "lucide-react";
import { cn } from "../lib/utils";

type CharacterMode = "gojo" | "sukuna";
type Gesture = "NEUTRAL" | "GOJO_OPEN" | "GOJO_CROSS" | "SUKUNA_FIST" | "SUKUNA_CLAW" | "SUKUNA_DOMAIN_SIGN" | "INDEX_ONLY";

export function VisionEngine({ onClose }: { onClose: () => void }) {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [character, setCharacter] = useState<CharacterMode>("gojo");
  const [isDomainActive, setIsDomainActive] = useState(false);
  const [cursedEnergy, setCursedEnergy] = useState(0);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [debugLandmarks, setDebugLandmarks] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<"WAITING" | "STREAMING" | "ERROR">("WAITING");
  
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationTarget, setCalibrationTarget] = useState<Gesture | null>(null);
  
  const segmentationRef = useRef<any>(null);
  const segmentationMaskRef = useRef<HTMLCanvasElement | null>(null);
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const characterRef = useRef<CharacterMode>("gojo");
  const isDomainActiveRef = useRef(false);
  const domainStartTimeRef = useRef(0);
  const cursedEnergyRef = useRef(0);
  const calibratedGesturesRef = useRef<Record<string, number[]>>({});
  const handsDataRef = useRef<Map<number, { lastPos: { x: number; y: number }; lastTime: number }>>(new Map());
  const gestureBufferRef = useRef<Map<number, Gesture[]>>(new Map());
  const particlesRef = useRef<any[]>([]);
  const trailsRef = useRef<{ x: number; y: number; color: string; time: number }[]>([]);
  const sfxRef = useRef<{ x: number; y: number; text: string; alpha: number; time: number }[]>([]);
  const blackFlashEffectRef = useRef<{ active: boolean; time: number }>({ active: false, time: 0 });
  const blackFlashFiresRef = useRef<any[]>([]);
  const blackFlashLightningRef = useRef<any[]>([]);
  const techniqueStateRef = useRef<{ red: any; blue: any; purple: any }>({ red: null, blue: null, purple: null });
  const purpleBlastRef = useRef<{ active: boolean; x: number; y: number; startTime: number }>({ active: false, x: 0, y: 0, startTime: 0 });
  const cleaveSlashesRef = useRef<{ x1: number; y1: number; x2: number; y2: number; life: number; time: number }[]>([]);
  const gestureConfidenceRef = useRef<Record<string, number>>({});
  const domainShatterRef = useRef<{ active: boolean; time: number }>({ active: false, time: 0 });

  // Particle System Logic
  const createParticles = (x: number, y: number, color: string, count = 5) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15,
        life: 1.0,
        decay: 0.02 + Math.random() * 0.03,
        color,
        size: 2 + Math.random() * 5
      });
    }
    if (particlesRef.current.length > 200) particlesRef.current.shift();
  };

  const createBlackFlashFire = (x: number, y: number) => {
    for (let i = 0; i < 35; i++) {
      blackFlashFiresRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 40,
        vy: (Math.random() - 0.5) * 40 - 20,
        life: 1.0,
        decay: 0.01 + Math.random() * 0.02,
        size: 20 + Math.random() * 40,
        color: Math.random() > 0.15 ? "#00f2ff" : "#000000"
      });
    }
    
    // Add lightning bolts
    for (let i = 0; i < 5; i++) {
      blackFlashLightningRef.current.push({
        x, y,
        life: 1.0,
        decay: 0.05 + Math.random() * 0.08,
        color: Math.random() > 0.5 ? "#00f2ff" : "#ffffff",
        points: Array.from({ length: 8 }, () => ({
          dx: (Math.random() - 0.5) * 150,
          dy: (Math.random() - 0.5) * 150
        }))
      });
    }

    if (blackFlashFiresRef.current.length > 300) blackFlashFiresRef.current.splice(0, 50);
    if (blackFlashLightningRef.current.length > 50) blackFlashLightningRef.current.shift();
  };

  // Sync refs with state
  useEffect(() => {
    characterRef.current = character;
  }, [character]);

  useEffect(() => {
    isDomainActiveRef.current = isDomainActive;
  }, [isDomainActive]);

  // Calibration Logic: Capture current hand landmarks as baseline for a gesture
  const calibrateGesture = (landmarks: any, label: Gesture) => {
    const wrist = landmarks[0];
    const tips = [4, 8, 12, 16, 20];
    const dists = tips.map(tipIdx => {
      const tip = landmarks[tipIdx];
      return Math.sqrt(Math.pow(tip.x - wrist.x, 2) + Math.pow(tip.y - wrist.y, 2));
    });
    calibratedGesturesRef.current[label] = dists;
    console.log(`Calibrated ${label}:`, dists);
  };

  // Gesture Recognition Logic (Normalized Distance for Precision)
  const recognizeGesture = (landmarks: any): { label: Gesture; conf: number } => {
    const wrist = landmarks[0];
    const tips = [4, 8, 12, 16, 20];
    const mcps = [1, 5, 9, 13, 17];
    
    // Calculate normalized distances from wrist to tips (3D)
    const dists = tips.map(tipIdx => {
      const tip = landmarks[tipIdx];
      return Math.sqrt(
        Math.pow(tip.x - wrist.x, 2) + 
        Math.pow(tip.y - wrist.y, 2) +
        Math.pow(tip.z - wrist.z, 2)
      );
    });

    // Calculate normalized distances from wrist to MCPs (3D)
    const baseDists = mcps.map(mcpIdx => {
      const mcp = landmarks[mcpIdx];
      return Math.sqrt(
        Math.pow(mcp.x - wrist.x, 2) + 
        Math.pow(mcp.y - wrist.y, 2) +
        Math.pow(mcp.z - wrist.z, 2)
      );
    });

    // Calculate distances from wrist to tips
    const tipDists = tips.map(idx => {
      const p = landmarks[idx];
      return Math.sqrt(Math.pow(p.x - wrist.x, 2) + Math.pow(p.y - wrist.y, 2));
    });

    const avgTipDist = tipDists.reduce((a, b) => a + b, 0) / 5;

    // Helper to check if a finger is extended
    const isExtended = (tipIdx: number, mcpIdx: number) => {
      const tip = landmarks[tipIdx];
      const mcp = landmarks[mcpIdx];
      const wrist = landmarks[0];
      const tipDist = Math.sqrt(Math.pow(tip.x - wrist.x, 2) + Math.pow(tip.y - wrist.y, 2));
      const mcpDist = Math.sqrt(Math.pow(mcp.x - wrist.x, 2) + Math.pow(mcp.y - wrist.y, 2));
      // Extreme precision: must be significantly further than MCP
      return tipDist > mcpDist * 1.5; 
    };

    // Helper to check if a finger is curled
    const isCurled = (tipIdx: number, mcpIdx: number) => {
      const tip = landmarks[tipIdx];
      const mcp = landmarks[mcpIdx];
      const wrist = landmarks[0];
      const tipDist = Math.sqrt(Math.pow(tip.x - wrist.x, 2) + Math.pow(tip.y - wrist.y, 2));
      const mcpDist = Math.sqrt(Math.pow(mcp.x - wrist.x, 2) + Math.pow(mcp.y - wrist.y, 2));
      // Extreme precision: must be closer to wrist than MCP
      return tipDist < mcpDist * 0.85;
    };

    const indexExt = isExtended(8, 5);
    const middleExt = isExtended(12, 9);
    const ringExt = isExtended(16, 13);
    const pinkyExt = isExtended(20, 17);
    
    const indexCurled = isCurled(8, 5);
    const middleCurled = isCurled(12, 9);
    const ringCurled = isCurled(16, 13);
    const pinkyCurled = isCurled(20, 17);

    // Gojo Open (Switch to Gojo)
    if (indexExt && middleExt && ringExt && pinkyExt) {
      return { label: "GOJO_OPEN", conf: 0.99 };
    }

    // Gojo Cross (Signature Domain Sign) - Image 1
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const indexMiddleDist = Math.sqrt(
      Math.pow(indexTip.x - middleTip.x, 2) + 
      Math.pow(indexTip.y - middleTip.y, 2)
    );
    
    // Extreme Precision: Index and Middle extended AND crossed/touching, others strictly curled.
    // Explicitly ensure middle is NOT curled for the cross.
    if (indexMiddleDist < 0.08 && indexExt && middleExt && !middleCurled && ringCurled && pinkyCurled) {
      return { label: "GOJO_CROSS", conf: 0.99 };
    }

    // Sukuna Fist (Part of Double Fist Trigger)
    // All fingers strictly curled
    if (indexCurled && middleCurled && ringCurled && pinkyCurled) {
      return { label: "SUKUNA_FIST", conf: 0.99 };
    }

    // Index Only (Red/Blue) - Image 2
    // Extreme Precision: Index extended, Middle/Ring/Pinky strictly curled
    // Explicitly ensure middle is NOT extended for Red/Blue.
    if (indexExt && middleCurled && !middleExt && ringCurled && pinkyCurled) {
      return { label: "INDEX_ONLY", conf: 0.99 };
    }

    return { label: "NEUTRAL", conf: 0.5 };
  };

  const onResults = useCallback((results: Results) => {
    const video = webcamRef.current?.video;
    if (!video) return;
    const { videoWidth, videoHeight } = video;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      setDebugLandmarks(true);
      
      const currentLandmarks: any[] = [];
      const now = performance.now();
      let leftHand: any = null;
      let rightHand: any = null;
      
      results.multiHandLandmarks.forEach((landmarks, handIdx) => {
        const handedness = results.multiHandedness[handIdx].label; // "Left" or "Right"
        const { label, conf } = recognizeGesture(landmarks);
        
        // Update gesture buffer for this hand
        if (!gestureBufferRef.current.has(handIdx)) gestureBufferRef.current.set(handIdx, []);
        const buffer = gestureBufferRef.current.get(handIdx)!;
        buffer.push(label);
        
        if (buffer.length > 5) buffer.shift();
        
        const mostFrequent = buffer.reduce((acc, curr) => {
          acc[curr] = (acc[curr] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const confirmed = Object.entries(mostFrequent).sort((a, b) => b[1] - a[1])[0][0] as Gesture;

        // Precision Learning: Increase confidence for held gestures
        if (confirmed !== "NEUTRAL") {
          gestureConfidenceRef.current[confirmed] = Math.min(1, (gestureConfidenceRef.current[confirmed] || 0) + 0.2);
        } else {
          Object.keys(gestureConfidenceRef.current).forEach(k => gestureConfidenceRef.current[k] *= 0.7);
        }

        // Character Switching Logic - Global
        if (confirmed === "GOJO_OPEN") setCharacter("gojo");

        // Store hand data for technique logic
        if (handedness === "Left") leftHand = { landmarks, gesture: confirmed };
        else rightHand = { landmarks, gesture: confirmed };

        const wrist = landmarks[0];
        
        if (!handsDataRef.current.has(handIdx)) {
          handsDataRef.current.set(handIdx, { lastPos: { x: wrist.x, y: wrist.y }, lastTime: now });
        }
        
        const handData = handsDataRef.current.get(handIdx)!;
        const dx = (wrist.x - handData.lastPos.x);
        const dy = (wrist.y - handData.lastPos.y);
        const dt = (now - handData.lastTime) / 1000;
        const speed = dt > 0 ? Math.sqrt(dx * dx + dy * dy) / dt * 1000 : 0;

        // Handle Calibration
        if (isCalibrating && calibrationTarget) {
          calibrateGesture(landmarks, calibrationTarget);
          setIsCalibrating(false);
          setCalibrationTarget(null);
        }

        // Cursed Energy Gain
        if (!isDomainActiveRef.current) {
          const ceGain = 2.0 + (speed > 500 ? 5.0 : 0); // Fast energy gain
          cursedEnergyRef.current = Math.min(100, cursedEnergyRef.current + ceGain);
          setCursedEnergy(cursedEnergyRef.current);
        }

        if (confirmed === "GOJO_CROSS" && !isDomainActiveRef.current) {
          const currentConf = gestureConfidenceRef.current[confirmed] || 0;
          if (currentConf > 0.4) {
            setIsDomainActive(true);
            isDomainActiveRef.current = true;
            domainStartTimeRef.current = now;
            domainShatterRef.current = { active: true, time: now };
            cursedEnergyRef.current = 0;
            setCursedEnergy(0);

            // Domain Trigger SFX
            sfxRef.current.push({
              x: videoWidth / 2,
              y: videoHeight / 2,
              text: "領域展開: 無量空処",
              alpha: 1,
              time: now
            });

            setTimeout(() => {
              setIsDomainActive(false);
              isDomainActiveRef.current = false;
            }, 8000);
          } else if (currentConf > 0.6 && cursedEnergyRef.current < 100) {
            // Feedback for low energy
            if (!sfxRef.current.some(s => s.text === "LOW CURSED ENERGY")) {
              sfxRef.current.push({
                x: videoWidth / 2,
                y: videoHeight / 2,
                text: "LOW CURSED ENERGY",
                alpha: 1,
                time: now
              });
            }
          }
        }

        if (dt > 0) {
          // Black Flash Trigger - Requires Fist Gesture + High Speed
          if (speed > 800 && confirmed === "SUKUNA_FIST" && !isDomainActiveRef.current && !blackFlashEffectRef.current.active) {
            blackFlashEffectRef.current = { active: true, time: now };
            setTimeout(() => { blackFlashEffectRef.current.active = false; }, 500);
            createBlackFlashFire(wrist.x, wrist.y);
            
            sfxRef.current.push({
              x: videoWidth / 2,
              y: videoHeight / 2,
              text: "黒閃 (BLACK FLASH)",
              alpha: 1,
              time: now
            });
          }

          // Continuous Fire for Fists
          if (confirmed === "SUKUNA_FIST") {
            createBlackFlashFire(wrist.x, wrist.y);
            [4, 8, 12, 16, 20].forEach(idx => {
              createBlackFlashFire(landmarks[idx].x, landmarks[idx].y);
            });
          }

          const themeColor = characterRef.current === "gojo" ? "#00d7ff" : "#ff3232";
          
          // Add trail points
          trailsRef.current.push({ x: wrist.x, y: wrist.y, color: themeColor, time: now });
          if (trailsRef.current.length > 50) trailsRef.current.shift();

          // Trigger Manga SFX
          if (speed > 1200 && confirmed !== "NEUTRAL" && Math.random() > 0.7) {
            const sfxList = characterRef.current === "gojo" ? ["ゴゴゴ", "ドドド", "シュッ"] : ["ザシュ", "ギギギ", "ドカッ"];
            sfxRef.current.push({
              x: wrist.x * videoWidth,
              y: wrist.y * videoHeight,
              text: sfxList[Math.floor(Math.random() * sfxList.length)],
              alpha: 1,
              time: now
            });

            // Add Cleave/Dismantle Slashes for Sukuna
            if (characterRef.current === "sukuna") {
              const angle = Math.random() * Math.PI * 2;
              const len = 0.2 + Math.random() * 0.3;
              cleaveSlashesRef.current.push({
                x1: wrist.x,
                y1: wrist.y,
                x2: wrist.x + Math.cos(angle) * len,
                y2: wrist.y + Math.sin(angle) * len,
                life: 1.0,
                time: now
              });
            }
          }

          [4, 8, 12, 16, 20].forEach(idx => {
            createParticles(landmarks[idx].x, landmarks[idx].y, themeColor, 2);
          });
        }
        
        handData.lastPos = { x: wrist.x, y: wrist.y };
        handData.lastTime = now;
        currentLandmarks.push(landmarks);
      });

      // Technique Logic: Red, Blue, Purple & Sukuna Two-Hand Domain
      let redPos = null;
      let bluePos = null;
      let purplePos = null;

      // 1. Left Index -> Red, Right Index -> Blue
      if (leftHand && leftHand.gesture === "INDEX_ONLY") {
        redPos = leftHand.landmarks[8]; // Index tip
      }
      if (rightHand && rightHand.gesture === "INDEX_ONLY") {
        bluePos = rightHand.landmarks[8];
      }

      // 2. Join Index Tips -> Purple
      if (leftHand && rightHand && leftHand.gesture === "INDEX_ONLY" && rightHand.gesture === "INDEX_ONLY") {
        const leftTip = leftHand.landmarks[8];
        const rightTip = rightHand.landmarks[8];
        const tipDist = Math.sqrt(Math.pow(leftTip.x - rightTip.x, 2) + Math.pow(leftTip.y - rightTip.y, 2));
        
        if (tipDist < 0.08) {
          purplePos = { x: (leftTip.x + rightTip.x) / 2, y: (leftTip.y + rightTip.y) / 2 };
          if (!purpleBlastRef.current.active) {
            purpleBlastRef.current = { active: true, x: purplePos.x, y: purplePos.y, startTime: now };
            setTimeout(() => { purpleBlastRef.current.active = false; }, 1500);
          }
          redPos = null;
          bluePos = null;
        }
      }

      // 3. Double Fist -> Sukuna Domain
      if (leftHand && rightHand && !isDomainActiveRef.current) {
        const leftPalm = leftHand.landmarks[9];
        const rightPalm = rightHand.landmarks[9];
        
        const palmDist = Math.sqrt(Math.pow(leftPalm.x - rightPalm.x, 2) + Math.pow(leftPalm.y - rightPalm.y, 2));

        // Sukuna Trigger: Both hands must be in a fist and touching/very close
        const isDoubleFist = leftHand.gesture === "SUKUNA_FIST" && 
                             rightHand.gesture === "SUKUNA_FIST" && 
                             palmDist < 0.15;

        if (isDoubleFist) {
          // Trigger Sukuna Domain instantly
          setIsDomainActive(true);
          isDomainActiveRef.current = true;
          domainStartTimeRef.current = now;
          domainShatterRef.current = { active: true, time: now };
          cursedEnergyRef.current = 0;
          setCursedEnergy(0);
          setCharacter("sukuna");

          sfxRef.current.push({
            x: videoWidth / 2,
            y: videoHeight / 2,
            text: "領域展開: 伏魔御廚子",
            alpha: 1,
            time: now
          });

          setTimeout(() => {
            setIsDomainActive(false);
            isDomainActiveRef.current = false;
          }, 8000);
        }
      }

      techniqueStateRef.current = { red: redPos, blue: bluePos, purple: purplePos };

      (window as any)._allLandmarks = currentLandmarks;
    } else {
      setDebugLandmarks(false);
      (window as any)._allLandmarks = [];
      techniqueStateRef.current = { red: null, blue: null, purple: null };
    }
  }, []);

  useEffect(() => {
    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults(onResults);

    const selfieSegmentation = new SelfieSegmentation({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
    });

    selfieSegmentation.setOptions({
      modelSelection: 1,
    });

    selfieSegmentation.onResults((results) => {
      segmentationMaskRef.current = results.segmentationMask as any;
    });

    segmentationRef.current = selfieSegmentation;

    let isRunning = true;
    const renderLoop = () => {
      if (!isRunning) return;
      
      const video = webcamRef.current?.video;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === 4) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const { videoWidth, videoHeight } = video;
          if (canvas.width !== videoWidth) canvas.width = videoWidth;
          if (canvas.height !== videoHeight) canvas.height = videoHeight;

          const time = performance.now() / 1000;

          // 1. Background Layer
          if (isDomainActiveRef.current) {
            const domainElapsed = (performance.now() - domainStartTimeRef.current) / 1000;
            
            ctx.save();
            if (characterRef.current === "gojo") {
              // --- UNLIMITED VOID: COSMIC HORROR ---
              ctx.fillStyle = "#000";
              ctx.fillRect(0, 0, videoWidth, videoHeight);
              
              // Infinite Stars Depth
              for (let i = 0; i < 3; i++) {
                ctx.save();
                ctx.translate(videoWidth/2, videoHeight/2);
                ctx.scale(1 + i * 0.5 + domainElapsed * 0.2, 1 + i * 0.5 + domainElapsed * 0.2);
                ctx.rotate(time * (0.05 + i * 0.02));
                
                ctx.fillStyle = `rgba(255, 255, 255, ${0.8 / (i + 1)})`;
                for (let j = 0; j < 50; j++) {
                  const x = (Math.sin(j * 13.5) * videoWidth * 0.8);
                  const y = (Math.cos(j * 17.2) * videoHeight * 0.8);
                  ctx.beginPath();
                  ctx.arc(x, y, 1, 0, Math.PI * 2);
                  ctx.fill();
                }
                ctx.restore();
              }

              // The "Infinite Eye" or Brain Structure
              ctx.save();
              ctx.globalAlpha = Math.min(1, domainElapsed);
              const eyeGrad = ctx.createRadialGradient(videoWidth/2, videoHeight/2, 0, videoWidth/2, videoHeight/2, videoWidth * 0.6);
              eyeGrad.addColorStop(0, "rgba(255, 255, 255, 0.9)");
              eyeGrad.addColorStop(0.1, "rgba(0, 200, 255, 0.4)");
              eyeGrad.addColorStop(0.4, "rgba(0, 0, 50, 0.8)");
              eyeGrad.addColorStop(1, "black");
              ctx.fillStyle = eyeGrad;
              ctx.beginPath();
              ctx.ellipse(videoWidth/2, videoHeight/2, videoWidth * 0.5, videoHeight * 0.4, time * 0.1, 0, Math.PI * 2);
              ctx.fill();
              
              // Neural Pathways (Flickering Lines)
              ctx.strokeStyle = "rgba(0, 255, 255, 0.2)";
              ctx.lineWidth = 1;
              for (let i = 0; i < 20; i++) {
                ctx.beginPath();
                ctx.moveTo(videoWidth/2, videoHeight/2);
                const angle = (i / 20) * Math.PI * 2 + time * 0.2;
                const len = videoWidth * (0.5 + Math.sin(time * 2 + i) * 0.1);
                ctx.lineTo(videoWidth/2 + Math.cos(angle) * len, videoHeight/2 + Math.sin(angle) * len);
                ctx.stroke();
              }
              ctx.restore();

            } else {
              // --- MALEVOLENT SHRINE: HELLISH LANDSCAPE ---
              ctx.fillStyle = "#1a0000";
              ctx.fillRect(0, 0, videoWidth, videoHeight);
              
              // Blood Sky Gradient
              const skyGrad = ctx.createLinearGradient(0, 0, 0, videoHeight);
              skyGrad.addColorStop(0, "#4a0000");
              skyGrad.addColorStop(0.5, "#1a0000");
              skyGrad.addColorStop(1, "#000");
              ctx.fillStyle = skyGrad;
              ctx.fillRect(0, 0, videoWidth, videoHeight);

              // The Shrine (Detailed Silhouette)
              ctx.save();
              ctx.translate(videoWidth/2, videoHeight * 0.8);
              const pulse = 1 + Math.sin(time * 2) * 0.03;
              ctx.scale(pulse, pulse);
              
              // Screen Shake during Domain
              const shakeX = (Math.random() - 0.5) * 12;
              const shakeY = (Math.random() - 0.5) * 12;
              ctx.translate(shakeX, shakeY);

              // Blood Pool Floor
              ctx.save();
              ctx.translate(0, 20);
              const bloodGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, videoWidth * 0.5);
              bloodGrad.addColorStop(0, "rgba(100, 0, 0, 0.8)");
              bloodGrad.addColorStop(1, "transparent");
              ctx.fillStyle = bloodGrad;
              ctx.beginPath();
              ctx.ellipse(0, 0, videoWidth * 0.6, 40, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();

              ctx.fillStyle = "#000";
              // Base
              ctx.fillRect(-videoWidth * 0.35, -20, videoWidth * 0.7, 20);
              
              // Pile of Skulls (More detailed)
              for (let i = 0; i < 25; i++) {
                const sx = -videoWidth * 0.3 + (i * 13.7) % (videoWidth * 0.6);
                const sy = -10 + Math.sin(i * 1.5) * 10;
                ctx.fillStyle = `rgb(${180 + Math.random() * 40}, ${180 + Math.random() * 40}, ${180 + Math.random() * 40})`;
                ctx.beginPath();
                ctx.arc(sx, sy, 7, 0, Math.PI * 2);
                ctx.fill();
                // Eye sockets
                ctx.fillStyle = "#000";
                ctx.beginPath();
                ctx.arc(sx - 2, sy - 1, 2, 0, Math.PI * 2);
                ctx.arc(sx + 2, sy - 1, 2, 0, Math.PI * 2);
                ctx.fill();
              }

              // Cursed Veins (Pulsing)
              ctx.strokeStyle = `rgba(255, 0, 0, ${0.3 + Math.sin(time * 4) * 0.2})`;
              ctx.lineWidth = 2;
              for (let i = 0; i < 8; i++) {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                const angle = (i / 8) * Math.PI * 2 + time * 0.5;
                ctx.bezierCurveTo(
                  Math.cos(angle) * 100, Math.sin(angle) * 100,
                  Math.cos(angle + 0.5) * 200, Math.sin(angle - 0.5) * 200,
                  Math.cos(angle) * 300, Math.sin(angle) * 300
                );
                ctx.stroke();
              }

              // Main Structure
              ctx.fillStyle = "#000";
              ctx.beginPath();
              ctx.moveTo(-videoWidth * 0.2, -20);
              ctx.lineTo(-videoWidth * 0.15, -videoHeight * 0.5);
              ctx.lineTo(videoWidth * 0.15, -videoHeight * 0.5);
              ctx.lineTo(videoWidth * 0.2, -20);
              ctx.fill();
              
              // Roof Curves (Triple Tiered)
              for (let tier = 0; tier < 3; tier++) {
                const yOffset = tier * 50;
                const widthScale = 1 - tier * 0.15;
                ctx.beginPath();
                ctx.moveTo(-videoWidth * 0.32 * widthScale, -videoHeight * 0.4 + yOffset);
                ctx.quadraticCurveTo(0, -videoHeight * 0.55 + yOffset, videoWidth * 0.32 * widthScale, -videoHeight * 0.4 + yOffset);
                ctx.lineTo(videoWidth * 0.32 * widthScale, -videoHeight * 0.37 + yOffset);
                ctx.quadraticCurveTo(0, -videoHeight * 0.52 + yOffset, -videoWidth * 0.32 * widthScale, -videoHeight * 0.37 + yOffset);
                ctx.fill();
              }

              // Teeth/Mouth Motif (Animated)
              ctx.fillStyle = `rgb(${80 + Math.sin(time * 5) * 20}, 0, 0)`;
              for (let i = 0; i < 14; i++) {
                const x = -videoWidth * 0.18 + (i / 13) * videoWidth * 0.36;
                const toothLen = videoHeight * 0.18 + Math.sin(time * 3 + i) * 10;
                ctx.beginPath();
                ctx.moveTo(x - 6, -20);
                ctx.lineTo(x, -toothLen);
                ctx.lineTo(x + 6, -20);
                ctx.fill();
              }
              ctx.restore();

              // Red Lightning
              if (Math.random() > 0.8) {
                ctx.strokeStyle = "#ff0000";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(Math.random() * videoWidth, 0);
                for (let i = 0; i < 5; i++) {
                  ctx.lineTo(Math.random() * videoWidth, (i + 1) * (videoHeight / 5));
                }
                ctx.stroke();
              }

              // Fuga (Fire Arrow) Rare Effect
              if (domainElapsed > 5 && domainElapsed < 7.5) {
                ctx.save();
                ctx.translate(videoWidth/2, videoHeight/2);
                ctx.rotate(Math.PI / 2);
                const fireGrad = ctx.createLinearGradient(0, 0, 600, 0);
                fireGrad.addColorStop(0, "white");
                fireGrad.addColorStop(0.1, "#ff0");
                fireGrad.addColorStop(0.3, "#f80");
                fireGrad.addColorStop(0.6, "#f00");
                fireGrad.addColorStop(1, "transparent");
                ctx.fillStyle = fireGrad;
                ctx.fillRect(0, -15, 600, 30);
                
                // Manga SFX for Fuga
                ctx.font = "italic 900 100px 'Inter'";
                ctx.fillStyle = "white";
                ctx.strokeStyle = "red";
                ctx.lineWidth = 5;
                ctx.strokeText("■ 開 (FUGA)", 0, -100);
                ctx.fillText("■ 開 (FUGA)", 0, -100);
                
                ctx.restore();
              }

              // Cleave/Dismantle Slashes (More intense)
              if (Math.random() > 0.3) {
                ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
                ctx.lineWidth = 5;
                ctx.shadowBlur = 25;
                ctx.shadowColor = "white";
                for (let i = 0; i < 12; i++) {
                  const x1 = Math.random() * videoWidth;
                  const y1 = Math.random() * videoHeight;
                  const angle = Math.random() * Math.PI * 2;
                  const len = 500 + Math.random() * 1000;
                  ctx.beginPath();
                  ctx.moveTo(x1, y1);
                  ctx.lineTo(x1 + Math.cos(angle) * len, y1 + Math.sin(angle) * len);
                  ctx.stroke();
                }
                ctx.shadowBlur = 0;
              }

              // Blood Rain (Faster, more intense)
              ctx.strokeStyle = "rgba(150, 0, 0, 0.6)";
              ctx.lineWidth = 1.5;
              for (let i = 0; i < 100; i++) {
                const x = (i * 17.3) % videoWidth;
                const y = (i * 23.1 + time * 1500) % videoHeight;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x - 2, y + 20);
                ctx.stroke();
              }
            }
            ctx.restore();

            // --- DOMAIN TITLE CARD ---
            if (domainElapsed < 2.5) {
              ctx.save();
              ctx.font = "italic 900 80px 'Inter'";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              
              const text = characterRef.current === "gojo" ? "UNLIMITED VOID" : "MALEVOLENT SHRINE";
              const alpha = domainElapsed < 0.5 ? domainElapsed * 2 : (domainElapsed > 2 ? 1 - (domainElapsed - 2) * 2 : 1);
              
              // Shadow/Glow
              ctx.shadowBlur = 30;
              ctx.shadowColor = characterRef.current === "gojo" ? "#00d7ff" : "#ff0000";
              
              ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
              ctx.fillText(text, videoWidth / 2, videoHeight / 2);
              
              // Kanji Subtitle
              ctx.font = "italic 400 30px 'Inter'";
              const kanji = characterRef.current === "gojo" ? "無量空処" : "伏魔御廚子";
              ctx.fillText(kanji, videoWidth / 2, videoHeight / 2 + 60);
              ctx.restore();
            }

            // 2. Draw User (Segmented & Mirrored)
            ctx.save();
            ctx.translate(videoWidth, 0);
            ctx.scale(-1, 1);

            if (segmentationMaskRef.current) {
              if (!tempCanvasRef.current) tempCanvasRef.current = document.createElement("canvas");
              const tempCanvas = tempCanvasRef.current;
              if (tempCanvas.width !== videoWidth) tempCanvas.width = videoWidth;
              if (tempCanvas.height !== videoHeight) tempCanvas.height = videoHeight;
              
              const tempCtx = tempCanvas.getContext("2d");
              if (tempCtx) {
                tempCtx.clearRect(0, 0, videoWidth, videoHeight);
                tempCtx.drawImage(video, 0, 0, videoWidth, videoHeight);
                tempCtx.globalCompositeOperation = "destination-in";
                tempCtx.drawImage(segmentationMaskRef.current, 0, 0, videoWidth, videoHeight);
                tempCtx.globalCompositeOperation = "source-over";
                
                if (blackFlashEffectRef.current.active) {
                  ctx.filter = "contrast(4) invert(1) saturate(2) brightness(1.2)";
                  const shakeX = (Math.random() - 0.5) * 30;
                  const shakeY = (Math.random() - 0.5) * 30;
                  ctx.translate(shakeX, shakeY);
                } else {
                  // Domain Tint on User
                  ctx.filter = characterRef.current === "gojo" 
                    ? "saturate(0.1) brightness(0.6) sepia(0.3) hue-rotate(180deg)"
                    : "contrast(1.2) brightness(0.5) sepia(0.6) hue-rotate(-30deg)";
                }
                ctx.drawImage(tempCanvas, 0, 0, videoWidth, videoHeight);
              }
            }
            ctx.restore();
          } else {
            // Normal Background (Full Video)
            ctx.save();
            ctx.translate(videoWidth, 0);
            ctx.scale(-1, 1);
            
            if (blackFlashEffectRef.current.active) {
              ctx.filter = "contrast(4) invert(1) saturate(2) brightness(1.2)";
              const shakeX = (Math.random() - 0.5) * 30;
              const shakeY = (Math.random() - 0.5) * 30;
              ctx.translate(shakeX, shakeY);
            }
            
            ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
            ctx.restore();
          }

          ctx.filter = "none";

          // 3. Particles (On Top)
          particlesRef.current.forEach((p, i) => {
            p.x += p.vx / videoWidth;
            p.y += p.vy / videoHeight;
            p.life -= p.decay;
            if (p.life <= 0) {
              particlesRef.current.splice(i, 1);
              return;
            }
            ctx.save();
            ctx.translate(videoWidth, 0);
            ctx.scale(-1, 1);
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = p.color;
            ctx.beginPath();
            ctx.arc(p.x * videoWidth, p.y * videoHeight, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          });

          // 3.1 Cleave/Dismantle Slashes (Persistent)
          cleaveSlashesRef.current.forEach((s, i) => {
            s.life -= 0.05;
            if (s.life <= 0) {
              cleaveSlashesRef.current.splice(i, 1);
              return;
            }
            ctx.save();
            ctx.translate(videoWidth, 0);
            ctx.scale(-1, 1);
            ctx.strokeStyle = `rgba(255, 255, 255, ${s.life})`;
            ctx.lineWidth = 4 * s.life;
            ctx.shadowBlur = 15;
            ctx.shadowColor = "white";
            ctx.beginPath();
            ctx.moveTo(s.x1 * videoWidth, s.y1 * videoHeight);
            ctx.lineTo(s.x2 * videoWidth, s.y2 * videoHeight);
            ctx.stroke();
            ctx.restore();
          });

          // 3.2 Domain Shatter Effect
          if (domainShatterRef.current.active) {
            const shatterElapsed = (performance.now() - domainShatterRef.current.time) / 1000;
            if (shatterElapsed > 1.5) {
              domainShatterRef.current.active = false;
            } else {
              ctx.save();
              ctx.strokeStyle = "white";
              ctx.lineWidth = 2;
              ctx.globalAlpha = 1 - shatterElapsed;
              for (let i = 0; i < 20; i++) {
                const angle = (i / 20) * Math.PI * 2;
                const r = shatterElapsed * 1000;
                ctx.beginPath();
                ctx.moveTo(videoWidth/2, videoHeight/2);
                ctx.lineTo(videoWidth/2 + Math.cos(angle) * r, videoHeight/2 + Math.sin(angle) * r);
                ctx.stroke();
              }
              ctx.restore();
            }
          }

          // 3.5 Black Flash Fire Particles
          blackFlashFiresRef.current.forEach((p, i) => {
            p.x += p.vx / videoWidth;
            p.y += p.vy / videoHeight;
            p.life -= p.decay;
            if (p.life <= 0) {
              blackFlashFiresRef.current.splice(i, 1);
              return;
            }
            ctx.save();
            ctx.translate(videoWidth, 0);
            ctx.scale(-1, 1);
            
            // Black Flash Fire: Black core with neon blue glow
            const x = p.x * videoWidth;
            const y = p.y * videoHeight;
            
            // Outer Glow (Neon Blue) - Brighter and larger
            const grad = ctx.createRadialGradient(x, y, 0, x, y, p.size);
            grad.addColorStop(0, "rgba(0, 242, 255, 1)");
            grad.addColorStop(0.4, "rgba(0, 100, 255, 0.6)");
            grad.addColorStop(1, "transparent");
            
            ctx.globalAlpha = p.life;
            ctx.fillStyle = grad;
            ctx.shadowBlur = 20;
            ctx.shadowColor = "#00f2ff";
            ctx.beginPath();
            ctx.arc(x, y, p.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Black Core (Flickering) - More intense
            ctx.fillStyle = "black";
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(x, y, p.size * (0.3 + Math.random() * 0.2), 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
          });

          // 3.6 Black Flash Lightning Bolts
          blackFlashLightningRef.current.forEach((bolt, i) => {
            bolt.life -= bolt.decay;
            if (bolt.life <= 0) {
              blackFlashLightningRef.current.splice(i, 1);
              return;
            }
            ctx.save();
            ctx.translate(videoWidth, 0);
            ctx.scale(-1, 1);
            
            const x = bolt.x * videoWidth;
            const y = bolt.y * videoHeight;
            
            // High intensity lightning
            ctx.strokeStyle = bolt.color || "#00f2ff";
            ctx.lineWidth = 6 * bolt.life;
            ctx.shadowBlur = 30;
            ctx.shadowColor = bolt.color || "#00f2ff";
            
            ctx.beginPath();
            ctx.moveTo(x, y);
            let curX = x;
            let curY = y;
            bolt.points.forEach((p: any) => {
              // More jagged lightning
              const jitter = (Math.random() - 0.5) * 20;
              curX += p.dx * (1 - bolt.life) + jitter;
              curY += p.dy * (1 - bolt.life) + jitter;
              ctx.lineTo(curX, curY);
            });
            ctx.stroke();
            
            // Bright white core
            ctx.strokeStyle = "white";
            ctx.lineWidth = 2 * bolt.life;
            ctx.stroke();
            
            // Add secondary sparks
            if (Math.random() > 0.8) {
              ctx.beginPath();
              ctx.moveTo(curX, curY);
              ctx.lineTo(curX + (Math.random() - 0.5) * 50, curY + (Math.random() - 0.5) * 50);
              ctx.stroke();
            }
            
            ctx.restore();
          });

          // 3.7 Gojo Techniques: Red, Blue, Purple
          const { red, blue, purple } = techniqueStateRef.current;
          
          const drawEnergyBall = (pos: any, color: string, size: number, isPurple = false) => {
            if (!pos) return;
            ctx.save();
            ctx.translate(videoWidth, 0);
            ctx.scale(-1, 1);
            const x = pos.x * videoWidth;
            const y = pos.y * videoHeight;
            
            // Swirling effect
            const swirlCount = isPurple ? 24 : 12;
            for (let i = 0; i < swirlCount; i++) {
              const angle = time * 8 + (i / swirlCount) * Math.PI * 2;
              const radius = size * (0.9 + Math.sin(time * 15 + i) * 0.3);
              const px = x + Math.cos(angle) * radius * 0.6;
              const py = y + Math.sin(angle) * radius * 0.6;
              
              const grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
              grad.addColorStop(0, color);
              grad.addColorStop(0.6, "rgba(0,0,0,0)");
              
              ctx.fillStyle = grad;
              ctx.globalAlpha = 0.4;
              ctx.beginPath();
              ctx.arc(px, py, radius, 0, Math.PI * 2);
              ctx.fill();
            }
            
            // Outer Glow
            const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, size * 1.5);
            glowGrad.addColorStop(0, color);
            glowGrad.addColorStop(1, "transparent");
            ctx.fillStyle = glowGrad;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(x, y, size * 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.shadowBlur = size;
            ctx.shadowColor = color;
            const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, size * 0.7);
            coreGrad.addColorStop(0, "white");
            coreGrad.addColorStop(0.2, color);
            coreGrad.addColorStop(1, "transparent");
            ctx.fillStyle = coreGrad;
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.arc(x, y, size * 0.7, 0, Math.PI * 2);
            ctx.fill();
            
            // Distortion/Lightning for Purple
            if (isPurple) {
              ctx.shadowBlur = size * 2;
              ctx.strokeStyle = "white";
              ctx.lineWidth = 3;
              for (let i = 0; i < 6; i++) {
                ctx.beginPath();
                ctx.moveTo(x, y);
                let cx = x;
                let cy = y;
                for (let j = 0; j < 6; j++) {
                  cx += (Math.random() - 0.5) * size * 2.5;
                  cy += (Math.random() - 0.5) * size * 2.5;
                  ctx.lineTo(cx, cy);
                }
                ctx.stroke();
              }
              
              // Dark Void Core for Purple
              ctx.fillStyle = "black";
              ctx.globalAlpha = 0.9;
              ctx.shadowBlur = 0;
              ctx.beginPath();
              ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
              ctx.fill();
            }
            
            ctx.restore();
          };

          if (purple) {
            const purpleColor = characterRef.current === "sukuna" ? "#330000" : "#a000ff";
            drawEnergyBall(purple, purpleColor, 180, true);
            // Screen distortion for Purple
            if (Math.random() > 0.3) {
              ctx.save();
              ctx.filter = characterRef.current === "sukuna" ? "invert(1) contrast(2)" : "hue-rotate(270deg) contrast(2) brightness(1.5)";
              ctx.globalAlpha = 0.15;
              ctx.drawImage(canvas, (Math.random()-0.5)*40, (Math.random()-0.5)*40);
              ctx.restore();
            }
          } else {
            if (red) {
              const redColor = characterRef.current === "sukuna" ? "#ff0000" : "#ff003c";
              drawEnergyBall(red, redColor, 100);
            }
            if (blue) {
              const blueColor = characterRef.current === "sukuna" ? "#4a0000" : "#00d7ff";
              drawEnergyBall(blue, blueColor, 100);
            }
          }

          // 3.8 Purple Blast Effect
          const blast = purpleBlastRef.current;
          if (blast.active) {
            const elapsed = (performance.now() - blast.startTime) / 1000;
            const progress = Math.min(elapsed / 1.2, 1.0); // 1.2s duration
            
            ctx.save();
            ctx.translate(videoWidth, 0);
            ctx.scale(-1, 1);
            const bx = blast.x * videoWidth;
            const by = blast.y * videoHeight;
            
            // Expanding Shockwave
            const radius = progress * videoWidth * 2;
            const blastGrad = ctx.createRadialGradient(bx, by, radius * 0.4, bx, by, radius);
            blastGrad.addColorStop(0, "rgba(160, 0, 255, 0)");
            blastGrad.addColorStop(0.5, `rgba(160, 0, 255, ${0.9 * (1 - progress)})`);
            blastGrad.addColorStop(1, "rgba(160, 0, 255, 0)");
            
            ctx.fillStyle = blastGrad;
            ctx.beginPath();
            ctx.arc(bx, by, radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Screen Flash
            if (progress < 0.2) {
              ctx.fillStyle = `rgba(255, 255, 255, ${0.7 * (1 - progress / 0.2)})`;
              ctx.fillRect(0, 0, videoWidth, videoHeight);
            }
            
            // Particle debris from blast
            for (let i = 0; i < 5; i++) {
              const angle = Math.random() * Math.PI * 2;
              const dist = radius * 0.8;
              const px = bx + Math.cos(angle) * dist;
              const py = by + Math.sin(angle) * dist;
              ctx.fillStyle = "#a000ff";
              ctx.beginPath();
              ctx.arc(px, py, 5 * (1 - progress), 0, Math.PI * 2);
              ctx.fill();
            }
            
            ctx.restore();
          }

          // 4. Landmarks (On Top)
          const allLandmarks = (window as any)._allLandmarks;
          if (allLandmarks && allLandmarks.length > 0) {
            allLandmarks.forEach((landmarks: any) => {
              ctx.save();
              ctx.translate(videoWidth, 0);
              ctx.scale(-1, 1);
              const themeColor = characterRef.current === "gojo" ? "#00d7ff" : "#ff3232";
              
              // During Black Flash, landmarks glow red
              const finalColor = blackFlashEffectRef.current.active ? "#ff0000" : themeColor;
              drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: finalColor, lineWidth: 4 });
              drawLandmarks(ctx, landmarks, { color: "#ffffff", lineWidth: 1, radius: 5 });
              ctx.restore();
            });
          }

          // 5. Full Screen Impact Flash
          if (blackFlashEffectRef.current.active) {
            const age = (performance.now() - blackFlashEffectRef.current.time) / 500;
            if (age < 0.2) {
              ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * (1 - age * 5)})`;
              ctx.fillRect(0, 0, videoWidth, videoHeight);
            }
          }

          // 6. Cursed Energy Trails
          ctx.save();
          ctx.translate(videoWidth, 0);
          ctx.scale(-1, 1);
          trailsRef.current.forEach((p, i) => {
            const age = (performance.now() - p.time) / 1000;
            if (age > 0.5) return;
            ctx.globalAlpha = (1 - age * 2) * 0.5;
            ctx.shadowBlur = 15;
            ctx.shadowColor = p.color;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x * videoWidth, p.y * videoHeight, 8 * (1 - age * 2), 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.restore();

          // 7. Manga SFX
          ctx.save();
          ctx.translate(videoWidth, 0);
          ctx.scale(-1, 1);
          sfxRef.current.forEach((s, i) => {
            const age = (performance.now() - s.time) / 1000;
            if (age > 1.0) {
              sfxRef.current.splice(i, 1);
              return;
            }
            ctx.globalAlpha = 1 - age;
            ctx.font = `italic 900 ${40 + age * 40}px 'Inter'`;
            ctx.fillStyle = "white";
            ctx.strokeStyle = "black";
            ctx.lineWidth = 4;
            ctx.strokeText(s.text, s.x, s.y);
            ctx.fillText(s.text, s.x, s.y);
          });
          ctx.restore();
        }
      }
      requestAnimationFrame(renderLoop);
    };

    const processLoop = async () => {
      if (!isRunning) return;
      const video = webcamRef.current?.video;
      if (video && video.readyState === 4) {
        try { 
          await hands.send({ image: video }); 
          await selfieSegmentation.send({ image: video });
        } catch (err) {}
      }
      setTimeout(processLoop, 33);
    };

    renderLoop();
    processLoop();
    setIsCameraReady(true);

    return () => {
      isRunning = false;
      hands.close();
    };
  }, [onResults]);

  const handleUserMedia = () => {
    setCameraStatus("STREAMING");
  };

  const handleUserMediaError = () => {
    setCameraStatus("ERROR");
  };

  // Voice Recognition (Simplified)
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const text = event.results[event.results.length - 1][0].transcript.toLowerCase();
      console.log("Voice Command:", text);
      
      if (text.includes("domain expansion")) {
        setIsDomainActive(true);
        setTimeout(() => setIsDomainActive(false), 4000);
      } else if (text.includes("gojo")) {
        setCharacter("gojo");
      } else if (text.includes("sukuna")) {
        setCharacter("sukuna");
      }
    };

    recognition.start();
    return () => recognition.stop();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-black p-0"
    >
      {/* Header */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <button 
          onClick={onClose}
          className="rounded-full bg-rose-600 p-2 text-white transition-transform hover:scale-110 active:scale-95"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Viewport */}
      <div className="relative h-full w-full overflow-hidden bg-zinc-950">
        <Webcam
          ref={webcamRef}
          className="absolute inset-0 h-full w-full opacity-0 pointer-events-none"
          mirrored
          onUserMedia={handleUserMedia}
          onUserMediaError={handleUserMediaError}
          videoConstraints={{
            width: 1280,
            height: 720,
            facingMode: "user",
          }}
        />
        <canvas
          ref={canvasRef}
          className="h-full w-full object-cover"
        />

        {/* HUD Overlays */}
        <div className="pointer-events-none absolute inset-0">
          {/* Character HUD */}
          <div className="absolute top-4 left-4 flex flex-col gap-4 z-20 pointer-events-auto">
            <div className="bg-black/80 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${character === "gojo" ? "border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" : "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]"}`}>
                <span className="text-2xl font-bold text-white">{character === "gojo" ? "G" : "S"}</span>
              </div>
              <div>
                <h2 className="text-white font-bold text-lg uppercase tracking-tighter">{character === "gojo" ? "Satoru Gojo" : "Ryomen Sukuna"}</h2>
                <p className="text-white/60 text-xs font-mono uppercase tracking-widest">{isDomainActive ? "Domain Expansion Active" : "Neutral State"}</p>
              </div>
            </div>

            {/* Cursed Energy Meter */}
            <div className="w-64 h-4 bg-black/60 rounded-full border border-white/10 overflow-hidden relative">
              <motion.div 
                className={`h-full transition-all duration-300 ${character === "gojo" ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"}`}
                animate={{ width: `${cursedEnergy}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white uppercase tracking-widest">
                Cursed Energy: {Math.floor(cursedEnergy)}%
              </div>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setIsCalibrating(true);
                  setCalibrationTarget(character === "gojo" ? "GOJO_CROSS" : "SUKUNA_CLAW");
                }}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl text-white text-[10px] font-bold uppercase tracking-widest transition-all"
              >
                {isCalibrating ? `Calibrating ${calibrationTarget}...` : "Calibrate Precision"}
              </button>
            </div>
          </div>

          {/* Domain Expansion Overlay (Particles Only) */}
          <AnimatePresence>
            {isDomainActive && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex items-center justify-center overflow-hidden"
              >
                <div className="absolute inset-0">
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ 
                        x: Math.random() * window.innerWidth, 
                        y: Math.random() * window.innerHeight,
                        scale: 0,
                        opacity: 0 
                      }}
                      animate={{ 
                        scale: Math.random() * 2,
                        opacity: [0, 1, 0],
                        y: Math.random() * -500
                      }}
                      transition={{ 
                        duration: 2 + Math.random() * 2,
                        repeat: Infinity,
                        delay: Math.random() * 2
                      }}
                      className={cn(
                        "absolute h-2 w-2 rounded-full blur-sm",
                        character === "gojo" ? "bg-cyan-400" : "bg-rose-500"
                      )}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
