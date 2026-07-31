export interface TextOverflowOptions {
  horizontal?: boolean;
  vertical?: boolean;
}

interface CursorTooltipRuntime {
  isElementTextTruncated?(
    element: HTMLElement,
    options?: TextOverflowOptions
  ): boolean;
}

export function isElementTextTruncated(
  element: HTMLElement | null,
  options: TextOverflowOptions = {}
): boolean {
  if (!element) {
    return false;
  }
  const runtime = (
    globalThis as typeof globalThis & { LumnoCursorTooltip?: CursorTooltipRuntime }
  ).LumnoCursorTooltip;
  if (typeof runtime?.isElementTextTruncated === 'function') {
    return runtime.isElementTextTruncated(element, options);
  }
  const checkHorizontal = options.horizontal !== false;
  const checkVertical = options.vertical === true;
  return (
    checkHorizontal &&
    element.clientWidth > 0 &&
    element.scrollWidth > element.clientWidth
  ) || (
    checkVertical &&
    element.clientHeight > 0 &&
    element.scrollHeight > element.clientHeight
  );
}
