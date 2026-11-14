import { useCallback, useEffect, useRef, useState } from "react";

const hardwareAliases: Record<string, string> = {
  "*": "×",
  "/": "÷",
  "-": "−",
  x: "X,T,θ,n",
};
export function useKeyFeedback(persist = true) {
  const [sound, setSound] = useState(() => {
    try {
      return localStorage.getItem("graphite84:sound") === "on";
    } catch {
      return false;
    }
  });
  const [volume, setVolume] = useState(() => {
    try {
      const v = Number(localStorage.getItem("graphite:volume") ?? 0.5);
      return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.5;
    } catch {
      return 0.5;
    }
  });
  const [profile, setProfile] = useState<
    "plastic" | "mechanical" | "typewriter"
  >(() => {
    try {
      const p = localStorage.getItem("graphite:sound-profile");
      return p === "mechanical" || p === "typewriter" ? p : "plastic";
    } catch {
      return "plastic";
    }
  });
  useEffect(() => {
    if (!persist) return;
    try {
      localStorage.setItem("graphite:volume", String(volume));
      localStorage.setItem("graphite:sound-profile", profile);
    } catch {
      /* Optional audio preference. */
    }
  }, [volume, profile, persist]);
  const timers = useRef(new Map<HTMLElement, ReturnType<typeof setTimeout>>());
  const audio = useRef<AudioContext | null>(null);
  const release = useCallback((key: string) => {
    const label = hardwareAliases[key] ?? key;
    document
      .querySelectorAll<HTMLButtonElement>(
        ".calculator button[aria-label], .calculator button[data-key-code]",
      )
      .forEach((element) => {
        if (
          element.getAttribute("aria-label") !== label &&
          element.dataset.keyCode !== key
        )
          return;
        clearTimeout(timers.current.get(element));
        timers.current.delete(element);
        element.classList.remove("is-depressed");
        const rocker = element.closest<HTMLElement>(".dpad");
        if (rocker?.dataset.direction === key) delete rocker.dataset.direction;
      });
  }, []);
  useEffect(() => {
    try {
      if (persist)
        localStorage.setItem("graphite84:sound", sound ? "on" : "off");
    } catch {
      /* Optional preference. */
    }
  }, [sound, persist]);
  useEffect(
    () => () => {
      for (const [element, timer] of timers.current) {
        clearTimeout(timer);
        element.classList.remove("is-depressed");
      }
      timers.current.clear();
      void audio.current?.close().catch(() => {});
    },
    [],
  );
  const feedback = useCallback(
    (key: string, held = false) => {
      const label = hardwareAliases[key] ?? key;
      const element = Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          ".calculator button[aria-label], .calculator button[data-key-code]",
        ),
      ).find(
        (button) =>
          !button.closest("[hidden]") &&
          (button.getAttribute("aria-label") === label ||
            button.dataset.keyCode === key),
      );
      if (element) {
        clearTimeout(timers.current.get(element));
        timers.current.delete(element);
        element.classList.add("is-depressed");
        const rocker = element.closest<HTMLElement>(".dpad");
        if (rocker) rocker.dataset.direction = key;
        if (!held)
          timers.current.set(
            element,
            setTimeout(() => {
              timers.current.delete(element);
              element.classList.remove("is-depressed");
              const rocker = element.closest<HTMLElement>(".dpad");
              if (rocker?.dataset.direction === key)
                delete rocker.dataset.direction;
            }, 100),
          );
      }
      if (!sound || volume === 0) return;
      try {
        const context =
          !audio.current || audio.current.state === "closed"
            ? new AudioContext()
            : audio.current;
        audio.current = context;
        if (context.state === "suspended")
          void context.resume().catch(() => {});
        // A brief filtered noise impulse gives a dry plastic tap, without an electronic tone.
        const enter = key === "ENTER";
        const duration =
            profile === "typewriter" ? 0.045 : enter ? 0.035 : 0.022,
          buffer = context.createBuffer(
            1,
            Math.ceil(context.sampleRate * duration),
            context.sampleRate,
          );
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++)
          data[i] =
            (Math.random() * 2 - 1) *
            Math.exp(-i / (context.sampleRate * (enter ? 0.006 : 0.004)));
        const source = context.createBufferSource();
        source.buffer = buffer;
        const filter = context.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value =
          profile === "mechanical"
            ? 480
            : profile === "typewriter"
              ? 1850
              : enter
                ? 680
                : 1100;
        filter.Q.value = 0.7;
        const gain = volume;
        const outputGain = context.createGain();
        outputGain.gain.value = (enter ? 0.18 : 0.16) * gain;
        source.connect(filter);
        filter.connect(outputGain);
        outputGain.connect(context.destination);
        source.onended = () => {
          source.disconnect();
          filter.disconnect();
          outputGain.disconnect();
        };
        source.start(context.currentTime + (enter ? 0.026 : 0.018));
      } catch {
        /* Sound is optional; keys remain responsive if audio is unavailable. */
      }
    },
    [sound, volume, profile, release],
  );
  useEffect(() => {
    const reset = () => {
      document
        .querySelectorAll<HTMLElement>(".calculator .is-depressed")
        .forEach((element) =>
          release(
            element.dataset.keyCode ?? element.getAttribute("aria-label") ?? "",
          ),
        );
    };
    window.addEventListener("blur", reset);
    return () => window.removeEventListener("blur", reset);
  }, [release]);
  return {
    sound,
    setSound,
    volume,
    setVolume,
    profile,
    setProfile,
    feedback,
    release,
  };
}
