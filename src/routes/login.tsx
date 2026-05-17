import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

type Mode = "auth" | "reset";

function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("auth");

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [user, loading, navigate]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
            <span className="text-3xl">🏡</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold text-foreground mb-3">
            Welcome to Golden Family Task List
          </h1>
          <p className="text-muted-foreground text-lg">
            A warm, shared task list for your family.
          </p>
        </div>

        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          {mode === "reset" ? (
            <ResetRequestForm onBack={() => setMode("auth")} />
          ) : (
            <Tabs defaultValue="signin">
              <TabsList className="grid grid-cols-2 mb-6 w-full">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <SignInForm onForgot={() => setMode("reset")} />
              </TabsContent>
              <TabsContent value="signup">
                <SignUpForm />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </main>
  );
}

function SignInForm({ onForgot }: { onForgot: () => void }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error("Sign-in failed", { description: error.message });
      return;
    }
    navigate({ to: "/" });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signin-email">Email</Label>
        <Input
          id="signin-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signin-password">Password</Label>
        <Input
          id="signin-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" size="lg" className="w-full h-12 text-base" disabled={busy}>
        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign in"}
      </Button>
      <button
        type="button"
        onClick={onForgot}
        className="text-sm text-muted-foreground hover:text-foreground block w-full text-center mt-2"
      >
        Forgot password?
      </button>
    </form>
  );
}

function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: window.location.origin,
      },
    });
    setBusy(false);
    if (error) {
      toast.error("Sign-up failed", { description: error.message });
      return;
    }
    if (data.user && !data.session) {
      setSent(true);
      return;
    }
    // Auto-confirm enabled: useAuth picks up the new session and redirects.
  };

  if (sent) {
    return (
      <div className="text-center space-y-2 py-6">
        <p className="font-medium">Check your inbox</p>
        <p className="text-sm text-muted-foreground">
          We sent a confirmation link to <strong>{email}</strong>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-name">Your name</Label>
        <Input
          id="signup-name"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
      </div>
      <Button
        type="submit"
        size="lg"
        className="w-full h-12 text-base"
        disabled={busy || !name.trim()}
      >
        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create account"}
      </Button>
    </form>
  );
}

function ResetRequestForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast.error("Couldn't send reset link", { description: error.message });
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="text-center space-y-3 py-4">
        <p className="font-medium">Reset link sent</p>
        <p className="text-sm text-muted-foreground">
          If an account exists for <strong>{email}</strong>, you'll get an email with a reset link.
        </p>
        <Button variant="ghost" onClick={onBack}>Back to sign in</Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <p className="font-medium mb-1">Reset your password</p>
        <p className="text-sm text-muted-foreground">
          Enter the email you used to sign up and we'll send you a reset link.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="reset-email">Email</Label>
        <Input
          id="reset-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Button type="submit" size="lg" className="w-full h-12 text-base" disabled={busy}>
        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send reset link"}
      </Button>
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-muted-foreground hover:text-foreground block w-full text-center"
      >
        Back to sign in
      </button>
    </form>
  );
}
