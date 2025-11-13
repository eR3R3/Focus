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
import { CheckCircle2 } from "lucide-react";

type Subtask = {
  id: string;
  label: string;
  done: boolean;
};

type ArchivedTodo = {
  id: string;
  title: string;
  archivedAt: string;
  subtasks: Subtask[];
};

export default function ArchivePage() {
  const [todos, setTodos] = useState<ArchivedTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <div className="mx-auto max-w-5xl space-y-6 p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Archive</h1>
            <LogoutButton />
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

          {todos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>暂无归档的任务</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {todos.map((todo) => (
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
                      <div className="space-y-1">
                        {todo.subtasks.map((subtask) => (
                          <div
                            key={subtask.id}
                            className="flex items-center gap-2 text-sm"
                          >
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
                        ))}
                      </div>
                    )}
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

