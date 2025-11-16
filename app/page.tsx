"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlarmClock,
  CheckCircle2,
  PauseCircle,
  Plus,
  TimerReset,
  Clock,
  Edit,
  Trash2,
  X,
  Check,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { LogoutButton } from "@/components/logout-button";
import { ImmersiveLayout } from "@/components/immersive-layout";
import { LampContainer } from "@/components/ui/lamp";
import { FullscreenTimer } from "@/components/fullscreen-timer";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Subtask {
  id: string;
  label: string;
  done: boolean;
  totalSeconds?: number;
}

interface Todo {
  id: string;
  title: string;
  subtasks: Subtask[];
}


interface Stats {
  nodes: number;
  minutes: number;
}

type CountdownBase = {
  selectedTasks: Array<{ todoId: string; subtaskIds: string[] }>;
  totalSeconds: number;
  remainingSeconds: number;
};

type WaitCountdown = CountdownBase & {
  plannedFocusSeconds: number;
};

type FocusSession = CountdownBase & {
  waitSeconds: number;
  status: "active" | "completed";
};

const defaultStats: Stats = { nodes: 0, minutes: 0 };

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [waitMinutes, setWaitMinutes] = useState<string>("0");
  const [focusMinutes, setFocusMinutes] = useState<string>("45");
  const [waitCountdown, setWaitCountdown] = useState<WaitCountdown | null>(
    null,
  );
  const [focusSession, setFocusSession] = useState<FocusSession | null>(null);
  const [stats, setStats] = useState<Stats>(defaultStats);
  const [celebrateOpen, setCelebrateOpen] = useState(false);
  const [celebrateNote, setCelebrateNote] = useState("");
  const [bootstrapState, setBootstrapState] = useState({
    loading: true,
    requiresAuth: false,
    error: null as string | null,
  });
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [creatingTodo, setCreatingTodo] = useState(false);
  const [subtaskPendingTodoId, setSubtaskPendingTodoId] = useState<string | null>(null);
  const [togglingSubtaskId, setTogglingSubtaskId] = useState<string | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Array<{ todoId: string; subtaskIds: string[] }>>([]);
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [fadingTodoId, setFadingTodoId] = useState<string | null>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const pauseStartTimeRef = useRef<number | null>(null);
  const pausedDurationRef = useRef<number>(0);
  const [timerMode, setTimerMode] = useState<"default" | "chill">("default");
  const [currentView, setCurrentView] = useState<"tasks" | "stats" | "archive">("tasks");
  const [archiveTodos, setArchiveTodos] = useState<Array<{ id: string; title: string; archivedAt: string; subtasks: Subtask[] }>>([]);
  const [archiveSearchTerm, setArchiveSearchTerm] = useState("");
  const [restoringTodoId, setRestoringTodoId] = useState<string | null>(null);
  const [statsData, setStatsData] = useState<{
    hourly: Array<{ hour: number; interval: string; sessions: number; minutes: number }>;
    todayTotals: { sessions: number; minutes: number };
    daily: Array<{ date: string; day: string; sessions: number; hours: number }>;
    totals: { sessions: number; minutes: number };
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);

  const filteredTodos = useMemo(() => {
    if (!searchTerm) return todos;
    return todos.filter((todo) =>
      todo.title.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [searchTerm, todos]);

  const loadDashboard = useCallback(async () => {
    setBootstrapState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch("/api/ctdp/bootstrap");
      if (response.status === 401) {
        setBootstrapState({ loading: false, requiresAuth: true, error: null });
        return;
      }
      if (!response.ok) {
        // Check if response is HTML (redirect page)
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
          setBootstrapState({ loading: false, requiresAuth: true, error: null });
          return;
        }
        throw new Error("Failed to load data");
      }
      // Check if response is JSON before parsing
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        setBootstrapState({ loading: false, requiresAuth: true, error: null });
        return;
      }
      const payload = (await response.json()) as {
        todos: Todo[];
        stats: Stats;
      };
      setTodos(payload.todos);
      setStats(payload.stats ?? defaultStats);
      setBootstrapState({ loading: false, requiresAuth: false, error: null });
    } catch (error) {
      console.error(error);
      // If it's a JSON parse error, user is likely not authenticated
      if (error instanceof SyntaxError) {
        setBootstrapState({ loading: false, requiresAuth: true, error: null });
      } else {
      setBootstrapState((prev) => ({
        loading: false,
        requiresAuth: prev.requiresAuth,
        error: "加载数据失败，请稍后重试。",
      }));
      }
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Load stats when switching to stats view
  useEffect(() => {
    if (currentView === "stats" && !statsData) {
      loadStats();
    }
  }, [currentView, statsData]);

  // Load archive when switching to archive view
  useEffect(() => {
    if (currentView === "archive" && archiveTodos.length === 0) {
      loadArchive();
    }
  }, [currentView, archiveTodos.length]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await fetch("/api/ctdp/stats");
      if (response.status === 401) {
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to load stats");
      }
      const data = (await response.json()) as typeof statsData;
      setStatsData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadArchive = useCallback(async () => {
    setArchiveLoading(true);
    try {
      const response = await fetch("/api/ctdp/archive");
      if (response.status === 401) {
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to load archive");
      }
      const payload = (await response.json()) as { todos: typeof archiveTodos };
      setArchiveTodos(payload.todos ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setArchiveLoading(false);
    }
  }, []);

  const formatArchivedDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  };

  const handleRestore = async (todoId: string) => {
    setRestoringTodoId(todoId);
    try {
      const response = await fetch("/api/ctdp/archive/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todoId }),
      });
      if (!response.ok) {
        throw new Error("Failed to restore todo");
      }
      setArchiveTodos((prev) => prev.filter((todo) => todo.id !== todoId));
      await loadDashboard();
      setCurrentView("tasks");
    } catch (err) {
      console.error(err);
      alert("恢复任务失败，请稍后再试。");
    } finally {
      setRestoringTodoId(null);
    }
  };

  const filteredArchiveTodos = useMemo(() => {
    if (!archiveSearchTerm) return archiveTodos;
    return archiveTodos.filter((todo) =>
      todo.title.toLowerCase().includes(archiveSearchTerm.toLowerCase()) ||
      todo.subtasks.some((subtask) =>
        subtask.label.toLowerCase().includes(archiveSearchTerm.toLowerCase())
      )
    );
  }, [archiveTodos, archiveSearchTerm]);

  // Auto-archive completed tasks after midnight
  const checkAndArchive = useCallback(async () => {
    // Skip if user is not authenticated
    if (bootstrapState.requiresAuth) {
      return;
    }
    try {
      const response = await fetch("/api/ctdp/archive/auto", {
        method: "POST",
      });
      if (response.status === 401) {
        return;
      }
      if (!response.ok) {
        // Check if response is HTML (redirect page)
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
          return;
        }
        return;
      }
      // Check if response is JSON before parsing
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return;
      }
      const result = (await response.json()) as { archived: number };
      if (result.archived > 0) {
        // Reload dashboard to reflect archived tasks
        await loadDashboard();
      }
    } catch (error) {
      // Silently ignore errors (user might not be authenticated)
      if (error instanceof SyntaxError) {
        // JSON parse error, likely HTML response
        return;
      }
      console.error("Failed to auto-archive:", error);
    }
  }, [loadDashboard, bootstrapState.requiresAuth]);

  useEffect(() => {
    // Check and archive on mount, but only if user is authenticated
    if (!bootstrapState.requiresAuth && !bootstrapState.loading) {
      checkAndArchive();
    }
  }, [checkAndArchive, bootstrapState.requiresAuth, bootstrapState.loading]);

  // Cleanup fade timeout on unmount
  useEffect(() => {
    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, []);

  const waitActive = Boolean(waitCountdown);
  const focusActive = focusSession?.status === "active";

  // Track start time for accurate timing even when tab is hidden
  const waitStartTimeRef = useRef<number | null>(null);
  const waitTotalSecondsRef = useRef<number | null>(null);
  const waitCountdownRef = useRef<WaitCountdown | null>(null);
  const focusStartTimeRef = useRef<number | null>(null);
  const focusTotalSecondsRef = useRef<number | null>(null);
  const focusSessionRef = useRef<FocusSession | null>(null);

  // Sync waitCountdown to ref
  useEffect(() => {
    waitCountdownRef.current = waitCountdown;
  }, [waitCountdown]);

  // Sync focusSession to ref
  useEffect(() => {
    focusSessionRef.current = focusSession;
  }, [focusSession]);

  // Wait countdown timer with visibility API support
  useEffect(() => {
    if (!waitActive || !waitCountdownRef.current) return;

    // Initialize refs when countdown starts
    if (waitStartTimeRef.current === null && waitCountdownRef.current) {
      waitStartTimeRef.current = Date.now();
      waitTotalSecondsRef.current = waitCountdownRef.current.totalSeconds;
    }

    const updateCountdown = () => {
      if (waitStartTimeRef.current === null || waitTotalSecondsRef.current === null) return;
      if (isPaused) return; // Don't update if paused
      
      const elapsed = Math.floor((Date.now() - waitStartTimeRef.current - pausedDurationRef.current) / 1000);
      const remaining = Math.max(0, waitTotalSecondsRef.current - elapsed);
      
      // Only update if the countdown ref still exists
      if (!waitCountdownRef.current) return;
      
      if (remaining <= 0) {
      setWaitCountdown((prev) => {
        if (!prev) return null;
          return { ...prev, remainingSeconds: 0 };
        });
        return;
      }
      
      // Only update if remaining seconds actually changed (avoid unnecessary updates)
      if (waitCountdownRef.current.remainingSeconds !== remaining) {
        setWaitCountdown((prev) => {
          if (!prev) return null;
          return { ...prev, remainingSeconds: remaining };
        });
      }
    };

    // Update immediately
    updateCountdown();

    const timer = window.setInterval(updateCountdown, 1000);

    // Handle visibility change to recalculate when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updateCountdown();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [waitActive, isPaused]);

  useEffect(() => {
    if (!waitCountdown || waitCountdown.remainingSeconds > 0) return;
    const { selectedTasks, plannedFocusSeconds, totalSeconds } = waitCountdown;
    
    // Smooth transition: delay the state update slightly for smoother animation
    setTimeout(() => {
    setWaitCountdown(null);
      waitStartTimeRef.current = null;
      waitTotalSecondsRef.current = null;
      const now = Date.now();
      focusStartTimeRef.current = now;
      focusTotalSecondsRef.current = plannedFocusSeconds;
    setFocusSession({
        selectedTasks,
      totalSeconds: plannedFocusSeconds,
      remainingSeconds: plannedFocusSeconds,
      waitSeconds: totalSeconds,
      status: "active",
    });
    }, 100);
  }, [waitCountdown]);

  // Focus session timer with visibility API support
  useEffect(() => {
    if (!focusActive || !focusSessionRef.current) return;

    // Initialize refs when focus session starts
    if (focusStartTimeRef.current === null && focusSessionRef.current) {
      focusStartTimeRef.current = Date.now();
      focusTotalSecondsRef.current = focusSessionRef.current.totalSeconds;
    }

    const updateSession = () => {
      if (focusStartTimeRef.current === null || focusTotalSecondsRef.current === null) return;
      if (isPaused) return; // Don't update if paused
      
      const elapsed = Math.floor((Date.now() - focusStartTimeRef.current - pausedDurationRef.current) / 1000);
      const remaining = Math.max(0, focusTotalSecondsRef.current - elapsed);
      
      // Only update if the session ref still exists and is active
      if (!focusSessionRef.current || focusSessionRef.current.status !== "active") return;
      
      if (remaining <= 0) {
      setFocusSession((prev) => {
        if (!prev || prev.status !== "active") return prev;
          return { ...prev, remainingSeconds: 0, status: "completed" };
        });
        return;
      }
      
      // Only update if remaining seconds actually changed (avoid unnecessary updates)
      if (focusSessionRef.current.remainingSeconds !== remaining) {
        setFocusSession((prev) => {
          if (!prev || prev.status !== "active") return prev;
          return { ...prev, remainingSeconds: remaining };
        });
      }
    };

    // Update immediately
    updateSession();

    const timer = window.setInterval(updateSession, 1000);

    // Handle visibility change to recalculate when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updateSession();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [focusActive, isPaused]);

  useEffect(() => {
    if (focusSession?.status === "completed") {
      setCelebrateOpen(true);
    }
  }, [focusSession]);

  const handleCreateTodo = async () => {
    if (!newTodoTitle.trim()) return;
    setCreatingTodo(true);
    try {
      const response = await fetch("/api/ctdp/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTodoTitle.trim() }),
      });
      if (!response.ok) {
        throw new Error("Failed to create todo");
      }
      const created = (await response.json()) as Todo;
      setTodos((prev) => [created, ...prev]);
      setNewTodoTitle("");
    } catch (error) {
      console.error(error);
      alert("创建任务失败，请稍后再试。");
    } finally {
      setCreatingTodo(false);
    }
  };

  const handleAddSubtask = async (todoId: string, label: string) => {
    if (!label.trim()) return;
    setSubtaskPendingTodoId(todoId);
    try {
      const response = await fetch(`/api/ctdp/todos/${todoId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      if (!response.ok) {
        throw new Error("Failed to create subtask");
      }
      const subtask = (await response.json()) as Subtask;
      setTodos((prev) =>
        prev.map((todo) =>
          todo.id === todoId
            ? { ...todo, subtasks: [...todo.subtasks, subtask] }
            : todo,
        ),
      );
    } catch (error) {
      console.error(error);
      alert("添加子任务失败，请稍后重试。");
    } finally {
      setSubtaskPendingTodoId(null);
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    if (!confirm("确定要删除这个任务吗？")) return;
    try {
      const response = await fetch(`/api/ctdp/todos/${todoId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete todo");
      }
      setTodos((prev) => prev.filter((todo) => todo.id !== todoId));
    } catch (error) {
      console.error("Delete todo error:", error);
      alert(`删除任务失败：${error instanceof Error ? error.message : "请稍后再试"}`);
    }
  };

  const handleUpdateTodo = async (todoId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    try {
      const response = await fetch(`/api/ctdp/todos/${todoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (!response.ok) {
        throw new Error("Failed to update todo");
      }
      const updated = (await response.json()) as Todo;
      setTodos((prev) =>
        prev.map((todo) => (todo.id === todoId ? { ...todo, title: updated.title } : todo)),
      );
    } catch (error) {
      console.error(error);
      alert("更新任务失败，请稍后再试。");
    }
  };

  const handleDeleteSubtask = async (todoId: string, subtaskId: string) => {
    try {
      const response = await fetch(`/api/ctdp/subtasks/${subtaskId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete subtask");
      }
      setTodos((prev) =>
        prev.map((todo) =>
          todo.id === todoId
            ? { ...todo, subtasks: todo.subtasks.filter((s) => s.id !== subtaskId) }
            : todo,
        ),
      );
    } catch (error) {
      console.error(error);
      alert("删除子任务失败，请稍后再试。");
    }
  };

  const handleUpdateSubtask = async (
    todoId: string,
    subtaskId: string,
    newLabel: string,
  ) => {
    if (!newLabel.trim()) return;
    try {
      const response = await fetch(`/api/ctdp/subtasks/${subtaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel.trim() }),
      });
      if (!response.ok) {
        throw new Error("Failed to update subtask");
      }
      const updated = (await response.json()) as Subtask;
      setTodos((prev) =>
        prev.map((todo) =>
          todo.id === todoId
            ? {
                ...todo,
                subtasks: todo.subtasks.map((s) =>
                  s.id === subtaskId ? { ...s, label: updated.label } : s,
                ),
              }
            : todo,
        ),
      );
    } catch (error) {
      console.error(error);
      alert("更新子任务失败，请稍后再试。");
    }
  };

  const handleToggleSubtask = async (todoId: string, subtaskId: string) => {
    let previousValue = false;
    let updatedTodo: Todo | null = null;
    
    // Get the current value before updating
    const currentTodo = todos.find((t) => t.id === todoId);
    const currentSubtask = currentTodo?.subtasks.find((s) => s.id === subtaskId);
    const isUnchecking = currentSubtask?.done === true;
    
    // If this todo is currently fading and user is unchecking a subtask, cancel fading
    if (fadingTodoId === todoId && isUnchecking) {
      // Clear the fade timeout
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = null;
      }
      setFadingTodoId(null);
    }
    
    setTodos((prev) =>
      prev.map((todo) => {
        if (todo.id !== todoId) return todo;
        const updated: Todo = {
          ...todo,
          subtasks: todo.subtasks.map((subtask) => {
            if (subtask.id !== subtaskId) return subtask;
            previousValue = subtask.done;
            return { ...subtask, done: !subtask.done };
          }),
        };
        updatedTodo = updated;
        return updated;
      }),
    );
    setTogglingSubtaskId(subtaskId);
    try {
      const response = await fetch(`/api/ctdp/subtasks/${subtaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !previousValue }),
      });
      if (!response.ok) {
        throw new Error("Failed to update subtask");
      }
      
      // Check if this was the last subtask being completed
      const todo = updatedTodo as Todo | null;
      if (todo && !previousValue && todo.subtasks.length > 0) {
        const allDone = todo.subtasks.every((s: Subtask) => s.done);
        if (allDone) {
          // Start fading effect
          setFadingTodoId(todoId);
          // Archive after 3 seconds
          fadeTimeoutRef.current = setTimeout(async () => {
            try {
              const archiveResponse = await fetch("/api/ctdp/archive/auto", {
                method: "POST",
              });
              if (archiveResponse.ok) {
                // Remove from todos list
                setTodos((prev) => prev.filter((todo) => todo.id !== todoId));
                setFadingTodoId(null);
                fadeTimeoutRef.current = null;
              }
            } catch (error) {
              console.error("Failed to archive:", error);
              setFadingTodoId(null);
              fadeTimeoutRef.current = null;
            }
          }, 3000);
        }
      }
    } catch (error) {
      console.error(error);
      alert("更新子任务失败，已回滚。");
      setTodos((prev) =>
        prev.map((todo) =>
          todo.id === todoId
            ? {
                ...todo,
                subtasks: todo.subtasks.map((subtask) =>
                  subtask.id === subtaskId
                    ? { ...subtask, done: previousValue }
                    : subtask,
                ),
              }
            : todo,
        ),
      );
    } finally {
      setTogglingSubtaskId(null);
      // Only check archive if not fading (to avoid double archiving)
      if (!fadingTodoId) {
        checkAndArchive();
      }
    }
  };

  const handleToggleTaskSelection = (todoId: string, subtaskId: string) => {
    setSelectedTasks((prev) => {
      const existing = prev.find((t) => t.todoId === todoId);
      if (existing) {
        const hasSubtask = existing.subtaskIds.includes(subtaskId);
        if (hasSubtask) {
          const newSubtaskIds = existing.subtaskIds.filter((id) => id !== subtaskId);
          if (newSubtaskIds.length === 0) {
            return prev.filter((t) => t.todoId !== todoId);
          }
          return prev.map((t) =>
            t.todoId === todoId ? { ...t, subtaskIds: newSubtaskIds } : t,
          );
        } else {
          return prev.map((t) =>
            t.todoId === todoId
              ? { ...t, subtaskIds: [...t.subtaskIds, subtaskId] }
              : t,
          );
        }
      } else {
        return [...prev, { todoId, subtaskIds: [subtaskId] }];
      }
    });
  };

  const handleSchedule = () => {
    if (selectedTasks.length === 0 || waitCountdown || focusSession?.status === "active")
      return;
    // Set timer mode to chill when starting
    setTimerMode("chill");
    const waitMinutesNum = Math.max(0, Number(waitMinutes) || 0);
    const focusMinutesNum = Math.max(0, Number(focusMinutes) || 0);
    const waitSeconds = waitMinutesNum * 60;
    const focusSeconds = focusMinutesNum * 60;
    
    // If wait time is 0, skip wait and go directly to focus session
    if (waitSeconds === 0) {
      const now = Date.now();
      focusStartTimeRef.current = now;
      focusTotalSecondsRef.current = focusSeconds;
      setFocusSession({
        selectedTasks,
        totalSeconds: focusSeconds,
        remainingSeconds: focusSeconds,
        waitSeconds: 0,
        status: "active",
      });
    } else {
      waitStartTimeRef.current = Date.now();
      waitTotalSecondsRef.current = waitSeconds;
    setWaitCountdown({
        selectedTasks,
      totalSeconds: waitSeconds,
      remainingSeconds: waitSeconds,
      plannedFocusSeconds: focusSeconds,
    });
    }
    setShowTaskSelector(false);
  };

  const handleCancelWait = () => {
    setWaitCountdown(null);
    waitStartTimeRef.current = null;
    waitTotalSecondsRef.current = null;
  };
  const handleAbortSession = () => {
    setFocusSession(null);
    focusStartTimeRef.current = null;
    focusTotalSecondsRef.current = null;
    setCelebrateNote("");
    setCelebrateOpen(false);
    setIsPaused(false);
    pauseStartTimeRef.current = null;
    pausedDurationRef.current = 0;
  };
  const handleCompleteEarly = () => {
    if (!focusSession) return;
    setFocusSession((prev) =>
      prev ? { ...prev, remainingSeconds: 0, status: "completed" } : prev,
    );
  };
  const handlePause = () => {
    if (waitCountdown) {
      // Pause wait countdown
      setIsPaused(true);
      pauseStartTimeRef.current = Date.now();
    } else if (focusSession) {
      // Pause focus session
      setIsPaused(true);
      pauseStartTimeRef.current = Date.now();
    }
  };
  const handleResume = () => {
    if (isPaused && pauseStartTimeRef.current) {
      const pausedTime = Date.now() - pauseStartTimeRef.current;
      pausedDurationRef.current += pausedTime;
      pauseStartTimeRef.current = null;
      setIsPaused(false);
      
      // Adjust start time to account for paused duration
      if (waitCountdown && waitStartTimeRef.current) {
        waitStartTimeRef.current += pausedDurationRef.current;
      } else if (focusSession && focusStartTimeRef.current) {
        focusStartTimeRef.current += pausedDurationRef.current;
      }
      pausedDurationRef.current = 0;
    }
  };

  const handleCelebrateSave = async () => {
    if (!focusSession) return;
    try {
      const taskTitles = focusSession.selectedTasks
        .map((st) => {
          const todo = todos.find((t) => t.id === st.todoId);
          if (!todo) return "";
          const subtaskLabels = st.subtaskIds
            .map((sid) => {
              const subtask = todo.subtasks.find((s) => s.id === sid);
              return subtask?.label;
            })
            .filter(Boolean)
            .join(", ");
          return `${todo.title}${subtaskLabels ? ` (${subtaskLabels})` : ""}`;
        })
        .filter(Boolean)
        .join("; ");

      // Collect all subtask IDs from selected tasks
      const allSubtaskIds = focusSession.selectedTasks.flatMap((st) => st.subtaskIds);

      // Calculate actual focus seconds (total planned - remaining)
      // This handles both completed sessions and early completions
      const actualFocusSeconds = Math.max(0, focusSession.totalSeconds - focusSession.remainingSeconds);

      const response = await fetch("/api/ctdp/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          todoId: null,
          todoTitle: taskTitles || "Focus Session",
          waitSeconds: focusSession.waitSeconds,
          focusSeconds: actualFocusSeconds,
          note: celebrateNote,
          subtaskIds: allSubtaskIds,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to save session");
      }
      const payload = (await response.json()) as {
        stats: Stats;
      };
      setStats(payload.stats ?? defaultStats);
      
      // Reload dashboard to get updated subtask times
      await loadDashboard();
    } catch (error) {
      console.error(error);
      alert("保存失败，请稍后再试。");
      return;
    } finally {
      setCelebrateNote("");
      setCelebrateOpen(false);
      setFocusSession(null);
      focusStartTimeRef.current = null;
      focusTotalSecondsRef.current = null;
      setSelectedTasks([]);
    }
  };

  const handleCelebrateDismiss = () => {
    setCelebrateNote("");
    setCelebrateOpen(false);
    setFocusSession(null);
    focusStartTimeRef.current = null;
    focusTotalSecondsRef.current = null;
    setSelectedTasks([]);
  };

  const schedulingDisabled =
    selectedTasks.length === 0 ||
    waitCountdown !== null ||
    focusSession?.status === "active" ||
    bootstrapState.loading ||
    bootstrapState.requiresAuth;

  const isLoadingScreen = bootstrapState.loading && todos.length === 0;

  if (bootstrapState.requiresAuth) {
    return <AuthRequiredCard />;
  }

  if (isLoadingScreen) {
    return <LoadingCard />;
  }

  const selectedTasksCount = selectedTasks.reduce(
    (acc, st) => acc + st.subtaskIds.length,
    0,
  );

  const isFullscreen = Boolean(waitCountdown || focusSession);
  const currentRemainingSeconds = waitCountdown 
    ? waitCountdown.remainingSeconds 
    : focusSession?.remainingSeconds ?? 0;
  const currentWaitSeconds = waitCountdown?.totalSeconds ?? focusSession?.waitSeconds ?? 0;
  const currentFocusSeconds = focusSession?.totalSeconds ?? waitCountdown?.plannedFocusSeconds ?? 0;

  return (
    <>
      <FullscreenTimer
        isVisible={isFullscreen}
        mode={timerMode}
        onModeChange={setTimerMode}
        waitSeconds={currentWaitSeconds}
        focusSeconds={currentFocusSeconds}
        remainingSeconds={currentRemainingSeconds}
        isWaitPhase={Boolean(waitCountdown)}
        isActive={!isPaused && Boolean(waitCountdown || focusSession?.status === "active")}
        onPause={handlePause}
        onResume={handleResume}
        onCancel={waitCountdown ? handleCancelWait : handleAbortSession}
        onCompleteEarly={handleCompleteEarly}
      />
      {!isFullscreen && (
        <ImmersiveLayout currentView={currentView} onViewChange={setCurrentView}>
          <div className="min-h-screen">
            <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 pt-24">
        {bootstrapState.error && todos.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200 backdrop-blur-md"
                >
            {bootstrapState.error}
            <Button
              variant="ghost"
                    className="ml-3 h-8 px-3 text-red-200 hover:text-red-100"
              onClick={loadDashboard}
            >
              重新加载
            </Button>
                </motion.div>
              )}

              {currentView === "tasks" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-white mb-2">Tasks</h1>
                    <p className="text-white/70">
                      {stats.nodes} sessions · {stats.minutes} minutes
                </p>
              </div>

                  <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
                    <div className="space-y-4">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4"
                      >
                        <div className="flex gap-2">
                          <Input
                            placeholder="New task..."
                            value={newTodoTitle}
                            onChange={(e) => setNewTodoTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleCreateTodo();
                              }
                            }}
                            className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                          />
                          <Button
                            onClick={handleCreateTodo}
                            disabled={creatingTodo || !newTodoTitle.trim()}
                            size="sm"
                            className="bg-white/20 hover:bg-white/30 text-white"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4"
                      >
                        <Input
                          placeholder="Search..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="mb-4 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        />
                        <div className="space-y-2">
                          {filteredTodos.length === 0 && (
                            <p className="py-8 text-center text-sm text-white/50">
                              No tasks yet
                            </p>
                          )}
                          <AnimatePresence>
                            {filteredTodos.map((todo) => (
                              <motion.div
                                key={todo.id}
                                initial={{ opacity: 1 }}
                                animate={{ opacity: fadingTodoId === todo.id ? 0 : 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 3, ease: "easeOut" }}
                              >
                                <TodoItem
                                  todo={todo}
              onToggleSubtask={handleToggleSubtask}
              togglingSubtaskId={togglingSubtaskId}
              onAddSubtask={handleAddSubtask}
              pendingTodoId={subtaskPendingTodoId}
                                  selectedTasks={selectedTasks}
                                  onToggleTaskSelection={handleToggleTaskSelection}
                                  onDeleteTodo={handleDeleteTodo}
                                  onUpdateTodo={handleUpdateTodo}
                                  onDeleteSubtask={handleDeleteSubtask}
                                  onUpdateSubtask={handleUpdateSubtask}
                                />
                              </motion.div>
                            ))}
                          </AnimatePresence>
          </div>
                      </motion.div>
                    </div>

                    <div className="space-y-4">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4"
                      >
                        <h3 className="text-lg font-semibold text-white mb-4">Schedule</h3>
                        <div className="space-y-4">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <label className="text-xs text-white/70">
                                Wait (min)
                    </label>
                    <Input
                      type="number"
                                min={0}
                      value={waitMinutes}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === "" || value === "-" || /^-?\d*\.?\d*$/.test(value)) {
                                    setWaitMinutes(value);
                                  }
                                }}
                                onBlur={(e) => {
                                  const num = Number(e.target.value);
                                  if (isNaN(num) || num < 0) {
                                    setWaitMinutes("0");
                                  } else {
                                    setWaitMinutes(String(Math.floor(num)));
                                  }
                                }}
                                className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                            <div className="space-y-1.5">
                              <label className="text-xs text-white/70">
                                Focus (min)
                    </label>
                    <Input
                      type="number"
                                min={0}
                      value={focusMinutes}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === "" || value === "-" || /^-?\d*\.?\d*$/.test(value)) {
                                    setFocusMinutes(value);
                                  }
                                }}
                                onBlur={(e) => {
                                  const num = Number(e.target.value);
                                  if (isNaN(num) || num < 0) {
                                    setFocusMinutes("0");
                                  } else {
                                    setFocusMinutes(String(Math.floor(num)));
                                  }
                                }}
                                className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                          <Button
                            onClick={() => setShowTaskSelector(!showTaskSelector)}
                            variant="outline"
                            className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                          >
                            {selectedTasksCount > 0
                              ? `${selectedTasksCount} task${selectedTasksCount > 1 ? "s" : ""} selected`
                              : "Select tasks"}
                          </Button>

                          {showTaskSelector && (
                            <div className="space-y-2 rounded-lg border border-white/20 bg-white/10 p-3">
                              {todos.map((todo) =>
                                todo.subtasks.length > 0 ? (
                                  <div key={todo.id} className="space-y-1.5">
                                    <p className="text-sm font-medium text-white">{todo.title}</p>
                                    {todo.subtasks.map((subtask) => {
                                      const isSelected = selectedTasks
                                        .find((st) => st.todoId === todo.id)
                                        ?.subtaskIds.includes(subtask.id);
                                      return (
                                        <label
                                          key={subtask.id}
                                          className="flex items-center gap-2 rounded px-2 py-1 hover:bg-white/10"
                                        >
                                          <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() =>
                                              handleToggleTaskSelection(todo.id, subtask.id)
                                            }
                                          />
                                          <span className="text-sm text-white">{subtask.label}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                ) : null,
                              )}
                              {todos.every((t) => t.subtasks.length === 0) && (
                                <p className="py-4 text-center text-sm text-white/50">
                                  Add subtasks to tasks first
                                </p>
                              )}
                </div>
                          )}

                <Button
                  onClick={handleSchedule}
                  disabled={schedulingDisabled}
                            className="w-full bg-white/20 hover:bg-white/30 text-white"
                >
                            <Clock className="h-4 w-4" />
                            Start
                </Button>
                        </div>
                      </motion.div>

                      <WaitCountdownCard
                        countdown={waitCountdown}
                        onCancel={handleCancelWait}
                        todos={todos}
                      />

            <TimerRingCard
              focusSession={focusSession}
                        todos={todos}
              onAbort={handleAbortSession}
              onComplete={handleCompleteEarly}
            />
          </div>
        </div>
                </motion.div>
              )}

              {currentView === "stats" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-white mb-2">Stats</h1>
                  </div>
                  {statsLoading ? (
                    <div className="text-center text-white/70">Loading...</div>
                  ) : statsData ? (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4"
                        >
                          <h3 className="text-base font-semibold text-white mb-2">Today's Sessions</h3>
                          <p className="text-3xl font-semibold text-white">{statsData.todayTotals.sessions}</p>
                          <p className="mt-1 text-sm text-white/70">Today</p>
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4"
                        >
                          <h3 className="text-base font-semibold text-white mb-2">Today's Focus Time</h3>
                          <p className="text-3xl font-semibold text-white">{statsData.todayTotals.minutes}</p>
                          <p className="mt-1 text-sm text-white/70">Minutes</p>
                        </motion.div>
      </div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4"
                      >
                        <h3 className="text-base font-semibold text-white mb-4">Today's Focus Time</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={statsData.hourly}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis
                              dataKey="interval"
                              stroke="rgba(255,255,255,0.7)"
                              fontSize={10}
                              angle={-45}
                              textAnchor="end"
                              height={80}
                            />
                            <YAxis stroke="rgba(255,255,255,0.7)" fontSize={12} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "rgba(0,0,0,0.8)",
                                border: "1px solid rgba(255,255,255,0.2)",
                                borderRadius: "0.5rem",
                                color: "white",
                              }}
                              formatter={(value: number) => [`${value} min`, "Focus Time"]}
                            />
                            <Bar dataKey="minutes" fill="rgba(255,255,255,0.8)" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4"
                      >
                        <h3 className="text-base font-semibold text-white mb-4">Weekly Focus Hours</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={statsData.daily}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis
                              dataKey="day"
                              stroke="rgba(255,255,255,0.7)"
                              fontSize={12}
                            />
                            <YAxis stroke="rgba(255,255,255,0.7)" fontSize={12} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "rgba(0,0,0,0.8)",
                                border: "1px solid rgba(255,255,255,0.2)",
                                borderRadius: "0.5rem",
                                color: "white",
                              }}
                              formatter={(value: number) => [`${value} hrs`, "Focus Time"]}
                            />
                            <Bar dataKey="hours" fill="rgba(255,255,255,0.8)" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </motion.div>
                    </>
                  ) : (
                    <div className="text-center text-white/70">Failed to load stats</div>
                  )}
                </motion.div>
              )}

              {currentView === "archive" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-white mb-2">Archive</h1>
    </div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4"
                  >
                    <Input
                      placeholder="Search..."
                      value={archiveSearchTerm}
                      onChange={(e) => setArchiveSearchTerm(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </motion.div>
                  {archiveLoading ? (
                    <div className="text-center text-white/70">Loading...</div>
                  ) : filteredArchiveTodos.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-12 text-center"
                    >
                      <p className="text-white/70">
                        {archiveSearchTerm ? "没有找到匹配的任务" : "No archived tasks"}
                      </p>
                    </motion.div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {filteredArchiveTodos.map((todo) => (
                        <motion.div
              key={todo.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-semibold text-white">{todo.title}</h3>
                            <span className="text-sm text-white/70">
                              {formatArchivedDate(todo.archivedAt)}
                            </span>
                </div>
                          {todo.subtasks.length > 0 && (
                            <div className="space-y-1 mb-4">
                {todo.subtasks.map((subtask) => (
                                <div
                    key={subtask.id}
                                  className="flex items-center justify-between gap-2 text-sm"
                                >
                                  <div className="flex items-center gap-2 flex-1">
                                    <CheckCircle2
                                      className={`h-4 w-4 ${
                                        subtask.done
                                          ? "text-green-400"
                                          : "text-white/50"
                                      }`}
                    />
                    <span
                                      className={
                                        subtask.done
                                          ? "text-white/50 line-through"
                                          : "text-white"
                                      }
                    >
                      {subtask.label}
                    </span>
                                  </div>
                                  {subtask.totalSeconds !== undefined && (
                                    <span className="text-xs text-white/70 font-medium tabular-nums">
                                      {Math.floor(subtask.totalSeconds / 60)}m
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          <Button
                            onClick={() => handleRestore(todo.id)}
                            disabled={restoringTodoId === todo.id}
                            variant="outline"
                            size="sm"
                            className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            {restoringTodoId === todo.id ? "恢复中..." : "Restore"}
                          </Button>
                        </motion.div>
                      ))}
              </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </ImmersiveLayout>
      )}

      <CelebrateModal
        open={celebrateOpen}
        note={celebrateNote}
        onNoteChange={setCelebrateNote}
        onSave={handleCelebrateSave}
        onDismiss={handleCelebrateDismiss}
        focusSession={focusSession}
      />
    </>
  );
}

function TodoItem({
  todo,
  onToggleSubtask,
  togglingSubtaskId,
  onAddSubtask,
  pendingTodoId,
  selectedTasks,
  onToggleTaskSelection,
  onDeleteTodo,
  onUpdateTodo,
  onDeleteSubtask,
  onUpdateSubtask,
}: {
  todo: Todo;
  onToggleSubtask: (todoId: string, subtaskId: string) => void;
  togglingSubtaskId: string | null;
  onAddSubtask: (todoId: string, label: string) => void;
  pendingTodoId: string | null;
  selectedTasks: Array<{ todoId: string; subtaskIds: string[] }>;
  onToggleTaskSelection: (todoId: string, subtaskId: string) => void;
  onDeleteTodo: (todoId: string) => void;
  onUpdateTodo: (todoId: string, newTitle: string) => void;
  onDeleteSubtask: (todoId: string, subtaskId: string) => void;
  onUpdateSubtask: (todoId: string, subtaskId: string, newLabel: string) => void;
}) {
  const [newSubtask, setNewSubtask] = useState("");
  const [editingTodo, setEditingTodo] = useState(false);
  const [editingTodoTitle, setEditingTodoTitle] = useState(todo.title);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskLabel, setEditingSubtaskLabel] = useState("");

  const handleAdd = () => {
    if (!newSubtask.trim()) return;
    onAddSubtask(todo.id, newSubtask.trim());
    setNewSubtask("");
  };

  const handleSaveTodo = () => {
    if (editingTodoTitle.trim()) {
      onUpdateTodo(todo.id, editingTodoTitle);
    }
    setEditingTodo(false);
  };

  const handleStartEditSubtask = (subtask: Subtask) => {
    setEditingSubtaskId(subtask.id);
    setEditingSubtaskLabel(subtask.label);
  };

  const handleSaveSubtask = (subtaskId: string) => {
    if (editingSubtaskLabel.trim()) {
      onUpdateSubtask(todo.id, subtaskId, editingSubtaskLabel);
    }
    setEditingSubtaskId(null);
    setEditingSubtaskLabel("");
  };

  return (
    <div className="rounded-lg border border-white/20 bg-black/30 backdrop-blur-md p-3 mb-2">
      <div className="mb-2 flex items-center gap-2">
        {editingTodo ? (
          <>
        <Input
              value={editingTodoTitle}
              onChange={(e) => setEditingTodoTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveTodo();
                if (e.key === "Escape") {
                  setEditingTodo(false);
                  setEditingTodoTitle(todo.title);
                }
              }}
              className="h-7 flex-1 text-sm bg-white/10 border-white/20 text-white"
              autoFocus
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-white hover:bg-white/20"
              onClick={handleSaveTodo}
            >
              <Check className="h-3 w-3" />
        </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-white hover:bg-white/20"
              onClick={() => {
                setEditingTodo(false);
                setEditingTodoTitle(todo.title);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </>
        ) : (
          <>
            <p 
              className="flex-1 text-sm font-medium cursor-pointer select-none text-white"
              onDoubleClick={() => {
                setEditingTodo(true);
                setEditingTodoTitle(todo.title);
              }}
            >
              {todo.title}
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-white/70 hover:text-white hover:bg-white/20"
              onClick={() => {
                setEditingTodo(true);
                setEditingTodoTitle(todo.title);
              }}
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteTodo(todo.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </>
        )}
                </div>
      <div className="space-y-1">
                {todo.subtasks.map((subtask) => (
          <div
                    key={subtask.id}
            className="group flex items-center gap-2 rounded px-1.5 py-1 hover:bg-white/10"
                  >
                    <Checkbox
                      checked={subtask.done}
                      disabled={togglingSubtaskId === subtask.id}
              onCheckedChange={() => onToggleSubtask(todo.id, subtask.id)}
            />
            {editingSubtaskId === subtask.id ? (
              <>
                <Input
                  value={editingSubtaskLabel}
                  onChange={(e) => setEditingSubtaskLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveSubtask(subtask.id);
                    if (e.key === "Escape") {
                      setEditingSubtaskId(null);
                      setEditingSubtaskLabel("");
                    }
                  }}
                  className="h-7 flex-1 text-sm bg-white/10 border-white/20 text-white"
                  autoFocus
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-white hover:bg-white/20"
                  onClick={() => handleSaveSubtask(subtask.id)}
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-white hover:bg-white/20"
                  onClick={() => {
                    setEditingSubtaskId(null);
                    setEditingSubtaskLabel("");
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </>
            ) : (
              <>
                    <span
              className={cn(
                    "flex-1 text-sm cursor-pointer select-none text-white",
                        subtask.done && "text-white/50 line-through",
                      )}
                      onDoubleClick={() => handleStartEditSubtask(subtask)}
                    >
                      {subtask.label}
                    </span>
                    {subtask.totalSeconds !== undefined && (
                      <span className="text-xs text-white/70 font-medium tabular-nums">
                        {Math.floor(subtask.totalSeconds / 60)}m
                      </span>
                    )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleStartEditSubtask(subtask)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onDeleteSubtask(todo.id, subtask.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
                )}
        </div>
        ))}
        <div className="flex gap-1.5 pt-1">
              <Input
            placeholder="Add subtask..."
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                    handleAdd();
                  }
                }}
            className="h-8 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/50"
            disabled={pendingTodoId === todo.id}
              />
              <Button
            size="sm"
            variant="ghost"
                onClick={handleAdd}
            disabled={pendingTodoId === todo.id || !newSubtask.trim()}
            className="h-8 px-2 text-white hover:bg-white/20"
              >
            <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
    </div>
  );
}

function WaitCountdownCard({
  countdown,
  onCancel,
  todos,
}: {
  countdown: WaitCountdown | null;
  onCancel: () => void;
  todos: Todo[];
}) {
  if (!countdown) return null;

  const taskLabels = countdown.selectedTasks
    .map((st) => {
      const todo = todos.find((t) => t.id === st.todoId);
      if (!todo) return "";
      const subtaskLabels = st.subtaskIds
        .map((sid) => {
          const subtask = todo.subtasks.find((s) => s.id === sid);
          return subtask?.label;
        })
        .filter(Boolean);
      return `${todo.title}${subtaskLabels.length > 0 ? ` (${subtaskLabels.join(", ")})` : ""}`;
    })
    .filter(Boolean);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlarmClock className="h-4 w-4" />
          Waiting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
            <div className="text-center">
          <p className="text-4xl font-semibold">
                {formatSeconds(countdown.remainingSeconds)}
              </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {taskLabels.join("; ")}
              </p>
            </div>
        <Button variant="outline" onClick={onCancel} className="w-full">
              <TimerReset className="h-4 w-4" />
          Cancel
            </Button>
      </CardContent>
    </Card>
  );
}

function TimerRingCard({
  focusSession,
  todos,
  onAbort,
  onComplete,
}: {
  focusSession: FocusSession | null;
  todos: Todo[];
  onAbort: () => void;
  onComplete: () => void;
}) {
  if (!focusSession) return null;

  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const progress =
    focusSession.totalSeconds > 0
      ? 1 - Math.max(0, focusSession.remainingSeconds) / focusSession.totalSeconds
      : 0;

  const taskLabels = focusSession.selectedTasks
    .map((st) => {
      const todo = todos.find((t) => t.id === st.todoId);
      if (!todo) return "";
      const subtaskLabels = st.subtaskIds
        .map((sid) => {
          const subtask = todo.subtasks.find((s) => s.id === sid);
          return subtask?.label;
        })
        .filter(Boolean);
      return `${todo.title}${subtaskLabels.length > 0 ? ` (${subtaskLabels.join(", ")})` : ""}`;
    })
    .filter(Boolean);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Focus
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex items-center justify-center">
            <svg width={radius * 2 + 10} height={radius * 2 + 10}>
              <circle
                cx={radius + 5}
                cy={radius + 5}
                r={radius}
                stroke="hsl(var(--muted-foreground)/0.2)"
                strokeWidth="12"
                fill="transparent"
                strokeLinecap="round"
              />
              <motion.circle
                cx={radius + 5}
                cy={radius + 5}
                r={radius}
                stroke="hsl(var(--foreground))"
                strokeWidth="12"
                fill="transparent"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - progress * circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{
                  strokeDashoffset: circumference - progress * circumference,
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            </svg>
            <div className="absolute text-center">
              <p className="text-3xl font-semibold">
                {formatSeconds(focusSession.remainingSeconds)}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {taskLabels.join("; ")}
          </p>
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={onAbort} className="flex-1">
              <PauseCircle className="h-4 w-4" />
              Stop
            </Button>
            <Button variant="secondary" onClick={onComplete} className="flex-1">
              <CheckCircle2 className="h-4 w-4" />
              Complete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CelebrateModal({
  open,
  note,
  onNoteChange,
  onSave,
  onDismiss,
  focusSession,
}: {
  open: boolean;
  note: string;
  onNoteChange: (value: string) => void;
  onSave: () => void;
  onDismiss: () => void;
  focusSession: FocusSession | null;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            <h3 className="text-lg font-semibold mb-2">Complete</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Session completed. Add a note?
            </p>
              <Textarea
              placeholder="Note..."
                value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              className="mb-4"
              />
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={onDismiss}>
                Skip
              </Button>
              <Button className="flex-1" onClick={onSave}>
                Save
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LoadingCard() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="rounded-lg border border-border bg-card px-8 py-6 text-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function AuthRequiredCard() {
  return (
    <div className="flex h-screen">
      <div className="flex-1">
        <LampContainer>
          <motion.h1
            initial={{ opacity: 0.5, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.3,
              duration: 0.8,
              ease: "easeInOut",
            }}
            className="mt-8 bg-gradient-to-br from-slate-300 to-slate-500 py-4 bg-clip-text text-center text-4xl font-medium tracking-tight text-transparent md:text-7xl"
          >
            Focus on what matters
            <br />
            Start your journey
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.6,
              duration: 0.8,
              ease: "easeInOut",
            }}
            className="mt-8 text-center text-lg text-slate-400"
          >
            Sign in to manage your tasks and track your focus time
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.9,
              duration: 0.8,
              ease: "easeInOut",
            }}
            className="mt-8 flex gap-4"
          >
            <Button asChild size="lg" className="shadow-none">
              <Link href="/auth/login">Sign in</Link>
          </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/auth/sign-up">Sign up</Link>
          </Button>
          </motion.div>
        </LampContainer>
      </div>
    </div>
  );
}

function formatSeconds(seconds: number) {
  const clamped = Math.max(0, seconds);
  const mins = Math.floor(clamped / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(clamped % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}
