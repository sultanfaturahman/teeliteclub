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
                ? 'text-white pt-[14vh] pb-10 sm:pt-[10vh] sm:pb-14'
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
  <div className="flex flex-col w-full max-w-3xl px-4 sm:px-6">
    {/* Title with adjusted spacing */}
    <div className="flex flex-col items-center justify-start gap-6 sm:gap-8 pt-[60px] sm:pt-[80px]">
      <h1 className="text-[28px] sm:text-[44px] font-semibold tracking-[0.08em] leading-tight">
        {maintenanceTitle ?? "Be Back Soon"}
      </h1>
      
      {/* Description text - smaller and before form */}
      <p className="text-[14px] sm:text-base text-white/80 max-w-[340px] sm:max-w-xl mx-auto leading-relaxed">
        {maintenanceMessage ?? "Leave an email so u can catch up"}
      </p>
      
      {/* Form with specific sizing */}
      <MaintenanceWaitlistForm formClassName="max-w-[340px] sm:max-w-[400px]" />
    </div>

    {/* Countdown moved down with more spacing */}
    <div className="mt-[60px] sm:mt-[80px] mb-[40px] sm:mb-[60px] flex justify-center">
      <div className="w-full max-w-[520px] px-4 sm:px-6 flex flex-col items-center gap-4">
        {countdownMessage && (
          <p className="text-[13px] sm:text-sm text-white/70 font-medium text-center tracking-wide">
            {countdownMessage}
          </p>
        )}
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
