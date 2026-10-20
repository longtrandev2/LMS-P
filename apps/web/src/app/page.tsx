"use client";

import { useSyncExternalStore } from "react";
import { homePathFor, useAuthStore } from "@/stores/auth";
import { LandingHeader } from "@/components/landing/landing-header";
import { HeroSection } from "@/components/landing/hero-section";
import { PillarsSection } from "@/components/landing/pillars-section";
import { ClassesSection } from "@/components/landing/classes-section";
import { RolesSection } from "@/components/landing/roles-section";
import { LandingFooter } from "@/components/landing/landing-footer";

/** Trang chủ public — landing page giới thiệu hệ thống */
export default function RootPage() {
  const user = useAuthStore((s) => s.user);

  // Tránh hydration mismatch: SSR/prerender thấy false, client thấy true sau khi persist hydrate
  const hydrated = useSyncExternalStore(
    (onStoreChange) => useAuthStore.persist.onFinishHydration(onStoreChange),
    () => useAuthStore.persist.hasHydrated(),
    () => false
  );

  // Chưa đăng nhập → "/login"; đã đăng nhập → trang chủ theo vai trò
  const loggedIn = hydrated && user != null;
  const ctaHref = loggedIn ? homePathFor(user) : "/login";
  const ctaLabel = loggedIn ? "Vào hệ thống" : "Dùng thử ngay";

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <LandingHeader ctaHref={ctaHref} ctaLabel={ctaLabel} />
      <main>
        <HeroSection ctaHref={ctaHref} ctaLabel={ctaLabel} />
        <PillarsSection />
        <ClassesSection />
        <RolesSection />
      </main>
      <LandingFooter ctaHref={ctaHref} ctaLabel={ctaLabel} />
    </div>
  );
}
