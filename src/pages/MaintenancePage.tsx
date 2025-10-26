import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MaintenanceCountdown } from "@/components/MaintenanceCountdown";
import { MaintenanceWaitlistForm } from "@/components/MaintenanceWaitlistForm";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { Home, KeyRound, RefreshCw, Wrench } from "lucide-react";

interface MaintenanceSettings {
  is_enabled: boolean;
  maintenance_start: string | null;
  maintenance_end: string | null;
  title: string;
  message: string;
  countdown_message: string;
}

const MaintenancePage = () => {
  const [settings, setSettings] = useState<MaintenanceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [clickCount, setClickCount] = useState(0);
  const [showAdminButton, setShowAdminButton] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("maintenance_settings")
        .select("*")
        .single();

      if (error) {
        logger.error("Failed to load maintenance settings", error);
        setSettings(null);
        return;
      }

      setSettings(data);
    } catch (error) {
      logger.error("Failed to load maintenance settings", error);
      setSettings(null);
    } finally {
      setLoading(false);
    }
  };

  const handleIconClick = () => {
    const next = clickCount + 1;
    setClickCount(next);
    if (next >= 5) {
      setShowAdminButton(true);
    }
    setTimeout(() => setClickCount(0), 3000);
  };

  const countdownActive = () => {
    if (!settings?.maintenance_end) return false;
    return new Date(settings.maintenance_end).getTime() > Date.now();
  };

  if (loading) {
    return (
      <div className="min-h-[100svh] min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1d2a5c] to-[#0f172a] text-white px-6">
        <div className="flex flex-col items-center gap-4 text-white/80">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-white" />
          <p>Memuat…</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-[100svh] min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1d2a5c] to-[#0f172a] px-6">
        <div className="w-full max-w-sm rounded-2xl bg-white/10 border border-white/30 p-8 text-center space-y-4 text-white">
          <Wrench className="mx-auto h-12 w-12" />
          <h1 className="text-xl font-semibold">Terjadi Kesalahan</h1>
          <p className="text-sm text-white/80">
            Gagal memuat pengaturan maintenance. Silakan coba lagi beberapa saat.
          </p>
          <Button onClick={loadSettings} variant="outline" className="gap-2 border-white/40 text-white">
            <RefreshCw className="h-4 w-4" />
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] min-h-[100dvh] flex flex-col bg-gradient-to-br from-[#0f172a] via-[#1d2a5c] to-[#0f172a] text-white">
      <main className="flex-1 flex flex-col items-center px-4 pt-24 pb-8 sm:px-6 sm:pt-16 sm:pb-12 text-center">
        <div className="flex flex-col flex-1 w-full max-w-3xl text-center">
          <div className="flex flex-col items-center justify-center flex-1 gap-5 sm:gap-6">
            <button
              type="button"
              onClick={handleIconClick}
              className={`h-12 w-12 flex items-center justify-center rounded-full border border-white/40 bg-white/10 text-white transition ${
                clickCount > 0 ? "ring-2 ring-white/30 animate-pulse" : ""
              }`}
              title={clickCount > 0 ? `${5 - clickCount} klik lagi untuk akses admin` : "Akses admin"}
            >
              <Wrench className="h-6 w-6" />
            </button>

            {clickCount > 0 && !showAdminButton && (
              <p className="text-xs text-white/70">
                {5 - clickCount} klik lagi untuk akses admin
              </p>
            )}

            <h1 className="text-[clamp(34px,4.5vw,48px)] leading-[1.2] sm:leading-[1.15] tracking-[-0.02em] font-bold">
              {settings.title}
            </h1>

            <MaintenanceWaitlistForm formClassName="max-w-md" />

            <p className="text-sm sm:text-base text-white/80 max-w-xl mx-auto">
              {settings.message}
            </p>
          </div>

          {settings.maintenance_end && (
            <div className="mt-auto flex flex-col items-center gap-3 pb-6 sm:pb-8">
              {countdownActive() && (
                <>
                  {settings.countdown_message && (
                    <p className="text-sm sm:text-base font-medium text-white">
                      {settings.countdown_message}
                    </p>
                  )}
                  <MaintenanceCountdown target={settings.maintenance_end} tone="dark" />
                </>
              )}

              <p className="text-xs text-white/70">
                {`Estimasi selesai: ${new Date(settings.maintenance_end).toLocaleString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}`}
              </p>
            </div>
          )}

          <div className="w-full pt-6 sm:pt-8 space-y-3 flex flex-col items-center">
            <Button asChild variant="outline" className="gap-2 border-white/40 text-white hover:bg-white/10">
              <Link to="/">
                <Home className="h-4 w-4" />
                Kembali ke Beranda
              </Link>
            </Button>

            {showAdminButton && (
              <Button
                variant="default"
                className="gap-2 bg-white/20 hover:bg-white/30 text-white border border-white/40"
                onClick={() => {
                  window.location.href = "/auth?mode=signin";
                }}
              >
                <KeyRound className="h-4 w-4" />
                Login Admin
              </Button>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-auto py-6 text-center text-xs text-white/70">
        © {new Date().getFullYear()} TeeLiteClub. All rights reserved.
      </footer>
    </div>
  );
};

export default MaintenancePage;
