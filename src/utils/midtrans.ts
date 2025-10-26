const SNAP_URL_PRODUCTION = "https://app.midtrans.com/snap/snap.js";
const SNAP_URL_SANDBOX = "https://app.sandbox.midtrans.com/snap/snap.js";
const ATTEMPT_SEPARATOR = "-ATTEMPT-";

export interface SnapPayHandlers {
  onSuccess?: (result: unknown) => void;
  onPending?: (result: unknown) => void;
  onError?: (error: unknown) => void;
  onClose?: () => void;
}

interface SnapGlobal {
  pay: (token: string, options?: SnapPayHandlers) => void;
}

declare global {
  interface Window {
    snap?: SnapGlobal;
    __midtransSnapLoadingPromise__?: Promise<void>;
  }
}

const getSnapUrl = () => {
  const environment = import.meta.env.VITE_MIDTRANS_ENVIRONMENT;
  return environment === "production" ? SNAP_URL_PRODUCTION : SNAP_URL_SANDBOX;
};

export const ensureSnapLoaded = async (): Promise<void> => {
  if (typeof window === "undefined") {
    throw new Error("Midtrans Snap hanya dapat digunakan di lingkungan browser.");
  }

  if (window.snap?.pay) {
    return;
  }

  if (window.__midtransSnapLoadingPromise__) {
    return window.__midtransSnapLoadingPromise__;
  }

  const clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY;

  if (!clientKey) {
    throw new Error("VITE_MIDTRANS_CLIENT_KEY belum dikonfigurasi.");
  }

  window.__midtransSnapLoadingPromise__ = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>("script[data-midtrans-snap]");

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Gagal memuat Midtrans Snap script.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = getSnapUrl();
    script.dataset.midtransSnap = "true";
    script.dataset.clientKey = clientKey;
    script.async = true;

    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Gagal memuat Midtrans Snap script."));

    document.body.appendChild(script);
  });

  return window.__midtransSnapLoadingPromise__;
};

export const normalizeMidtransOrderId = (orderId: string): string => {
  if (!orderId) {
    return orderId;
  }

  const separatorIndex = orderId.indexOf(ATTEMPT_SEPARATOR);
  if (separatorIndex === -1) {
    return orderId;
  }

  return orderId.slice(0, separatorIndex);
};

export const buildAttemptedOrderId = (baseOrderNumber: string): string => {
  const suffix = `${ATTEMPT_SEPARATOR}${Date.now()}`;
  const maxLength = 50;

  if (baseOrderNumber.length + suffix.length <= maxLength) {
    return `${baseOrderNumber}${suffix}`;
  }

  const trimmedBase = baseOrderNumber.slice(0, maxLength - suffix.length);
  return `${trimmedBase}${suffix}`;
};
