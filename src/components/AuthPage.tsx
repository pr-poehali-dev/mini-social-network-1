import { useState } from "react";
import Icon from "@/components/ui/icon";
import { register, login, saveToken, AuthUser } from "@/lib/auth";

interface Props {
  onAuth: (user: AuthUser) => void;
}

export default function AuthPage({ onAuth }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
  });

  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setError("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = mode === "login"
      ? await login(form.email, form.password)
      : await register(form.name, form.username, form.email, form.password);

    setLoading(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    saveToken(res.token);
    onAuth(res.user);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-foreground rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Icon name="Zap" size={22} className="text-background" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">no-chat</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login" ? "Войдите в свой аккаунт" : "Создайте аккаунт"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="bg-white border border-border rounded-2xl p-6 space-y-4">
          {mode === "register" && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Имя</label>
                <input
                  value={form.name}
                  onChange={e => set("name", e.target.value)}
                  placeholder="Алексей Соколов"
                  className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Имя пользователя</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                  <input
                    value={form.username}
                    onChange={e => set("username", e.target.value.replace(/\s/g, ""))}
                    placeholder="sokolov"
                    className="w-full pl-7 pr-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all"
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => set("email", e.target.value)}
              placeholder="alex@example.com"
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Пароль</label>
            <input
              type="password"
              value={form.password}
              onChange={e => set("password", e.target.value)}
              placeholder={mode === "register" ? "Минимум 6 символов" : "••••••••"}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 animate-fade-in">
              <Icon name="AlertCircle" size={14} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-foreground text-background text-sm font-medium rounded-xl hover:opacity-85 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
          >
            {loading && <Icon name="Loader2" size={15} className="animate-spin" />}
            {mode === "login" ? "Войти" : "Создать аккаунт"}
          </button>
        </form>

        {/* Toggle */}
        <p className="text-center text-sm text-muted-foreground mt-4">
          {mode === "login" ? "Нет аккаунта?" : "Уже есть аккаунт?"}{" "}
          <button
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            className="text-foreground font-medium hover:underline"
          >
            {mode === "login" ? "Зарегистрироваться" : "Войти"}
          </button>
        </p>
      </div>
    </div>
  );
}
