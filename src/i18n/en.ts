/** English source strings. Add another locale with the same keys when a reviewed translation is ready. */
export const en = {
  nav: { sites: 'Sites', details: 'Details', help: 'Help', search: 'Search', simple: 'Simple', expert: 'Expert' },
  firstStep: 'Start with Sites to choose a place on the Moon. Open Details to see its sunlight and Earth view.',
  glossary: [
    ['Direct-to-Earth radio window', 'A time when Earth clears the terrain and your radio-height setting. This allows a direct radio path, but does not check a ground station, antenna or signal strength.'],
    ['Earth clearance', 'How far Earth must sit above nearby terrain for a radio link. The default is 5 degrees; 0 degrees means just above the terrain.'],
    ['Horizon', 'The edge of the visible ground and mountains around a location. A mountain can block the Sun even when the Sun is above flat ground.'],
    ['Sunset: half or whole Sun', 'Half the Sun has set means its centre has crossed the terrain. Whole Sun has set means its last visible edge has disappeared.'],
    ['Sub-Earth point', 'The place on the Moon where Earth appears directly overhead.'],
    ['Libration', 'Earth slowly shifts in the lunar sky during the month. Near the poles, this can bring Earth into and out of view.'],
    ['Mission window', 'The date range you are checking, starting at your selected date and time. A long night may continue after this range ends.'],
    ['Lunar day', 'One full sunrise-to-sunrise cycle: about 29.5 Earth days. It is different from the hours of sunlight left at a particular moment.'],
    ['UTC', 'A shared worldwide time standard. All dates in this app use UTC, not your local time.'],
    ['Site score', 'A weighted comparison of sunlight, Earth view, steady sunlight and time before sunset. It is most useful at the poles and is not a guarantee that a spacecraft can survive.'],
  ],
} as const;
