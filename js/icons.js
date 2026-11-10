/* Brewer illustrations: line drawings on a 48x48 grid, stroke only, so the colour follows the text. */

const ICONS = {
  aero: [
    '<path d="M18 13V5h12v8M15 5h18"/>', // plunger
    '<rect x="16" y="13" width="16" height="23" rx="1.5"/>', // chamber
    '<path d="M20 20h8M20 25h8M20 30h8"/>', // level marks
    '<rect x="14" y="36" width="20" height="3" rx="1"/>', // filter cap
    '<path d="M13 39h22l-2 6H15z"/>', // cup
  ],
  cloth: [
    '<path d="M24 3v8" stroke-dasharray="1.5 2.5"/>', // pour
    '<path d="M7 17c6-2.5 28-2.5 34 0"/>', // cloth edge
    '<path d="M12 18c3 8 21 8 24 0"/>', // sag
    '<path d="M20 21h.01M24 22.5h.01M28 21h.01"/>', // grounds
    '<path d="M7 17l3 11 3-4M41 17l-3 11-3-4"/>', // hanging corners
    '<path d="M12 24v16a5 5 0 0 0 5 5h14a5 5 0 0 0 5-5V24"/>', // jar
    '<path d="M12 27h24" stroke-dasharray="2 2"/>', // string
  ],
  filter: [
    '<path d="M24 4v3M22 4h4"/>', // knob
    '<path d="M15 12q9-5 18 0"/>', // lid
    '<rect x="15" y="12" width="18" height="13" rx="1"/>', // top chamber
    '<rect x="12" y="25" width="24" height="19" rx="1.5"/>', // bottom chamber
    '<path d="M20 28h.01M24 28h.01M28 28h.01"/>', // holes
  ],
  v60: [
    '<path d="M9 10h30l-11 18h-8z"/>', // cone
    '<path d="M16 14l5 10M24 14v10M32 14l-5 10"/>', // ribs
    '<path d="M39 13c4 0 4 7-1 7"/>', // handle
    '<path d="M17 28h14v3H17z"/>', // base
    '<path d="M15 31h18l-2 13H17z"/>', // server
  ],
  esp: [
    '<rect x="8" y="6" width="32" height="10" rx="2"/>', // top
    '<circle cx="33" cy="11" r="1.5"/>', // gauge
    '<path d="M10 16v26M38 16v26M8 42h32"/>', // body
    '<path d="M19 16v4h10v-4M17 20h14M31 20h6"/>', // group head, portafilter
    '<path d="M23 23v6M25 23v6" stroke-dasharray="1.5 2"/>', // stream
    '<path d="M19 32h10v4a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3z"/>', // cup
  ],
  channi: [
    '<path d="M15 6c0 3 3 3 3 6M23 4c0 3 3 3 3 6"/>', // steam
    '<path d="M8 18h26a13 13 0 0 1-26 0z"/>', // strainer bowl
    '<path d="M34 18h10"/>', // handle
    '<path d="M13 23h16M15 27h12" stroke-dasharray="1 2.5"/>', // mesh
    '<path d="M14 33h14l-1.5 11h-11z"/>', // tumbler
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

/** An inline <svg> for a brewer. Hidden from screen readers; the text next to it says the name. */
export const icon = (brewer, className = "art") =>
  `<svg class="${className}" viewBox="0 0 48 48" aria-hidden="true">${ICONS[brewer].join("")}</svg>`;
