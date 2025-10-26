import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { logger } from "@/lib/logger";
import { MaintenanceCountdown } from "@/components/MaintenanceCountdown";
import { MaintenanceWaitlistForm } from "@/components/MaintenanceWaitlistForm";

interface MaintenanceSettings {
  is_enabled: boolean;
  maintenance_start: string | null;
  maintenance_end: string | null;
  title: string;
  message: string;
  countdown_message: string;
}

export const MaintenanceNotice = () => {
  const [settings, setSettings] = useState<MaintenanceSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    loadSettings();
  }, []);

  if (loading || !settings) {
    return null;
  }

  const countdownActive = () => {
    if (!settings.maintenance_end) return false;
    return new Date(settings.maintenance_end).getTime() > Date.now();
  };

  return (
    <div className="min-h-[100svh] min-h-[100dvh] flex flex-col bg-gradient-to-br from-[#0f172a] via-[#1d2a5c] to-[#0f172a] text-white">
      <main className="flex-1 flex flex-col items-center px-4 pt-24 pb-8 sm:px-6 sm:pt-16 sm:pb-12 text-center">
        <div className="flex flex-col flex-1 w-full max-w-3xl text-center">
          <div className="flex flex-col items-center justify-center flex-1 gap-5 sm:gap-6">
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
        </div>
      </main>

      <footer className="mt-auto py-6 text-center text-xs text-white/70">
        <Button asChild variant="outline" className="gap-2 border-white/40 text-white hover:bg-white/10">
          <Link to="/">
            Kembali ke Beranda
          </Link>
        </Button>
        <div className="mt-4">© {new Date().getFullYear()} TeeLiteClub. All rights reserved.</div>
      </footer>
    </div>
  );
};
