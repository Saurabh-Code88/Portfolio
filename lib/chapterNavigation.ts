import { chapters } from "../content/expedition.ts";
export function chapterNeighbors(id: string) {
  const index = Math.max(
    0,
    chapters.findIndex((chapter) => chapter.id === id),
  );
  return {
    index,
    current: chapters[index],
    previous: chapters[index - 1] ?? null,
    next: chapters[index + 1] ?? null,
  };
}
/** The same desktop capability boundary as the presentation CSS. */
export function cinematicChapters(
  width: number,
  reduced: boolean,
  journey: boolean,
  canvas: boolean,
) {
  return width >= 1024 && !reduced && journey && canvas;
}
