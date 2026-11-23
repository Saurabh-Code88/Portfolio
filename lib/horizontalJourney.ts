const SECTION_IDS = ["hero", "toolkit", "projects", "research", "experience", "contact"] as const;

function getJourney() {
  return document.querySelector<HTMLElement>("[data-horizontal-journey='active']");
}

function getPanel(section: HTMLElement) {
  return section.closest<HTMLElement>("[data-journey-panel]");
}

function getJourneyNumbers(journey: HTMLElement) {
  return {
    start: Number(journey.dataset.scrollStart || 0),
    verticalDistance: Number(journey.dataset.verticalDistance || 0),
    horizontalDistance: Number(journey.dataset.horizontalDistance || 0),
  };
}

/** Read the same measured scroll geometry as the track, without relying on RAF order. */
export function getHorizontalJourneyReadingPosition(sections: readonly HTMLElement[]) {
  const journey = getJourney();
  if (!journey) return null;
  const { start, verticalDistance, horizontalDistance } = getJourneyNumbers(journey);
  const viewport = journey.querySelector<HTMLElement>(".horizontal-journey__viewport");
  const panels = sections.map(getPanel);
  if (!viewport || panels.some((panel) => !panel)) return null;
  const progress = Math.max(0, Math.min(1, (window.scrollY - start) / Math.max(1, verticalDistance)));
  return {
    position: progress * horizontalDistance + viewport.clientWidth / 2,
    starts: panels.map((panel) => panel!.offsetLeft),
  };
}

export function getHorizontalJourneyScrollTarget(section: HTMLElement) {
  const journey = getJourney();
  const panel = getPanel(section);
  if (!journey || !panel) return null;
  if (section.dataset.flightSection === "hero") return 0;
  const { start, verticalDistance, horizontalDistance } = getJourneyNumbers(journey);
  const panelOffset = panel.offsetLeft;
  const fraction = horizontalDistance > 0 ? panelOffset / horizontalDistance : 0;
  return start + Math.max(0, Math.min(1, fraction)) * verticalDistance;
}

export function getHorizontalJourneySectionStops(documentHeight: number, viewportHeight: number) {
  const journey = getJourney();
  if (!journey) return null;
  const { start, verticalDistance, horizontalDistance } = getJourneyNumbers(journey);
  if (!verticalDistance || !horizontalDistance) return null;
  const maxScroll = Math.max(1, documentHeight - viewportHeight);
  let previous = 0;
  const stops = SECTION_IDS.map((id) => {
    const section = id === "hero"
      ? document.querySelector<HTMLElement>("[data-flight-section='hero']")
      : document.getElementById(id);
    const panel = section && getPanel(section);
    if (!panel) return previous;
    const fraction = Math.max(0, Math.min(1, panel.offsetLeft / horizontalDistance));
    previous = Math.max(previous, Math.max(0, Math.min(1, (start + fraction * verticalDistance) / maxScroll)));
    return previous;
  });
  stops[0] = 0;
  stops[stops.length - 1] = 1;
  return stops;
}

/** Correct the visible panel bounds for a target scroll position during a flight. */
export function getHorizontalJourneyProjectedRect(section: HTMLElement, targetScroll: number) {
  const journey = getJourney();
  const panel = getPanel(section);
  if (!journey || !panel) return null;
  const { start, verticalDistance, horizontalDistance } = getJourneyNumbers(journey);
  const progressAt = (scroll: number) => Math.max(0, Math.min(1, (scroll - start) / Math.max(1, verticalDistance)));
  const currentX = -horizontalDistance * progressAt(window.scrollY);
  const targetX = -horizontalDistance * progressAt(targetScroll);
  const rect = section.getBoundingClientRect();
  const shiftX = targetX - currentX;
  return { left: rect.left + shiftX, right: rect.right + shiftX, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
}
