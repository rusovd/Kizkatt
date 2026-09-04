import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DEFAULT_GRADIENT_FILL } from "kizkatt-graphic-engine";

import { GradientFillDefinition } from "./GradientFill";

describe("GradientFillDefinition", () => {
  it("renders linear and radial SVG paint servers", () => {
    const { container, rerender } = render(
      <svg>
        <GradientFillDefinition id="fill" gradient={DEFAULT_GRADIENT_FILL} />
      </svg>
    );

    expect(container.querySelector("linearGradient#fill")).not.toBeNull();
    expect(container.querySelectorAll("stop")).toHaveLength(2);

    rerender(
      <svg>
        <GradientFillDefinition
          id="fill"
          gradient={{ ...DEFAULT_GRADIENT_FILL, type: "radial" }}
        />
      </svg>
    );
    expect(container.querySelector("radialGradient#fill")).not.toBeNull();
  });

  it("renders conic and diamond approximations as SVG patterns", () => {
    const { container, rerender } = render(
      <svg>
        <GradientFillDefinition
          id="fill"
          gradient={{ ...DEFAULT_GRADIENT_FILL, type: "conic" }}
        />
      </svg>
    );
    expect(container.querySelectorAll("pattern#fill path")).toHaveLength(96);

    rerender(
      <svg>
        <GradientFillDefinition
          id="fill"
          gradient={{ ...DEFAULT_GRADIENT_FILL, type: "diamond" }}
        />
      </svg>
    );
    expect(container.querySelectorAll("pattern#fill path")).toHaveLength(64);
  });
});
