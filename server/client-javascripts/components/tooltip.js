import {element, setClass, unsetClass} from "../page-utils";

export function registerTooltip() {
  function hoveredTooltipItem(event) {
    const path = event.composedPath();
    for (let i = path.length - 1; i >= 0; i--) {
      const e = path[i];
      if (e.dataset && e.dataset.tooltip) return e;
    }
    return null;
  }

  let lastHoveredTooltipItem = null;
  window.addEventListener('mouseover', event => {
    const item = hoveredTooltipItem(event);
    if (item === lastHoveredTooltipItem) return;

    if (item) {
      const tooltip = element('#tooltip');
      const elementRect = item.getBoundingClientRect();
      const split = item.dataset.tooltip.split('|');
      if (split.length > 1) {
        element('#tooltip .title').innerHTML = split[0];
        element('#tooltip .contents').innerHTML = split[1];
        setClass('#tooltip .title', 'hidden', false);
      } else {
        element('#tooltip .contents').innerHTML = split[0];
        setClass('#tooltip .title', 'hidden', true);
      }
      unsetClass('#tooltip', 'hidden');
      tooltip.style.left = `${elementRect.left}px`;
      tooltip.style.top = `${elementRect.bottom + 5}px`;
    }
    setClass('#tooltip', 'hidden', !item);
    lastHoveredTooltipItem = item;
  });
}
