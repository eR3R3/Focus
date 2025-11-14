"use client";

import { useEffect, useState, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import { LogoutButton } from "@/components/logout-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

type Subtask = {
  id: string;
  label: string;
  done: boolean;
  totalSeconds?: number;
};

type ArchivedTodo = {
  id: string;
  title: string;
  archivedAt: string;
  subtasks: Subtask[];
};

export default function ArchivePage() {
  const router = useRouter();
  const [todos, setTodos] = useState<ArchivedTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringTodoId, setRestoringTodoId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTodos = useMemo(() => {
    if (!searchTerm) return todos;
    return todos.filter((todo) =>
      todo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      todo.subtasks.some((subtask) =>
        subtask.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [todos, searchTerm]);

  const loadArchive = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ctdp/archive");
      if (response.status === 401) {
        window.location.href = "/";
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to load archive");
      }
      const payload = (await response.json()) as { todos: ArchivedTodo[] };
      setTodos(payload.todos ?? []);
    } catch (err) {
      console.error(err);
      setError("加载归档失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArchive();
  }, [loadArchive]);

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
      // Remove from archive list
      setTodos((prev) => prev.filter((todo) => todo.id !== todoId));
      // Redirect to home page
      router.push("/");
    } catch (err) {
      console.error(err);
      alert("恢复任务失败，请稍后再试。");
    } finally {
      setRestoringTodoId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-5xl p-6">
            <p className="text-muted-foreground">加载中...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="mx-auto max-w-7xl space-y-6 p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Archive</h1>
            <div className="flex items-center gap-4">
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
              <LogoutButton />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
              <Button
                variant="ghost"
                className="ml-3 h-8 px-3 text-destructive"
                onClick={loadArchive}
              >
                重试
              </Button>
            </div>
          )}

          {filteredTodos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>{searchTerm ? "没有找到匹配的任务" : "暂无归档的任务"}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTodos.map((todo) => (
                <Card key={todo.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{todo.title}</CardTitle>
                      <span className="text-sm text-muted-foreground">
                        {formatArchivedDate(todo.archivedAt)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
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
                                    ? "text-green-600"
                                    : "text-muted-foreground"
                                }`}
                              />
                              <span
                                className={
                                  subtask.done
                                    ? "text-muted-foreground line-through"
                                    : ""
                                }
                              >
                                {subtask.label}
                              </span>
                            </div>
                            {subtask.totalSeconds !== undefined && (
                              <span className="text-xs text-muted-foreground font-medium tabular-nums">
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
                      className="w-full"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      {restoringTodoId === todo.id ? "恢复中..." : "Restore"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

