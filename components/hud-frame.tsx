import type { ReactNode } from "react";

type HudFrameProps = {
  children: ReactNode;
  variant: "left" | "right";
  className?: string;
};

export function HudFrame({ children, variant, className = "" }: HudFrameProps) {
  const isLeft = variant === "left";
  const outline = isLeft
    ? "M0 42H18V14H38L48 4H590L604 18V386L590 400H48L38 390H18V362H0"
    : "M640 42H622V14H602L592 4H50L36 18V386L50 400H592L602 390H622V362H640";
  const ornaments = isLeft
    ? "M0 42V362 M18 28H34 M18 376H34 M48 4V18H70 M590 4V18H572 M604 52H616 M604 370H630V350 M34 20H42 M24 20V26"
    : "M640 42V362 M622 28H606 M622 376H606 M592 4V18H570 M50 4V18H68 M36 52H24 M36 370H10V350 M606 20H598 M616 20V26";

  return (
    <div className={`hud-frame hud-frame--${variant} ${className}`}>
      <svg className="hud-frame__art" viewBox="0 0 640 404" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path className="hud-frame__outline" d={outline} />
        <g className="hud-frame__ornaments">
          <path d={ornaments} />
          <circle cx={isLeft ? 25 : 615} cy="20" r="2.3" />
          <path d={isLeft ? "M52 27H96 M104 27H134 M142 27H162" : "M588 27H544 M536 27H506 M498 27H478"} />
        </g>
      </svg>
      <div className="hud-frame__stepbar" aria-hidden="true">
        <span /><span /><span /><span />
      </div>
      <div className="hud-frame__content">{children}</div>
    </div>
  );
}
