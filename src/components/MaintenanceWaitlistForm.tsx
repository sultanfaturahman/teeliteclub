import { FormEvent, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

interface MaintenanceWaitlistFormProps {
  formClassName?: string;
  inputClassName?: string;
  submitClassName?: string;
  feedbackClassName?: string;
}

export const MaintenanceWaitlistForm = ({
  formClassName,
  inputClassName,
  submitClassName,
  feedbackClassName,
}: MaintenanceWaitlistFormProps) => {
  const [emailValue, setEmailValue] = useState("");
  const [emailFeedback, setEmailFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  const handleNotifySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailFeedback(null);

    const trimmedEmail = emailValue.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(trimmedEmail)) {
      setEmailFeedback({ type: "error", message: "Enter the valid email." });
      return;
    }

    try {
      setEmailLoading(true);
      const { error } = await supabase
        .from("maintenance_notifications")
        .insert({
          email: trimmedEmail,
        });

      if (error) {
        logger.error("Failed to save maintenance notification email", error);
        const alreadyRegistered = error.message?.toLowerCase().includes("duplicate") || error.code === "23505";
        setEmailFeedback({
          type: "error",
          message: alreadyRegistered
            ? "This email has already registered. Wait for announcement."
            : "Gagal menyimpan email. Silakan coba lagi beberapa saat.",
        });
        return;
      }

      setEmailFeedback({
        type: "success",
        message: "Thanks for subscribing.",
      });
      setEmailValue("");
    } catch (error) {
      logger.error("Exception while saving maintenance notification email", error);
      setEmailFeedback({
        type: "error",
        message: "Terjadi kesalahan. Silakan coba lagi nanti.",
      });
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="space-y-2 w-full">
      <form
        onSubmit={handleNotifySubmit}
        className={cn(
          "w-full flex flex-col items-stretch gap-4 px-1 sm:px-6 py-4 sm:py-6",
          formClassName
        )}
      >
        <div className="relative w-full">
          <Input
            type="email"
            placeholder="Email"
            value={emailValue}
            onChange={(event) => setEmailValue(event.target.value)}
            disabled={emailLoading}
            autoComplete="email"
            required
            className={cn(
              "min-h-[52px] sm:min-h-[58px] pl-5 pr-14 py-3 sm:py-4 text-[14px] sm:text-base bg-transparent border border-white/50 text-white placeholder:text-white/60 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40 rounded-md",
              inputClassName
            )}
            aria-label="Email for subscribing news."
          />

          <button
            type="submit"
            disabled={emailLoading}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-white hover:bg-white/10 transition disabled:opacity-60",
              submitClassName
            )}
          >
            {emailLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border border-white/40 border-t-white" />
            ) : (
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
            <span className="sr-only">Send email</span>
          </button>
        </div>
      </form>

      {emailFeedback && (
        <div
          className={cn(
            "text-[13px] sm:text-sm text-white/75 text-center mt-2",
            feedbackClassName
          )}
        >
          {emailFeedback.message}
        </div>
      )}
    </div>
  );
};
