import { useEffect, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
export default function OfflineStatus() {
  const [update, setUpdate] = useState(false),
    [install, setInstall] = useState<InstallEvent | null>(null),
    [error, setError] = useState("");
  const activate = useRef<((reload?: boolean) => Promise<void>) | null>(null);
  useEffect(() => {
    activate.current = registerSW({
      onNeedRefresh: () => setUpdate(true),
      onRegisterError: () =>
        setError("Offline setup unavailable; the online app remains usable."),
    });
    const prompt = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", prompt);
    return () => window.removeEventListener("beforeinstallprompt", prompt);
  }, []);
  return (
    <>
      {update && (
        <button
          onClick={() => {
            window.dispatchEvent(new Event("pagehide"));
            void activate.current?.(true);
          }}
        >
          Update app
        </button>
      )}
      {install && (
        <button
          onClick={async () => {
            await install.prompt();
            await install.userChoice;
            setInstall(null);
          }}
        >
          Install app
        </button>
      )}
      {error && (
        <span role="status" className="offline-error">
          {error}
        </span>
      )}
    </>
  );
}
