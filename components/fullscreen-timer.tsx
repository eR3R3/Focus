"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, X, PictureInPicture } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaControls } from "@/components/media-controls";

type TimerMode = "default" | "chill";

interface FullscreenTimerProps {
  isVisible: boolean;
  mode: TimerMode;
  onModeChange: (mode: TimerMode) => void;
  waitSeconds: number;
  focusSeconds: number;
    remainingSeconds: number;
  isWaitPhase: boolean;
  isActive: boolean;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onCompleteEarly: () => void;
}

export function FullscreenTimer({
  isVisible,
  mode,
  onModeChange,
  waitSeconds,
  focusSeconds,
  remainingSeconds,
  isWaitPhase,
  isActive,
  onPause,
  onResume,
  onCancel,
  onCompleteEarly,
}: FullscreenTimerProps) {
  const [showModeSwitch, setShowModeSwitch] = useState(false);
  const [mouseTimeout, setMouseTimeout] = useState<NodeJS.Timeout | null>(null);
  const [background, setBackground] = useState<{ url: string; type: "gif" | "mp4" } | null>(null);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const pipCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipBackgroundImageRef = useRef<HTMLImageElement | null>(null);
  const pipBackgroundVideoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isVisible) return;

    const handleMouseMove = () => {
      setShowModeSwitch(true);
      if (mouseTimeout) {
        clearTimeout(mouseTimeout);
      }
      const timeout = setTimeout(() => {
        setShowModeSwitch(false);
      }, 3000);
      setMouseTimeout(timeout);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (mouseTimeout) {
        clearTimeout(mouseTimeout);
      }
    };
  }, [isVisible, mouseTimeout]);


  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Load background for PiP
  useEffect(() => {
    if (!background) return;

    if (background.type === "mp4") {
      if (!pipBackgroundVideoRef.current) {
        const video = document.createElement("video");
        video.crossOrigin = "anonymous"; // Enable CORS
        video.src = background.url;
        video.loop = true;
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
        video.style.display = "none";
        document.body.appendChild(video);
        pipBackgroundVideoRef.current = video;
        video.play().catch(console.error);
      } else {
        const video = pipBackgroundVideoRef.current;
        if (video.src !== background.url) {
          video.crossOrigin = "anonymous";
          video.src = background.url;
          video.load();
          video.play().catch(console.error);
        }
      }
    } else {
      if (!pipBackgroundImageRef.current) {
        const img = document.createElement("img");
        img.crossOrigin = "anonymous"; // Enable CORS
        img.src = background.url;
        img.style.display = "none";
        document.body.appendChild(img);
        pipBackgroundImageRef.current = img;
      } else {
        const img = pipBackgroundImageRef.current;
        if (img.src !== background.url) {
          img.crossOrigin = "anonymous";
          img.src = background.url;
        }
      }
    }
  }, [background]);

  // Picture-in-Picture functionality - Initialize canvas and video
  useEffect(() => {
    if (!pipVideoRef.current || !pipCanvasRef.current) return;

    const canvas = pipCanvasRef.current;
    const video = pipVideoRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Higher resolution for better quality (HD)
    const scale = 2; // 2x resolution for retina displays
    const baseWidth = 1280;
    const baseHeight = 720;
    
    // Initialize canvas size
    if (canvas.width !== baseWidth * scale || canvas.height !== baseHeight * scale) {
      canvas.width = baseWidth * scale;
      canvas.height = baseHeight * scale;
      ctx.scale(scale, scale);
    }

    // Set up video stream
    const stream = canvas.captureStream(30);
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    const updateCanvas = () => {
      if (!ctx || !canvas) return;

      const baseWidth = 1280;
      const baseHeight = 720;

      // Always start with black background to ensure origin-clean canvas
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, baseWidth, baseHeight);

      // Try to draw background, but catch errors if cross-origin
      try {
        if (background?.type === "mp4" && pipBackgroundVideoRef.current) {
          const bgVideo = pipBackgroundVideoRef.current;
          if (bgVideo.readyState >= 2 && bgVideo.videoWidth > 0) {
            ctx.drawImage(bgVideo, 0, 0, baseWidth, baseHeight);
          }
        } else if (background?.type === "gif" && pipBackgroundImageRef.current) {
          const bgImg = pipBackgroundImageRef.current;
          if (bgImg.complete && bgImg.naturalWidth > 0) {
            ctx.drawImage(bgImg, 0, 0, baseWidth, baseHeight);
          }
        }
      } catch (error) {
        // If cross-origin error, just use black background
        console.warn("Cannot draw background in PiP due to CORS:", error);
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, baseWidth, baseHeight);
      }

      // Add dark overlay for readability
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(0, 0, baseWidth, baseHeight);

      // Draw timer text
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 192px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const timeText = formatTime(remainingSeconds);
      ctx.fillText(timeText, baseWidth / 2, baseHeight / 2 - 40);

      // Draw mode label
      ctx.font = "64px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.fillText(isWaitPhase ? "WAIT" : "FOCUS", baseWidth / 2, baseHeight / 2 + 80);

      // Always continue updating when in PiP mode
      if (isPictureInPicture) {
        animationFrameRef.current = requestAnimationFrame(updateCanvas);
      }
    };

    // Start continuous update loop
    if (isPictureInPicture) {
      updateCanvas();
    } else {
      // Still update occasionally when not in PiP to keep stream alive
      const interval = setInterval(() => {
        updateCanvas();
      }, 1000);
      return () => {
        clearInterval(interval);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [remainingSeconds, isWaitPhase, isPictureInPicture, background]);

  const handlePictureInPicture = async () => {
    if (!pipVideoRef.current || !pipCanvasRef.current) {
      console.error("PiP refs not available");
      return;
    }

    try {
      if (document.pictureInPictureElement) {
        // Exit PiP
        await document.exitPictureInPicture();
        setIsPictureInPicture(false);
      } else {
        // Enter PiP
        const video = pipVideoRef.current;
        const canvas = pipCanvasRef.current;
        
        // Ensure canvas has content and proper size
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const baseWidth = 1280;
          const baseHeight = 720;
          const scale = 2;
          
          if (canvas.width !== baseWidth * scale || canvas.height !== baseHeight * scale) {
            canvas.width = baseWidth * scale;
            canvas.height = baseHeight * scale;
            ctx.scale(scale, scale);
          }
          
          // Draw initial frame
          ctx.fillStyle = "#000000";
          ctx.fillRect(0, 0, baseWidth, baseHeight);
          ctx.fillStyle = "#FFFFFF";
          ctx.font = "bold 192px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(formatTime(remainingSeconds), baseWidth / 2, baseHeight / 2 - 40);
        }

        // Ensure video stream is set
        if (!video.srcObject) {
          const stream = canvas.captureStream(30);
          video.srcObject = stream;
        }

        // Wait for video metadata to load
        if (video.readyState < 2) { // HAVE_CURRENT_DATA
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Video metadata loading timeout"));
            }, 5000);
            
            const onLoadedMetadata = () => {
              clearTimeout(timeout);
              video.removeEventListener("loadedmetadata", onLoadedMetadata);
              video.removeEventListener("error", onError);
              resolve();
            };
            
            const onError = (e: Event) => {
              clearTimeout(timeout);
              video.removeEventListener("loadedmetadata", onLoadedMetadata);
              video.removeEventListener("error", onError);
              reject(new Error("Video metadata loading failed"));
            };
            
            video.addEventListener("loadedmetadata", onLoadedMetadata);
            video.addEventListener("error", onError);
            
            // Try to load metadata by playing
            video.play().catch(() => {
              // Ignore play errors, we just need metadata
            });
          });
        }

        // Ensure video is playing (required for PiP)
        if (video.paused) {
          await video.play();
        }

        // Wait a bit more to ensure everything is ready
        await new Promise(resolve => setTimeout(resolve, 200));

        // Request Picture-in-Picture
        await video.requestPictureInPicture();
        setIsPictureInPicture(true);
      }
    } catch (error) {
      console.error("Picture-in-Picture error:", error);
      alert(`画中画功能不可用: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Handle PiP events
  useEffect(() => {
    const video = pipVideoRef.current;
    if (!video) return;

    const handleEnterPiP = () => {
      setIsPictureInPicture(true);
    };
    
    const handleLeavePiP = () => {
      setIsPictureInPicture(false);
    };

    video.addEventListener("enterpictureinpicture", handleEnterPiP);
    video.addEventListener("leavepictureinpicture", handleLeavePiP);

    return () => {
      video.removeEventListener("enterpictureinpicture", handleEnterPiP);
      video.removeEventListener("leavepictureinpicture", handleLeavePiP);
    };
  }, []);

  // Ensure video plays when entering PiP
  useEffect(() => {
    if (isPictureInPicture && pipVideoRef.current) {
      const video = pipVideoRef.current;
      if (video.paused) {
        video.play().catch((err) => {
          console.error("Failed to play video in PiP:", err);
        });
      }
    }
  }, [isPictureInPicture]);

  const totalSeconds = isWaitPhase ? waitSeconds : focusSeconds;
  const progress = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0;

  return (
    <AnimatePresence>
      {isVisible && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 bg-black text-white"
        >
          {/* Hidden video and canvas for Picture-in-Picture */}
          <video
            ref={pipVideoRef}
            className="hidden"
            playsInline
            muted
          />
          <canvas ref={pipCanvasRef} className="hidden" />
          {background?.type === "mp4" && (
            <video
              ref={pipBackgroundVideoRef}
              className="hidden"
              src={background.url}
              crossOrigin={background.url.startsWith("/") ? undefined : "anonymous"}
              loop
              muted
              autoPlay
              playsInline
            />
          )}
          {background?.type === "gif" && (
            <img
              ref={pipBackgroundImageRef}
              className="hidden"
              src={background.url}
              crossOrigin={background.url.startsWith("/") ? undefined : "anonymous"}
              alt="PiP background"
            />
          )}
          {/* Background based on mode */}
          {mode === "chill" && (
            <div className="absolute inset-0 overflow-hidden">
              {/* Animated background (GIF or MP4) */}
              <div className="absolute inset-0">
                {background?.type === "mp4" ? (
                  <video
                    src={background.url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={background?.url || "https://user-images.githubusercontent.com/53535277/97919236-75a9f480-1d25-11eb-8ee1-5a6293ff8998.gif"}
                    alt="Chill animated background"
                    className="w-full h-full object-cover"
                    style={{ imageRendering: "auto" }}
                  />
                )}
                {/* Overlay for depth and readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />
              </div>
              
              {/* Magical particles effect */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-white/40 rounded-full"
                    initial={{
                      x: Math.random() * 100 + "%",
                      y: Math.random() * 100 + "%",
                      opacity: 0,
                    }}
                    animate={{
                      y: [null, Math.random() * -100 - 50],
                      x: [null, (Math.random() - 0.5) * 50],
                      opacity: [0, 0.6, 0],
                    }}
            transition={{
                      duration: Math.random() * 3 + 2,
                      repeat: Infinity,
                      delay: Math.random() * 2,
                      ease: "easeOut",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Picture-in-Picture Button - Top Right */}
          <Button
            onClick={handlePictureInPicture}
            variant="ghost"
            size="sm"
            className="fixed top-4 right-4 z-50 text-white hover:bg-white/10 h-10 w-10 p-0"
            title={isPictureInPicture ? "Exit Picture-in-Picture" : "Enter Picture-in-Picture"}
          >
            <PictureInPicture className="h-5 w-5" />
          </Button>

          {/* Timer display and controls */}
          {mode === "chill" ? (
            <div className="fixed top-4 left-4 z-10">
                <motion.div
                className="relative bg-black/40 backdrop-blur-md rounded-xl px-10 py-8 border border-white/10 flex flex-col gap-4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                key={`chill-timer-${isWaitPhase ? "wait" : "focus"}`}
              >
                <Button
                  onClick={onCancel}
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 text-white hover:bg-white/10 h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
                <div>
                  <div className="text-white/80 text-sm uppercase tracking-wider mb-2">Focus</div>
                  <div className="text-8xl font-bold tabular-nums text-white">
                    {formatTime(remainingSeconds)}
                  </div>
                  {isWaitPhase && (
                    <div className="text-xs text-white/60 uppercase tracking-wider mt-2">
                      Wait Phase
                    </div>
                  )}
                  </div>
                <div className="flex items-center justify-between gap-2 pt-4 border-t border-white/10">
                  {isActive ? (
                    <Button
                      onClick={onPause}
                      variant="default"
                      size="sm"
                      className="bg-white/10 hover:bg-white/20 text-white h-8 px-3 text-xs"
                    >
                      <Pause className="h-3 w-3 mr-1" />
                      Pause
                    </Button>
                  ) : (
                    <Button
                      onClick={onResume}
                      variant="default"
                      size="sm"
                      className="bg-white/10 hover:bg-white/20 text-white h-8 px-3 text-xs"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Resume
                    </Button>
                  )}
                  <Button
                    onClick={onCompleteEarly}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/10 h-8 px-3 text-xs ml-auto"
                  >
                    Complete
                  </Button>
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="fixed inset-0 flex flex-col items-center justify-center z-10">
              {/* Exit button - top left */}
              <Button
                onClick={onCancel}
                variant="ghost"
                size="sm"
                className="absolute top-4 left-4 text-white hover:bg-white/10 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
              
              {/* Timer circle - center */}
              <div className="relative w-[600px] h-[600px]">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="50%"
                    cy="50%"
                    r="45%"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="8"
                  />
                  <motion.circle
                    cx="50%"
                    cy="50%"
                    r="45%"
                    fill="none"
                    stroke="white"
                    strokeWidth="8"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: progress }}
                      transition={{ duration: 0.3 }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-8xl font-light tabular-nums">
                    {formatTime(remainingSeconds)}
                  </div>
                  {isWaitPhase && (
                    <div className="mt-4 text-lg text-white/60 uppercase tracking-wider">
                      Wait
                </div>
              )}
                </div>
            </div>

              {/* Control buttons - bottom */}
              <div className="flex items-center gap-4 mt-12">
                {isActive ? (
                  <Button
                    onClick={onPause}
                    variant="default"
                    size="lg"
                    className="bg-white/10 hover:bg-white/20 text-white h-12 px-6 text-base"
                  >
                    <Pause className="h-5 w-5 mr-2" />
                    Pause
                    </Button>
                ) : (
                  <Button
                    onClick={onResume}
                    variant="default"
                    size="lg"
                    className="bg-white/10 hover:bg-white/20 text-white h-12 px-6 text-base"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Resume
                    </Button>
            )}
              <Button
                  onClick={onCompleteEarly}
                variant="ghost"
                size="lg"
                  className="text-white hover:bg-white/10 h-12 px-6 text-base"
              >
                  Complete
              </Button>
              </div>
            </div>
          )}

          {/* Media Controls */}
          {mode === "chill" && (
            <MediaControls isActive={isActive} onBackgroundChange={setBackground} />
          )}

          {/* Mode switch bar - bottom right */}
          <AnimatePresence>
            {showModeSwitch && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="fixed bottom-4 right-4 bg-black/40 backdrop-blur-2xl border border-white/10 p-2 z-50 rounded-2xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-row gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onModeChange("default");
                    }}
                    className={`px-6 py-3 rounded-xl transition-all duration-200 cursor-pointer text-sm font-medium relative overflow-hidden flex items-center justify-center ${
                      mode === "default"
                        ? "bg-white text-black shadow-lg"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {mode === "default" && (
                      <motion.div
                        layoutId="activeMode"
                        className="absolute inset-0 bg-white rounded-xl"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className="relative z-10 whitespace-nowrap">Default</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onModeChange("chill");
                    }}
                    className={`px-6 py-3 rounded-xl transition-all duration-200 cursor-pointer text-sm font-medium relative overflow-hidden flex items-center justify-center ${
                      mode === "chill"
                        ? "bg-white text-black shadow-lg"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {mode === "chill" && (
                      <motion.div
                        layoutId="activeMode"
                        className="absolute inset-0 bg-white rounded-xl"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className="relative z-10 whitespace-nowrap">Chill</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        )}
    </AnimatePresence>
  );
}
