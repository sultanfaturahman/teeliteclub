import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MaintenanceCountdown } from "@/components/MaintenanceCountdown";
import { MaintenanceWaitlistForm } from "@/components/MaintenanceWaitlistForm";
import { MobileSafeWrapper } from "@/components/MobileSafeWrapper";
const Index = () => {
  const [heroImage, setHeroImage] = useState("/lovable-uploads/a773ac2f-9e06-49da-a3b9-b4425905b493.png");
  const [isMaintenanceActive, setIsMaintenanceActive] = useState(false);
  const [maintenanceTarget, setMaintenanceTarget] = useState<string | null>(null);
  const [countdownMessage, setCountdownMessage] = useState<string | null>(null);
  const [maintenanceTitle, setMaintenanceTitle] = useState<string | null>(null);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string | null>(null);
  
  useEffect(() => {
    loadHeroImage();
    loadMaintenanceStatus();
  }, []);
  const loadHeroImage = async () => {
    try {
      const {
        data
      } = await supabase.from('system_settings').select('value').eq('key', 'hero_image_url').single();
      if (data?.value) {
        setHeroImage(data.value);
      }
    } catch (error) {
      console.error('Failed to load hero image:', error);
      // Keep default image if loading fails
    }
  };
  const loadMaintenanceStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_settings')
        .select('is_enabled, maintenance_start, maintenance_end, countdown_message, title, message')
        .single();

      if (error) {
        console.error('Failed to load maintenance status:', error);
        setIsMaintenanceActive(false);
        setMaintenanceTarget(null);
        setCountdownMessage(null);
        setMaintenanceTitle(null);
        setMaintenanceMessage(null);
        return;
      }

      if (!data) {
        setIsMaintenanceActive(false);
        setMaintenanceTarget(null);
        setCountdownMessage(null);
        setMaintenanceTitle(null);
        setMaintenanceMessage(null);
        return;
      }

      const now = new Date();
      let active = data.is_enabled ?? false;

      if (active && data.maintenance_start) {
        active = active && now >= new Date(data.maintenance_start);
      }
      if (active && data.maintenance_end) {
        active = active && now < new Date(data.maintenance_end);
      }

      setIsMaintenanceActive(active);
      setMaintenanceTarget(active && data.maintenance_end ? data.maintenance_end : null);
      setCountdownMessage(data.countdown_message ?? null);
      setMaintenanceTitle(data.title ?? null);
      setMaintenanceMessage(data.message ?? null);
    } catch (error) {
      console.error('Failed to determine maintenance status:', error);
      setIsMaintenanceActive(false);
      setMaintenanceTarget(null);
      setCountdownMessage(null);
      setMaintenanceTitle(null);
      setMaintenanceMessage(null);
    }
  };
  return <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />

      {/* Hero Section */}
      <main className="relative overflow-hidden flex-1 min-h-screen">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{
        backgroundImage: `url(${heroImage})`
      }}>
          <div className="absolute inset-0 bg-black/40 rounded-none" />
        </div>
        <div className="relative z-10 flex items-center justify-center min-h-full">
          <div
            className={`flex flex-col items-center text-center ${
              isMaintenanceActive
                ? 'text-white pt-[8vh] pb-4 sm:pt-[10vh] sm:pb-14'
                : 'text-dark-blue py-[200px] sm:py-[220px]'
            }`}
          >
            <MobileSafeWrapper
              fallback={
                <Button
                  variant="outline"
                  size="lg"
                  className="px-12 py-6 text-lg font-medium border-white text-white bg-transparent hover:bg-white hover:text-dark-blue animate-scale-in"
                  asChild
                >
                  <Link to="/shop">Shop Now</Link>
                </Button>
              }
            >
              {isMaintenanceActive && maintenanceTarget ? (
  <div className="flex flex-col w-full max-w-none px-0 sm:px-8 min-h-[80vh] sm:min-h-0 sm:max-w-4xl">
    <div className="flex flex-col flex-1 w-full items-center text-center">
      <h1 className="text-[28px] sm:text-[44px] font-semibold tracking-tight leading-tight mt-6 sm:mt-8 mb-1 sm:mb-6">
        {maintenanceTitle ?? "Be Back Soon"}
      </h1>

      <div className="flex flex-1 flex-col items-center justify-center gap-0 sm:gap-10 w-full mt-0 sm:mt-10">
        <div className="w-full">
          <MaintenanceWaitlistForm formClassName="sm:max-w-xl -mt-1 sm:mt-0" />
        </div>

        <p className="text-[14px] sm:text-base text-white/80 max-w-2xl mx-auto leading-relaxed sm:leading-loose mt-4 sm:mt-0">
          {maintenanceMessage ?? "Leave an email so u can catch up"}
        </p>
      </div>
    </div>

    <div className="mt-auto sm:mt-32 flex flex-col items-center gap-1 sm:gap-3 pb-2 sm:pb-8 px-2 sm:px-0 w-full">
      {countdownMessage && (
        <p className="text-[13px] sm:text-sm text-white/70 font-medium text-center tracking-wide px-3 sm:px-0">
          {countdownMessage}
        </p>
      )}
      <div className="w-full flex justify-center">
        <MaintenanceCountdown target={maintenanceTarget} tone="dark" />
      </div>
    </div>
  </div>
) : null}

            </MobileSafeWrapper>

            {/* Always show button as fallback if maintenance component fails */}
            {!isMaintenanceActive && (
              <Button variant="outline" size="lg" className="px-12 py-6 text-lg font-medium border-white text-white bg-transparent hover:bg-white hover:text-dark-blue animate-scale-in" asChild>
                <Link to="/shop">Shop Now</Link>
              </Button>
            )}
          </div>
        </div>
  </main>

  <Footer />
</div>;
};
export default Index;
