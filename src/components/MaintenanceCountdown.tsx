import { useEffect, useState } from "react";

const SEGMENTS = [
  { label: "Days", key: "days" },
  { label: "Hours", key: "hours" },
  { label: "Minutes", key: "minutes" },
  { label: "Seconds", key: "seconds" },
] as const;

type SegmentKey = typeof SEGMENTS[number]["key"];

const getTimeParts = (target: Date) => {
  const now = Date.now();
  const diff = Math.max(target.getTime() - now, 0);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { days, hours, minutes, seconds };
};

interface CountdownProps {
  target: string;
  tone?: "light" | "dark";
}

export const Countdown = ({ target, tone = "light" }: CountdownProps) => {
  const targetDate = new Date(target);
  const [timeLeft, setTimeLeft] = useState(() => getTimeParts(targetDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeParts(targetDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  const primary = tone === "dark" ? "text-white" : "text-[#0A0A0A]";
  const secondary = tone === "dark" ? "text-white/70" : "text-[#6B7280]";

  return (
    <div className={`flex flex-wrap justify-center items-end gap-4 sm:gap-3 ${primary}`}>
      {SEGMENTS.map(({ label, key }) => {
        const value = timeLeft[key as SegmentKey].toString().padStart(2, "0");
        return (
          <div
            key={label}
            className="flex flex-col items-center gap-1 sm:gap-1.5 min-w-[64px] sm:min-w-[80px]"
          >
            <span className="text-[32px] sm:text-[44px] font-semibold leading-tight">
              {value}
            </span>
            <span
              className={`text-[10px] sm:text-sm uppercase tracking-[0.2em] ${secondary} font-normal`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );

};

export const MaintenanceCountdown = Countdown;
