"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { homePathFor, useAuthStore } from "@/stores/auth";
import type { LoginResponse } from "@/types/api";

export function LoginForm() {
  const router = useRouter();
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
      router.replace(homePathFor(data.user));
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
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="font-heading text-xl font-bold">Đăng nhập</CardTitle>
        <CardDescription>Dùng tài khoản do trường cấp để truy cập hệ thống.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
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
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-invalid={!!formError}
            />
          </div>

          {formError ? (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Đang đăng nhập…" : "Đăng nhập"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Sai 5 lần liên tiếp, tài khoản sẽ tạm khóa 15 phút.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
