import { useState } from "react";
import Icon from "@/components/ui/icon";
import { register, login, saveToken, findAccount, resetPassword, AuthUser } from "@/lib/auth";

interface Props {
  onAuth: (user: AuthUser) => void;
}

type Mode = "login" | "register" | "reset";

export default function AuthPage({ onAuth }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetStep, setResetStep] = useState<"email" | "password">("email");
  const [resetEmail, setResetEmail] = useState("");
  const [resetName, setResetName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [resetDone, setResetDone] = useState(false);

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

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
    setResetStep("email");
    setResetEmail("");
    setResetName("");
    setNewPassword("");
    setNewPassword2("");
    setResetDone(false);
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (resetStep === "email") {
        const res = await findAccount(resetEmail);
        if (res.error) { setError(res.error); return; }
        setResetName(res.name);
        setResetStep("password");
      } else {
        if (newPassword !== newPassword2) { setError("Пароли не совпадают"); return; }
        if (newPassword.length < 6) { setError("Пароль минимум 6 символов"); return; }
        const res = await resetPassword(resetEmail, newPassword);
        if (res.error) { setError(res.error); return; }
        setResetDone(true);
      }
    } catch (e) {
      console.error("reset error:", e);
      setError("Ошибка соединения: " + String(e));
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = mode === "login"
        ? await login(form.email, form.password)
        : await register(form.name, form.username, form.email, form.password);

      if (res.error) {
        setError(res.error);
        return;
      }

      saveToken(res.token);
      onAuth(res.user);
    } catch {
      setError("Ошибка соединения. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all";
  const errorBlock = error && (
    <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 animate-fade-in">
      <Icon name="AlertCircle" size={14} />
      <span>{error}</span>
    </div>
  );

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
            {mode === "login" && "Войдите в свой аккаунт"}
            {mode === "register" && "Создайте аккаунт"}
            {mode === "reset" && "Восстановление пароля"}
          </p>
        </div>

        {/* Reset password form */}
        {mode === "reset" && (
          <>
            {resetDone ? (
              <div className="bg-white border border-border rounded-2xl p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Icon name="CheckCircle" size={22} className="text-green-600" />
                </div>
                <p className="text-sm font-medium">Пароль успешно изменён!</p>
                <button
                  onClick={() => switchMode("login")}
                  className="w-full py-2.5 bg-foreground text-background text-sm font-medium rounded-xl hover:opacity-85 transition-opacity"
                >
                  Войти
                </button>
              </div>
            ) : (
              <form onSubmit={submitReset} className="bg-white border border-border rounded-2xl p-6 space-y-4">
                {resetStep === "email" ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Email аккаунта</label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={e => { setResetEmail(e.target.value); setError(""); }}
                      placeholder="alex@example.com"
                      className={inputCls}
                      required
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-sm bg-secondary rounded-xl px-3 py-2.5">
                      <Icon name="User" size={14} className="text-muted-foreground" />
                      <span className="text-muted-foreground">Аккаунт найден:</span>
                      <span className="font-medium">{resetName}</span>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Новый пароль</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={e => { setNewPassword(e.target.value); setError(""); }}
                        placeholder="Минимум 6 символов"
                        className={inputCls}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Повторите пароль</label>
                      <input
                        type="password"
                        value={newPassword2}
                        onChange={e => { setNewPassword2(e.target.value); setError(""); }}
                        placeholder="••••••••"
                        className={inputCls}
                        required
                      />
                    </div>
                  </>
                )}
                {errorBlock}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-foreground text-background text-sm font-medium rounded-xl hover:opacity-85 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
                >
                  {loading && <Icon name="Loader2" size={15} className="animate-spin" />}
                  {resetStep === "email" ? "Найти аккаунт" : "Сохранить пароль"}
                </button>
              </form>
            )}
            <p className="text-center text-sm text-muted-foreground mt-4">
              <button onClick={() => switchMode("login")} className="text-foreground font-medium hover:underline">
                Вернуться ко входу
              </button>
            </p>
          </>
        )}

        {/* Login / Register form */}
        {mode !== "reset" && (
          <>
            <form onSubmit={submit} className="bg-white border border-border rounded-2xl p-6 space-y-4">
              {mode === "register" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Имя</label>
                    <input
                      value={form.name}
                      onChange={e => set("name", e.target.value)}
                      placeholder="Алексей Соколов"
                      className={inputCls}
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
                  className={inputCls}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Пароль</label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => switchMode("reset")}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Забыли пароль?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => set("password", e.target.value)}
                  placeholder={mode === "register" ? "Минимум 6 символов" : "••••••••"}
                  className={inputCls}
                  required
                />
              </div>

              {errorBlock}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-foreground text-background text-sm font-medium rounded-xl hover:opacity-85 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
              >
                {loading && <Icon name="Loader2" size={15} className="animate-spin" />}
                {mode === "login" ? "Войти" : "Создать аккаунт"}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              {mode === "login" ? "Нет аккаунта?" : "Уже есть аккаунт?"}{" "}
              <button
                onClick={() => switchMode(mode === "login" ? "register" : "login")}
                className="text-foreground font-medium hover:underline"
              >
                {mode === "login" ? "Зарегистрироваться" : "Войти"}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}