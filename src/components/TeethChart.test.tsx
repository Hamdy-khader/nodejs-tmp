import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TeethChart, ToothIllustration } from "./TeethChart";
import { defaultTeeth } from "@/lib/patients-store";

afterEach(cleanup);
describe("diagnosis illustrations", () => {
  it("joins two bridge supports across a missing tooth without adding a root to the pontic", () => {
    const teeth = defaultTeeth();
    teeth[16].status = "bridge";
    teeth[15].status = "missing";
    teeth[14].status = "bridge";
    const { container } = render(<TeethChart teeth={teeth} />);
    expect(container.querySelectorAll('[data-tooth-visual="bridge"]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-pontic="true"]')).toHaveLength(1);
    expect(container.querySelector('[data-tooth-number="15"] [data-pontic]')).not.toBeNull();
    expect(teeth[15].status).toBe("missing");
  });
  it("does not bridge over a healthy tooth or between jaws", () => {
    const teeth = defaultTeeth();
    teeth[16].status = "bridge";
    teeth[14].status = "bridge";
    teeth[46].status = "missing";
    const { container } = render(<TeethChart teeth={teeth} />);
    expect(container.querySelectorAll("[data-pontic]")).toHaveLength(0);
  });
  it("faces upper and lower crowns toward each other", () => {
    const { container } = render(<TeethChart teeth={defaultTeeth()} />);
    expect(container.querySelector('[data-tooth-number="11"] [data-tooth-visual]')).toHaveAttribute(
      "transform",
      "translate(0,80) scale(1,-1)",
    );
    expect(
      container.querySelector('[data-tooth-number="41"] [data-tooth-visual]'),
    ).not.toHaveAttribute("transform");
  });
  it("changes the crown geometry for a fractured tooth and keeps SVG IDs unique", () => {
    const { container } = render(
      <>
        <ToothIllustration number={11} status="intact" />
        <ToothIllustration number={11} status="intact" note="Fractured" />
      </>,
    );
    const svgs = container.querySelectorAll("svg");
    expect(svgs[0].innerHTML).not.toEqual(svgs[1].innerHTML);
    expect(
      svgs[1].querySelector('path[d="M8 37 L8 23 L14 27 L18 16 L23 25 L29 19 L32 37 Z"]'),
    ).not.toBeNull();
    const ids = [...container.querySelectorAll("[id]")].map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("highlights all selected teeth", () => {
    const { container } = render(
      <TeethChart teeth={defaultTeeth()} selected={14} highlighted={[14, 16]} />,
    );
    expect(container.querySelectorAll('[aria-pressed="true"]')).toHaveLength(2);
  });
});
