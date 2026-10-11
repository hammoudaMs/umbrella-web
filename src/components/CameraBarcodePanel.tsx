"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui";

type BarcodeDetectorLike = {
  detect: (
    source: ImageBitmapSource,
  ) => Promise<Array<{ rawValue?: string }>>;
};

type BarcodeDetectorCtor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorLike;

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorCtor;
  }
}

const FORMATS = [
  "code_128",
  "code_39",
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "qr_code",
  "itf",
  "codabar",
];

export function CameraBarcodePanel({
  onDetect,
  onClose,
}: {
  onDetect: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastHit = useRef<{ code: string; at: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (typeof window === "undefined" || !window.BarcodeDetector) {
        setError(
          "Caméra barcode non supportée sur ce navigateur. Utilisez Chrome / Edge, ou la douchette / saisie manuelle.",
        );
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Accès caméra indisponible sur cet appareil.");
        return;
      }

      try {
        const detector = new window.BarcodeDetector({ formats: FORMATS });
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setReady(true);

        const tick = async () => {
          if (cancelled) return;
          const el = videoRef.current;
          if (el && el.readyState >= 2) {
            try {
              const codes = await detector.detect(el);
              const raw = codes[0]?.rawValue?.trim();
              if (raw) {
                const now = Date.now();
                const prev = lastHit.current;
                if (
                  !prev ||
                  prev.code !== raw.toUpperCase() ||
                  now - prev.at > 1800
                ) {
                  lastHit.current = { code: raw.toUpperCase(), at: now };
                  onDetect(raw);
                }
              }
            } catch {
              /* frame skipped */
            }
          }
          rafRef.current = window.setTimeout(() => {
            void tick();
          }, 220) as unknown as number;
        };
        void tick();
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Impossible d’ouvrir la caméra";
        setError(
          msg.includes("Permission") || msg.includes("NotAllowed")
            ? "Autorisez l’accès à la caméra pour scanner avec le téléphone."
            : msg,
        );
      }
    }

    void start();

    return () => {
      cancelled = true;
      if (rafRef.current != null) {
        clearTimeout(rafRef.current);
        rafRef.current = null;
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [onDetect]);

  return (
    <div className="space-y-3 rounded-2xl border border-ops-card bg-ops-page/80 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-ops-ink">
          <Camera className="h-4 w-4 text-ops-accent" aria-hidden />
          Caméra téléphone
        </p>
        <Button type="button" variant="secondary" size="sm" icon={X} onClick={onClose}>
          Fermer
        </Button>
      </div>
      {error ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {error}
        </p>
      ) : (
        <div className="relative overflow-hidden rounded-xl bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            className="aspect-[4/3] w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-28 w-[72%] rounded-lg border-2 border-white/70 shadow-[0_0_0_999px_rgba(0,0,0,0.25)]" />
          </div>
          {!ready ? (
            <p className="absolute inset-x-0 bottom-3 text-center text-xs text-white/80">
              Ouverture de la caméra…
            </p>
          ) : (
            <p className="absolute inset-x-0 bottom-3 text-center text-xs text-white/80">
              Cadrez le code-barres dans le cadre
            </p>
          )}
        </div>
      )}
    </div>
  );
}
