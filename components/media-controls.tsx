"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, Volume2, Image, Video } from "lucide-react";
import { cn } from "@/lib/utils";

// Background media (supports both GIF and MP4)
const backgroundMedia: Record<string, { url: string; type: "gif" | "mp4"; label: string }> = {
  forest: { url: "https://images.pexels.com/photos/975771/pexels-photo-975771.jpeg?cs=srgb&dl=pexels-davidriano-975771.jpg&fm=jpg", type: "gif", label: "Forest" },
  anime_forest: { url: "https://wallpaper.forfun.com/fetch/b0/b0407d768ce0b8530c40f2b1f4dcca3f.jpeg", type: "gif", label: "Anime Forest" },
  ocean: { url: "https://images.squarespace-cdn.com/content/v1/5fe4caeadae61a2f19719512/03cff432-8971-4738-981b-fe426789fced/The+Dock?format=2500w", type: "gif", label: "Ocean" },
  anime: { url: "https://p3-pc-sign.douyinpic.com/tos-cn-i-0813/3c82c3e856ca49538eb34e6c87c91877~noop.jpeg?biz_tag=pcweb_cover&card_type=303&column_n=0&from=327834062&lk3s=138a59ce&s=PackSourceEnum_SEARCH&se=false&x-expires=1764334800&x-signature=TVUrnyKU0ZViqJJDIx1hS3Lyq6I%3D", type: "gif", label: "Anime" },
  city: { url: "https://user-images.githubusercontent.com/53535277/97919236-75a9f480-1d25-11eb-8ee1-5a6293ff8998.gif", type: "gif", label: "City" },
}; 

const musicOptions = [
  { value: "rain", label: "Rain Sounds" },
  { value: "ocean", label: "Ocean Waves" },
  { value: "city", label: "City Sounds" },
];

const musicUrls: Record<string, string> = {
  rain: "/audio/Calming Rain Sound Effect.mp3",
  ocean: "/audio/Soothing Ocean Waves.mp3",
  city: "/audio/City Sounds at Sunset.mp3",
};

interface MediaControlsProps {
  isActive?: boolean; // For timer - only play when timer is active
  onBackgroundChange?: (background: { url: string; type: "gif" | "mp4" }) => void;
}

export function MediaControls({ isActive = true, onBackgroundChange }: MediaControlsProps) {
  const [selectedMusic, setSelectedMusic] = useState<string>("rain");
  const [selectedBackground, setSelectedBackground] = useState<string>("forest");
  const [isPlaying, setIsPlaying] = useState(false);
  const [showMusicMenu, setShowMusicMenu] = useState(false);
  const [showBackgroundMenu, setShowBackgroundMenu] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [musicVolume, setMusicVolume] = useState(0.5);

  // Initialize audio
  useEffect(() => {
    if (selectedMusic && musicUrls[selectedMusic]) {
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
        if (wasPlaying && isPlaying && isActive) {
          audioRef.current.play().catch((err) => {
            console.error("Failed to play audio:", err);
          });
        }
      }
    }
  }, [selectedMusic]);

  // Play/pause music
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying && isActive) {
        audioRef.current.play().catch((err) => {
          console.error("Failed to play audio:", err);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, isActive]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = musicVolume;
    }
  }, [musicVolume]);

  // Notify parent of background change
  useEffect(() => {
    const bg = backgroundMedia[selectedBackground];
    if (bg && onBackgroundChange) {
      onBackgroundChange({ url: bg.url, type: bg.type });
    }
  }, [selectedBackground, onBackgroundChange]);

  const handleMusicChange = (newMusic: string) => {
    setSelectedMusic(newMusic);
    // Don't auto-play when changing music, user needs to click play button
    setShowMusicMenu(false);
  };

  const toggleMusic = () => {
    setIsPlaying(!isPlaying);
  };

  const currentBg = backgroundMedia[selectedBackground];
  const isAnimated = currentBg?.type === "gif" || currentBg?.type === "mp4";

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2">
      {/* Music Control */}
      <div className="relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-2 flex items-center gap-2"
        >
          {/* Play/Pause Toggle Button */}
          <button
            onClick={toggleMusic}
            className={cn(
              "px-3 py-3 rounded-xl transition-all duration-200 flex items-center justify-center relative overflow-hidden",
              isPlaying
                ? "bg-white text-black"
                : "text-white/70 hover:text-white hover:bg-white/10"
            )}
            title={isPlaying ? "Pause sound" : "Play sound"}
          >
            {isPlaying && (
              <motion.div
                layoutId="activePlayButton"
                className="absolute inset-0 bg-white rounded-xl"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">
              {isPlaying ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <Music className="h-4 w-4" />
              )}
            </span>
          </button>

          {/* Music Selection Button */}
          <button
            onClick={() => setShowMusicMenu(!showMusicMenu)}
            className={cn(
              "flex-1 px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-2 relative overflow-hidden",
              showMusicMenu
                ? "bg-white text-black"
                : "text-white/70 hover:text-white hover:bg-white/10"
            )}
          >
            {showMusicMenu && (
              <motion.div
                layoutId="activeMusicButton"
                className="absolute inset-0 bg-white rounded-xl"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10 text-sm font-medium whitespace-nowrap">
              {musicOptions.find((m) => m.value === selectedMusic)?.label || "Music"}
            </span>
          </button>
        </motion.div>

        <AnimatePresence>
          {showMusicMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-0 mb-2 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-2 min-w-[200px]"
            >
              <div className="space-y-1">
                {musicOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleMusicChange(option.value)}
                    className={cn(
                      "w-full px-4 py-2 rounded-xl text-left text-sm transition-all duration-200",
                      selectedMusic === option.value
                        ? "bg-white text-black"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
                <div className="px-4 py-2 flex items-center gap-2">
                  <span className="text-white/70 text-xs">Volume</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={musicVolume}
                    onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                    className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer"
                    aria-label="Volume"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Background Control */}
      <div className="relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-2"
        >
          <button
            onClick={() => setShowBackgroundMenu(!showBackgroundMenu)}
            className={cn(
              "w-full px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-2 relative overflow-hidden",
              showBackgroundMenu
                ? "bg-white text-black"
                : "text-white/70 hover:text-white hover:bg-white/10"
            )}
          >
            {showBackgroundMenu && (
              <motion.div
                layoutId="activeBackgroundButton"
                className="absolute inset-0 bg-white rounded-xl"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">
              {currentBg?.type === "mp4" ? (
                <Video className="h-4 w-4" />
              ) : (
                <Image className="h-4 w-4" />
              )}
            </span>
            <span className="relative z-10 text-sm font-medium whitespace-nowrap">
              {currentBg?.label || "Background"}
            </span>
            {isAnimated && (
              <span className={cn(
                "relative z-10 text-xs px-2 py-0.5 rounded-full",
                showBackgroundMenu ? "bg-black/20 text-black/80" : "bg-white/20 text-white/80"
              )}>
                Animated
              </span>
            )}
          </button>
        </motion.div>

        <AnimatePresence>
          {showBackgroundMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-0 mb-2 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-2 min-w-[200px]"
            >
              <div className="space-y-1">
                {Object.entries(backgroundMedia).map(([key, bg]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedBackground(key);
                      setShowBackgroundMenu(false);
                    }}
                    className={cn(
                      "w-full px-4 py-2 rounded-xl text-left text-sm transition-all duration-200 flex items-center justify-between",
                      selectedBackground === key
                        ? "bg-white text-black"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <span>{bg.label}</span>
                    {(bg.type === "gif" || bg.type === "mp4") && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white/80">
                        Animated
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

