import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format, isPast, isToday } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, LogOut, Loader2, Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: HomePage,
});

type Profile = { id: string; display_name: string; avatar_url: string | null };
type Task = {
  id: string;
  title: string;
  assigned_to: string | null;
  due_date: string | null;
  done: boolean;
  created_by: string;
};

function HomePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return <Dashboard userId={user.id} />;
}

function Dashboard({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  const profilesQ = useQuery({
    queryKey: ["profiles"],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .order("display_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const tasksQ = useQuery({
    queryKey: ["tasks"],
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, assigned_to, due_date, done, created_by")
        .order("done", { ascending: true })
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleDone = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ done, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task removed");
    },
    onError: (e: Error) => toast.error("Couldn't delete", { description: e.message }),
  });

  const profiles = profilesQ.data ?? [];
  const me = profiles.find((p) => p.id === userId);

  const tasks = useMemo(() => {
    const list = tasksQ.data ?? [];
    if (filter === "all") return list;
    if (filter === "unassigned") return list.filter((t) => !t.assigned_to);
    return list.filter((t) => t.assigned_to === filter);
  }, [tasksQ.data, filter]);

  const openCount = tasks.filter((t) => !t.done).length;

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <main className="min-h-screen pb-24">
      <header className="px-4 sm:px-6 pt-6 pb-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
              🏡
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold leading-tight">Hearth</h1>
              <p className="text-xs text-muted-foreground">
                {me ? `Hi, ${me.display_name.split(" ")[0]}` : "Family tasks"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {me && (
              <Avatar className="w-9 h-9">
                {me.avatar_url && <AvatarImage src={me.avatar_url} />}
                <AvatarFallback>{initials(me.display_name)}</AvatarFallback>
              </Avatar>
            )}
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <section className="px-4 sm:px-6 max-w-3xl mx-auto">
        <AddTaskForm userId={userId} profiles={profiles} />
      </section>

      <section className="px-4 sm:px-6 max-w-3xl mx-auto mt-8">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-2xl font-semibold">Tasks</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {openCount} open · {tasks.length - openCount} done
            </p>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[170px] bg-card">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Everyone</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {tasksQ.isLoading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-card border rounded-2xl py-16 text-center">
            <div className="text-4xl mb-2">✨</div>
            <p className="text-muted-foreground">Nothing on the list. Add the first task above.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => {
              const assignee = profiles.find((p) => p.id === t.assigned_to);
              const overdue = !t.done && t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date));
              const dueToday = !t.done && t.due_date && isToday(new Date(t.due_date));
              return (
                <li
                  key={t.id}
                  className={cn(
                    "group bg-card border rounded-2xl p-4 flex items-start gap-3 transition-all",
                    t.done && "opacity-60"
                  )}
                >
                  <button
                    onClick={() => toggleDone.mutate({ id: t.id, done: !t.done })}
                    className={cn(
                      "shrink-0 w-6 h-6 rounded-full border-2 transition-colors flex items-center justify-center mt-0.5",
                      t.done
                        ? "bg-success border-success text-success-foreground"
                        : "border-border hover:border-primary"
                    )}
                    aria-label={t.done ? "Mark not done" : "Mark done"}
                  >
                    {t.done && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={cn("font-medium leading-snug", t.done && "line-through")}>
                      {t.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                      {assignee ? (
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <Avatar className="w-5 h-5">
                            {assignee.avatar_url && <AvatarImage src={assignee.avatar_url} />}
                            <AvatarFallback className="text-[10px]">{initials(assignee.display_name)}</AvatarFallback>
                          </Avatar>
                          {assignee.display_name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                      {t.due_date && (
                        <Badge
                          variant="secondary"
                          className={cn(
                            "font-normal",
                            overdue && "bg-destructive/10 text-destructive",
                            dueToday && "bg-accent text-accent-foreground"
                          )}
                        >
                          <CalendarIcon className="w-3 h-3 mr-1" />
                          {format(new Date(t.due_date), "MMM d")}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteTask.mutate(t.id)}
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

function AddTaskForm({ userId, profiles }: { userId: string; profiles: Profile[] }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("unassigned");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [expanded, setExpanded] = useState(false);

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tasks").insert({
        title: title.trim(),
        assigned_to: assignedTo === "unassigned" ? null : assignedTo,
        due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
        created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setAssignedTo("unassigned");
      setDueDate(undefined);
      setExpanded(false);
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task added");
    },
    onError: (e: Error) => toast.error("Couldn't add task", { description: e.message }),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    create.mutate();
  };

  return (
    <form
      onSubmit={submit}
      className="bg-card border rounded-2xl p-3 shadow-sm focus-within:ring-2 focus-within:ring-primary/30 transition"
    >
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Plus className="w-4 h-4 text-primary" />
        </div>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setExpanded(true)}
          placeholder="Add a task…"
          className="border-0 shadow-none focus-visible:ring-0 px-0 text-base h-9 bg-transparent"
        />
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
          <Select value={assignedTo} onValueChange={setAssignedTo}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-9">
                <CalendarIcon className="w-4 h-4 mr-2" />
                {dueDate ? format(dueDate, "MMM d") : "Due date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dueDate}
                onSelect={setDueDate}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          <div className="flex-1" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9"
            onClick={() => { setExpanded(false); setTitle(""); setDueDate(undefined); setAssignedTo("unassigned"); }}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" className="h-9" disabled={!title.trim() || create.isPending}>
            {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add task"}
          </Button>
        </div>
      )}
    </form>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
