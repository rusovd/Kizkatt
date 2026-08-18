import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EditorLoader } from "./EditorLoader";

describe("EditorLoader", () => {
  it("renders the animated cat sprite in an accessible status", () => {
    const view = render(<EditorLoader label="Loading" />);

    expect(screen.getByRole("status", { name: "Loading" }))
      .toBeInTheDocument();
    expect(view.container.querySelector(".kizkatt-editor-loader-icon"))
      .toBeInTheDocument();
  });
});
