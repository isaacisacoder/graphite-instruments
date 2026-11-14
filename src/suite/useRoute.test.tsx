import { useLayoutEffect } from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { it, expect, afterEach } from "vitest";
import { useRoute } from "./useRoute";
afterEach(() => {
  cleanup();
  history.replaceState(null, "", "/#/");
});
it("rechecks the route when a hash change occurs between render and subscription", () => {
  history.replaceState(null, "", "/#/basic");
  function Route() {
    const route = useRoute();
    useLayoutEffect(() => {
      history.replaceState(null, "", "/#/cas");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }, []);
    return <output>{route}</output>;
  }
  render(<Route />);
  expect(screen.getByRole("status").textContent).toBe("cas");
});
