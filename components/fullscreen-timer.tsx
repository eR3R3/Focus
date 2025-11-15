"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, X, Music, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const [selectedMusic, setSelectedMusic] = useState<string>("rain");
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [musicVolume, setMusicVolume] = useState(0.5);

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

  // Music URLs for ambient sounds
  // Using free ambient sound resources
  const musicUrls: Record<string, string> = {
    rain: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", // Replace with actual rain sound URL
    ocean: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", // Replace with actual ocean sound URL
    forest: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", // Replace with actual forest sound URL
    cafe: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", // Replace with actual cafe sound URL
  };

  // Initialize audio element
  useEffect(() => {
    if (mode === "chill" && selectedMusic && musicUrls[selectedMusic]) {
      if (!audioRef.current) {
        audioRef.current = new Audio(musicUrls[selectedMusic]);
        audioRef.current.loop = true;
        audioRef.current.volume = musicVolume;
        audioRef.current.preload = "auto";
      } else {
        const wasPlaying = !audioRef.current.paused;
        audioRef.current.pause();
        audioRef.current.src = musicUrls[selectedMusic];
        audioRef.current.load();
        if (wasPlaying && isPlaying) {
          audioRef.current.play().catch((err) => {
            console.error("Failed to play audio:", err);
          });
        }
      }
    }
    return () => {
      if (audioRef.current && mode !== "chill") {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [mode, selectedMusic, isPlaying]);

  // Play/pause music
  useEffect(() => {
    if (mode === "chill" && audioRef.current) {
      if (isPlaying && isActive) {
        audioRef.current.play().catch((err) => {
          console.error("Failed to play audio:", err);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [mode, isPlaying, isActive]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = musicVolume;
    }
  }, [musicVolume]);

  const handleMusicChange = (newMusic: string) => {
    setSelectedMusic(newMusic);
    if (newMusic === "spotify" || newMusic === "qqmusic") {
      // TODO: Implement Spotify/QQ Music integration
      alert(`${newMusic === "spotify" ? "Spotify" : "QQ Music"} integration coming soon!`);
      return;
    }
    setIsPlaying(true);
  };

  const toggleMusic = () => {
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

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
          {/* Background based on mode */}
          {mode === "chill" && (
            <div className="absolute inset-0 overflow-hidden">
              {/* Studio Ghibli style forest background */}
              <div className="absolute inset-0 bg-gradient-to-b from-green-900 via-green-800 to-green-900">
                {/* Forest background image */}
                <img
                  src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80&auto=format&fit=crop"
                  alt="Chill forest background"
                  className="w-full h-full object-cover opacity-60"
                />
                {/* Overlay for depth */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30" />
              </div>
              
              {/* Magical particles effect */}
              <div className="absolute inset-0 overflow-hidden">
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
              {/* Exit button - top right */}
              <Button
                onClick={onCancel}
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4 text-white hover:bg-white/10 h-8 w-8 p-0"
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

          {/* Music selector - bottom left */}
          {mode === "chill" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="fixed bottom-4 left-4 z-10 bg-black/40 backdrop-blur-md rounded-xl px-4 py-3 border border-white/10 flex items-center gap-3"
            >
              <button
                onClick={toggleMusic}
                className="text-white/80 hover:text-white transition-colors"
                aria-label={isPlaying ? "Pause music" : "Play music"}
              >
                {isPlaying ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <Music className="h-4 w-4" />
                )}
              </button>
              <select
                value={selectedMusic}
                onChange={(e) => handleMusicChange(e.target.value)}
                className="bg-transparent text-white border-none outline-none cursor-pointer text-xs"
              >
                <option value="rain" className="bg-black/90">Rain Sounds</option>
                <option value="ocean" className="bg-black/90">Ocean Waves</option>
                <option value="forest" className="bg-black/90">Forest Ambience</option>
                <option value="cafe" className="bg-black/90">Cafe Ambience</option>
                <option value="spotify" className="bg-black/90">Connect Spotify</option>
                <option value="qqmusic" className="bg-black/90">Connect QQ Music</option>
              </select>
              {selectedMusic !== "spotify" && selectedMusic !== "qqmusic" && (
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                  className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer"
                  aria-label="Volume"
                />
              )}
            </motion.div>
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
