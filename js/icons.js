/* Line drawings on a 48x48 grid, stroke only, so the colour follows the text. */

const ICONS = {
  aero: [
    '<path d="M18 13V5h12v8M15 5h18"/>', // plunger
    '<rect x="16" y="13" width="16" height="23" rx="1.5"/>', // chamber
    '<path d="M20 20h8M20 25h8M20 30h8"/>', // level marks
    '<rect x="14" y="36" width="20" height="3" rx="1"/>', // filter cap
    '<path d="M13 39h22l-2 6H15z"/>', // cup
  ],
};

/* Bottom tabs */
Object.assign(ICONS, {
  tabBrew: [
    '<path d="M10 16h24v12a10 10 0 0 1-10 10h-4a10 10 0 0 1-10-10z"/>', // cup
    '<path d="M34 20h3a4 4 0 0 1 0 8h-3"/>', // handle
    '<path d="M18 6c0 3 3 3 3 6M25 5c0 3 3 3 3 6"/>', // steam
  ],
  tabBeans: [
    '<ellipse cx="18" cy="24" rx="9" ry="13" transform="rotate(-20 18 24)"/>', // bean
    '<path d="M14 14c6 6 2 14 8 20"/>',
    '<ellipse cx="32" cy="24" rx="7" ry="10" transform="rotate(25 32 24)"/>',
    '<path d="M29 17c4 4 2 10 6 14"/>',
  ],
  tabLog: [
    '<rect x="8" y="10" width="32" height="30" rx="4"/>', // calendar
    '<path d="M8 18h32M16 6v8M32 6v8"/>',
    '<path d="M16 26h.01M24 26h.01M32 26h.01M16 33h.01M24 33h.01"/>',
  ],
});

/** An inline <svg>. Hidden from screen readers; the text next to it says the name. */
export const icon = (name, className = "art") =>
  `<svg class="${className}" viewBox="0 0 48 48" aria-hidden="true">${ICONS[name].join("")}</svg>`;
