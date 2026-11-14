import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import HardwareButton from "./HardwareButton";
afterEach(cleanup);
describe("hardware activation", () => {
  it("activates a keyboard press immediately, ignores repeat, and releases on keyup", () => {
    const press = vi.fn(),
      release = vi.fn();
    render(
      <HardwareButton keyCode="ENTER" press={press} release={release}>
        Enter
      </HardwareButton>,
    );
    const button = screen.getByRole("button");
    fireEvent.keyDown(button, { key: "Enter" });
    expect(press).toHaveBeenCalledExactlyOnceWith("ENTER", true);
    fireEvent.keyDown(button, { key: "Enter", repeat: true });
    expect(press).toHaveBeenCalledTimes(1);
    fireEvent.keyUp(button, { key: "Enter" });
    expect(release).toHaveBeenCalledWith("ENTER");
  });
  it("supports assistive click activation and Space activation", () => {
    const press = vi.fn();
    render(
      <HardwareButton keyCode="2" press={press} release={vi.fn()}>
        2
      </HardwareButton>,
    );
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(press).toHaveBeenCalledWith("2");
    fireEvent.keyDown(button, { key: " " });
    expect(press).toHaveBeenLastCalledWith("2", true);
  });
});
