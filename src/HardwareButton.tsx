import { useRef, type ButtonHTMLAttributes } from "react";

export interface HardwareActions {
  press: (key: string, held?: boolean) => void;
  release: (key: string) => void;
}
type Props = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  | "onClick"
  | "onPointerDown"
  | "onPointerUp"
  | "onPointerCancel"
  | "onKeyDown"
  | "onKeyUp"
> &
  HardwareActions & { keyCode: string };
/** Commit once at the bottom of a press; retain click activation for assistive technology. */
export default function HardwareButton({
  keyCode,
  press,
  release,
  children,
  ...props
}: Props) {
  const pointerClick = useRef(false);
  return (
    <button
      {...props}
      type="button"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        pointerClick.current = true;
        press(keyCode, true);
      }}
      onPointerUp={() => release(keyCode)}
      onPointerCancel={() => {
        pointerClick.current = false;
        release(keyCode);
      }}
      onLostPointerCapture={() => release(keyCode)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (!event.repeat) press(keyCode, true);
        }
      }}
      onKeyUp={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          release(keyCode);
        }
      }}
      onBlur={() => release(keyCode)}
      onClick={() => {
        if (pointerClick.current) {
          pointerClick.current = false;
          return;
        }
        press(keyCode);
      }}
    >
      {children}
    </button>
  );
}
