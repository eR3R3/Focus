"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export function FocusHome() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return { hours, minutes, seconds };
  };

  const formatDate = (date: Date) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return {
      day: days[date.getDay()],
      month: months[date.getMonth()],
      date: date.getDate(),
      year: date.getFullYear(),
    };
  };

  if (!mounted) {
    return null;
  }

  const { hours, minutes, seconds } = formatTime(currentTime);
  const { day, month, date, year } = formatDate(currentTime);

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      {/* Main Time Display - Glass morphism card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        className="relative"
      >
        <div className="bg-white/10 backdrop-blur-3xl border border-white/20 rounded-3xl shadow-2xl p-12 md:p-16 lg:p-20 relative overflow-hidden">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 rounded-3xl" />
          
          {/* Animated border glow */}
          <motion.div
            className="absolute inset-0 rounded-3xl"
            style={{
              background: "linear-gradient(45deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05), rgba(255,255,255,0.1))",
              backgroundSize: "200% 200%",
            }}
            animate={{
              backgroundPosition: ["0% 0%", "100% 100%"],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          />

          <div className="relative z-10 text-center">
            {/* Day and Date */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mb-8"
            >
              <div className="text-white/80 text-lg md:text-xl font-light tracking-wider uppercase mb-2">
                {day}
              </div>
              <div className="text-white/70 text-sm md:text-base font-light">
                {month} {date}, {year}
              </div>
            </motion.div>

            {/* Main Time Display */}
            <div className="flex items-baseline justify-center gap-2 md:gap-4 mb-8">
              <motion.div
                key={`hours-${hours}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="text-white text-7xl md:text-9xl lg:text-[12rem] font-bold tabular-nums tracking-tight"
                style={{ fontWeight: 700 }}
              >
                {hours}
              </motion.div>
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-white/80 text-7xl md:text-9xl lg:text-[12rem] font-bold"
                style={{ fontWeight: 700 }}
              >
                :
              </motion.div>
              <motion.div
                key={`minutes-${minutes}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="text-white text-7xl md:text-9xl lg:text-[12rem] font-bold tabular-nums tracking-tight"
                style={{ fontWeight: 700 }}
              >
                {minutes}
              </motion.div>
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-white/80 text-7xl md:text-9xl lg:text-[12rem] font-bold"
                style={{ fontWeight: 700 }}
              >
                :
              </motion.div>
              <motion.div
                key={`seconds-${seconds}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="text-white/70 text-5xl md:text-7xl lg:text-[8rem] font-bold tabular-nums tracking-tight"
                style={{ fontWeight: 600 }}
              >
                {seconds}
              </motion.div>
            </div>

            {/* Subtitle */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-white/60 text-sm md:text-base font-light tracking-wider uppercase"
            >
              Focus on what matters
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

