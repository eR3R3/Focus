"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, BarChart3, Archive, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";
import { MediaControls } from "@/components/media-controls";
import { cn } from "@/lib/utils";

type View = "tasks" | "stats" | "archive";

interface ImmersiveLayoutProps {
  children: React.ReactNode;
  currentView: View;
  onViewChange: (view: View) => void;
}

export function ImmersiveLayout({
  children,
  currentView,
  onViewChange,
}: ImmersiveLayoutProps) {
  const [showNav, setShowNav] = useState(true); // Show by default, hide after timeout
  const [mouseTimeout, setMouseTimeout] = useState<NodeJS.Timeout | null>(null);
  const [background, setBackground] = useState<{ url: string; type: "gif" | "mp4" } | null>(null);

  useEffect(() => {
    // Show nav initially, then hide after 3 seconds of no mouse movement
    const initialTimeout = setTimeout(() => {
      setShowNav(false);
    }, 3000);

    const handleMouseMove = () => {
      setShowNav(true);
      if (mouseTimeout) {
        clearTimeout(mouseTimeout);
      }
      const timeout = setTimeout(() => {
        setShowNav(false);
      }, 3000);
      setMouseTimeout(timeout);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(initialTimeout);
      if (mouseTimeout) {
        clearTimeout(mouseTimeout);
      }
    };
  }, [mouseTimeout]);

  const navItems = [
    { id: "tasks" as View, label: "Tasks", icon: LayoutDashboard },
    { id: "stats" as View, label: "Stats", icon: BarChart3 },
    { id: "archive" as View, label: "Archive", icon: Archive },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Immersive Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-black">
          {background?.type === "mp4" ? (
            <video
              src={background.url}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover opacity-60"
            />
          ) : (
            <img
              src={background?.url || "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80&auto=format&fit=crop"}
              alt="Immersive background"
              className="w-full h-full object-cover opacity-60"
            />
          )}
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

      {/* Floating Navigation */}
      <AnimatePresence>
        {showNav && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="fixed top-4 left-0 right-0 z-50 flex justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-black/40 backdrop-blur-2xl border border-white/10 p-2 rounded-2xl shadow-2xl flex flex-row gap-2 items-center">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewChange(item.id);
                    }}
                    className={cn(
                      "px-6 py-3 rounded-xl transition-all duration-200 cursor-pointer text-sm font-medium relative overflow-hidden flex items-center justify-center gap-2",
                      isActive
                        ? "bg-white text-black shadow-lg"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute inset-0 bg-white rounded-xl"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <Icon className="h-4 w-4 relative z-10" />
                    <span className="relative z-10 whitespace-nowrap">{item.label}</span>
                  </button>
                );
              })}
              <div className="ml-2 pl-2 border-l border-white/10 flex items-center">
                <LogoutButton />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Controls */}
      <MediaControls onBackgroundChange={setBackground} />

      {/* Content Area */}
      <div className="relative z-10 h-full overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

