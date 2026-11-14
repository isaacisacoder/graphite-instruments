import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import App from "./App";
beforeEach(() => {
  cleanup();
  localStorage.clear();
  window.matchMedia = vi.fn().mockReturnValue({ matches: true });
});
describe("physical interactions", () => {
  it("changes and restores background independently from the calculator finish", () => {
    const { unmount } = render(<App />);
    const input = screen.getByRole("textbox", {
      name: "Calculation expression",
    });
    fireEvent.change(input, { target: { value: "2+3" } });
    fireEvent.change(screen.getByLabelText("Key style"), {
      target: { value: "blush" },
    });
    fireEvent.change(screen.getByLabelText("Background theme"), {
      target: { value: "blueprint" },
    });
    expect(
      document.querySelector(".workspace")?.getAttribute("data-background"),
    ).toBe("blueprint");
    expect(
      document.querySelector(".workspace")?.classList.contains("dark"),
    ).toBe(true);
    expect(
      document.querySelector(".calculator")?.getAttribute("data-key-style"),
    ).toBe("blush");
    expect((input as HTMLInputElement).value).toBe("2+3");
    unmount();
    render(<App />);
    expect(
      (screen.getByLabelText("Background theme") as HTMLSelectElement).value,
    ).toBe("blueprint");
    expect(
      document.querySelector(".calculator")?.getAttribute("data-key-style"),
    ).toBe("blush");
  });
  it("evaluates ENTER once while it is held", () => {
    render(<App />);
    for (const key of ["2", "+", "3", "Enter"])
      fireEvent.keyDown(window, { key });
    fireEvent.keyDown(window, { key: "Enter", repeat: true });
    expect(
      (
        screen.getByRole("textbox", {
          name: "Calculation expression",
        }) as HTMLInputElement
      ).value,
    ).toBe("");
    expect(
      JSON.parse(localStorage.getItem("graphite84:v1")!).history,
    ).toHaveLength(1);
  });
  it("maps letters inside display fields in TI mode and keeps typing mode literal", () => {
    render(<App />);
    const input = screen.getByRole("textbox", {
      name: "Calculation expression",
    });
    fireEvent.keyDown(input, { key: "e", code: "KeyE" });
    expect((input as HTMLInputElement).value).toBe("sin(");
    fireEvent.keyDown(input, { key: "Backspace" });
    expect((input as HTMLInputElement).value).toBe("");
    fireEvent.change(screen.getByLabelText("Keyboard"), {
      target: { value: "typing" },
    });
    fireEvent.change(input, { target: { value: "sin(pi/2)" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(
      screen.getByText("1", { selector: ".latest-result strong" }),
    ).toBeTruthy();
  });
  it("changes key styles without losing an expression and restores the preference", () => {
    const { unmount } = render(<App />);
    const input = screen.getByRole("textbox", {
      name: "Calculation expression",
    });
    fireEvent.change(input, { target: { value: "2+3" } });
    fireEvent.change(screen.getByLabelText("Key style"), {
      target: { value: "onyx" },
    });
    expect(
      document.querySelector(".calculator")?.getAttribute("data-key-style"),
    ).toBe("onyx");
    expect((input as HTMLInputElement).value).toBe("2+3");
    expect(localStorage.getItem("graphite84:key-style")).toBe("onyx");
    unmount();
    render(<App />);
    expect(
      (screen.getByLabelText("Key style") as HTMLSelectElement).value,
    ).toBe("onyx");
  });
  it("continues a result while the display input is focused", () => {
    render(<App />);
    const input = screen.getByRole("textbox", {
      name: "Calculation expression",
    });
    fireEvent.change(input, { target: { value: "2+3" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.keyDown(input, { key: "*" });
    expect((input as HTMLInputElement).value).toBe("Ans*");
  });
  it("evaluates from the keypad and maintains function edits", () => {
    render(<App />);
    for (const label of ["2", "+", "3", "×", "4", "ENTER"])
      fireEvent.click(screen.getByRole("button", { name: label }));
    expect(screen.getByText("14")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Y=" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Y1 expression" }), {
      target: { value: "1/x" },
    });
    fireEvent.click(screen.getByRole("button", { name: "GRAPH" }));
    expect(screen.getByRole("img", { name: "Function graph" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Y=" }));
    expect(
      (
        screen.getByRole("textbox", {
          name: "Y1 expression",
        }) as HTMLInputElement
      ).value,
    ).toBe("1/x");
  });
  it("handles keyboard only input once", () => {
    render(<App />);
    for (const key of ["2", "^", "3", "Enter"])
      fireEvent.keyDown(window, { key });
    expect(screen.getByText("8", { selector: "strong" })).toBeTruthy();
    expect(
      JSON.parse(localStorage.getItem("graphite84:v1")!).history,
    ).toHaveLength(1);
  });
});
