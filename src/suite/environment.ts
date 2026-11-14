import { createContext } from "react";
import type { KeyStyle } from "../KeyStylePicker";
import type { useKeyFeedback } from "../useKeyFeedback";
import type { Background } from "../BackgroundPicker";
export const SuiteEnvironment = createContext<{
  keyStyle: KeyStyle;
  setKeyStyle: (style: KeyStyle) => void;
  keys: ReturnType<typeof useKeyFeedback>;
  background: Background;
  setBackground: (background: Background) => void;
} | null>(null);
