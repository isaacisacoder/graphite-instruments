import { afterEach, beforeEach, it, expect, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import Tool from "./Tool";
class WorkerMock {
  static instances: WorkerMock[] = [];
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  terminate = vi.fn();
  postMessage = vi.fn();
  constructor() {
    WorkerMock.instances.push(this);
  }
}
beforeEach(() => {
  localStorage.clear();
  WorkerMock.instances = [];
  vi.stubGlobal("Worker", WorkerMock);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("cancels outdated calculations when the input changes", () => {
  render(<Tool id="cas" />);
  fireEvent.click(screen.getByRole("button", { name: "Calculate" }));
  const worker = WorkerMock.instances[0];
  fireEvent.change(screen.getByLabelText("Expression"), {
    target: { value: "x+2" },
  });
  expect(worker.terminate).toHaveBeenCalled();
  act(() =>
    worker.onmessage?.({
      data: { result: { items: [{ label: "Old", value: "stale answer" }] } },
    }),
  );
  expect(screen.queryByText("stale answer")).toBeNull();
  expect(
    screen.getByRole("button", { name: "Calculate" }).hasAttribute("disabled"),
  ).toBe(false);
});
it("terminates calculations after six seconds", () => {
  vi.useFakeTimers();
  render(<Tool id="cas" />);
  fireEvent.click(screen.getByRole("button", { name: "Calculate" }));
  act(() => vi.advanceTimersByTime(6000));
  expect(screen.getByRole("alert").textContent).toContain("exceeded 6 seconds");
  expect(WorkerMock.instances[0].terminate).toHaveBeenCalled();
});
