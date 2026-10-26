import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { homePathFor, useAuthStore } from "@/stores/auth";
import type { LoginResponse } from "@/types/api";

export function LoginForm() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!email.trim() || !password) {
      setFormError("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await api.post<LoginResponse>("/auth/login", { email, password }, { anonymous: true });
      setSession(data);
      toast.success(`Xin chào, ${data.user.full_name}!`);
      navigate(homePathFor(data.user), { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.code === "RATE_LIMITED") {
        setFormError("Tài khoản tạm khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau 15 phút.");
      } else {
        setFormError(errorText(error));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="ten@truong.edu.vn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-invalid={!!formError}
            aria-describedby={formError ? "login-error" : undefined}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Mật khẩu</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-invalid={!!formError}
            aria-describedby={formError ? "login-error" : undefined}
          />
        </div>

        {formError ? (
          <p id="login-error" role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {formError}
          </p>
        ) : null}

        <Button type="submit" variant="cta" className="w-full" disabled={submitting}>
          {submitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {submitting ? "Đang đăng nhập…" : "Đăng nhập"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Sai mật khẩu 5 lần liên tiếp, tài khoản sẽ tạm khóa 15 phút.
        </p>
      </form>
    </div>
  );
}
