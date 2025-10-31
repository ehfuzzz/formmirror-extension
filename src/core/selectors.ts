/**
 * Selector utilities
 * Generates robust CSS selectors for DOM elements
 */

function escapeCss(value: string): string {
  if (typeof CSS !== 'undefined' && CSS.escape) {
    return CSS.escape(value);
  }

  return value
    .replace(/([\0-\x1f\x7f-\x9f])/g, '\\$1')
    .replace(/(["'\\#.:;,!?+<=>@\[\]\^`{|}~])/g, '\\$1');
}

function isUniqueSelector(selector: string, context: Document | Element = document): boolean {
  try {
    const matches = context.querySelectorAll(selector);
    return matches.length === 1;
  } catch {
    return false;
  }
}

function buildAttributeSelector(element: Element, attribute: string): string | null {
  const value = element.getAttribute(attribute);
  if (!value) return null;

  const tag = element.tagName.toLowerCase();
  const selector = `${tag}[${attribute}="${escapeCss(value)}"]`;
  if (isUniqueSelector(selector, element.ownerDocument || document)) {
    return selector;
  }

  return null;
}

function buildPathSelector(element: Element): string {
  const segments: string[] = [];
  let current: Element | null = element;
  const doc = element.ownerDocument || document;

  while (current && current !== doc.documentElement) {
    const tag = current.tagName.toLowerCase();
    const parent: Element | null = current.parentElement;

    if (!parent) {
      segments.unshift(tag);
      break;
    }

    const siblings = Array.from(parent.children) as Element[];
    const matchingSiblings = siblings.filter((child) => child.tagName === current!.tagName);
    const index = matchingSiblings.indexOf(current) + 1;
    const segment = matchingSiblings.length > 1 ? `${tag}:nth-of-type(${index})` : tag;
    segments.unshift(segment);

    const partial = segments.join(' > ');
    if (isUniqueSelector(partial, doc)) {
      return partial;
    }

    current = parent;
    if (segments.length > 6) {
      break;
    }
  }

  return segments.join(' > ');
}

export function getRobustSelector(element: Element): string {
  const doc = element.ownerDocument || document;

  if (element.id) {
    const selector = `#${escapeCss(element.id)}`;
    if (isUniqueSelector(selector, doc)) {
      return selector;
    }
  }

  const nameSelector = buildAttributeSelector(element, 'name');
  if (nameSelector) {
    return nameSelector;
  }

  const dataTestid = buildAttributeSelector(element, 'data-testid');
  if (dataTestid) {
    return dataTestid;
  }

  const ariaLabelledby = buildAttributeSelector(element, 'aria-labelledby');
  if (ariaLabelledby) {
    return ariaLabelledby;
  }

  const ariaLabel = buildAttributeSelector(element, 'aria-label');
  if (ariaLabel) {
    return ariaLabel;
  }

  const placeholder = buildAttributeSelector(element, 'placeholder');
  if (placeholder) {
    return placeholder;
  }

  return buildPathSelector(element);
}

export function resolveElementBySelector(selector: string, context: Document | Element = document): Element | null {
  try {
    return context.querySelector(selector);
  } catch {
    return null;
  }
}
