import { useSyncExternalStore } from "react";
import { homePathFor, useAuthStore } from "@/stores/auth";
import { LandingHeader } from "@/components/landing/landing-header";
import { HeroSection } from "@/components/landing/hero-section";
import { FeatureSection } from "@/components/landing/feature-section";
import { LandingFooter } from "@/components/landing/landing-footer";

/** Trang chủ public — giới thiệu ngắn, minh họa bằng mảnh giao diện thật. */
export default function RootPage() {
  const user = useAuthStore((s) => s.user);

  // Chờ zustand persist hydrate xong mới biết đã đăng nhập hay chưa
  const hydrated = useSyncExternalStore(
    (onStoreChange) => useAuthStore.persist.onFinishHydration(onStoreChange),
    () => useAuthStore.persist.hasHydrated(),
    () => false
  );

  const loggedIn = hydrated && user != null;
  const ctaHref = loggedIn ? homePathFor(user) : "/login";
  const ctaLabel = loggedIn ? "Vào hệ thống" : "Đăng nhập";

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <LandingHeader ctaHref={ctaHref} ctaLabel={ctaLabel} loggedIn={loggedIn} />
      <main>
        <HeroSection ctaHref={ctaHref} ctaLabel={ctaLabel} />
        <FeatureSection />
      </main>
      <LandingFooter ctaHref={ctaHref} ctaLabel={ctaLabel} />
    </div>
  );
}
