// Story text for the painted cutscenes (JOURNEY_PLAN.md §1). The opening covers Act I; each
// later land can have a short arrival story that says what is new there and moves the Act II
// mystery along (why did the Skylight crack?). Art is in public/assets/story/.

import { introPanelUrl, landStoryPanelUrl } from '../render/assetUrls';
import type { LandId } from '../types';

export interface StoryPanel {
  /** Painted panel URL. */
  image: string;
  text: string;
  /** Lines Wick says aloud get his portrait beside the caption. */
  speaker?: 'wick';
}

export const INTRO_PANELS: readonly StoryPanel[] = [
  {
    image: introPanelUrl(1),
    text: 'High above every land hung the Skylight. Its glow kept the whole world in colour.',
  },
  { image: introPanelUrl(2), text: 'Then, one still night, the Skylight cracked.' },
  {
    image: introPanelUrl(3),
    text: 'Its light scattered into countless tiny motes, and one by one the lands went grey.',
  },
  {
    image: introPanelUrl(4),
    text: 'In a quiet field in Sunmeadow Hollow, one small glow stirred. That glow is you: a Keeper.',
  },
  {
    image: introPanelUrl(5),
    speaker: 'wick',
    text: "Oh! You're awake! I'm Wick. I've kept this map safe for ever so long, waiting for someone who can gather light.",
  },
  {
    image: introPanelUrl(6),
    speaker: 'wick',
    text: 'Bring two alike together and they become something brighter. Shall we wake the lands, one at a time?',
  },
];

/** A land's arrival story: plays the first time the player opens one of its levels. */
export interface LandStory {
  panels: readonly StoryPanel[];
  /** What the last tap says before the level card opens. */
  finishLabel: string;
}

export const LAND_STORIES: Partial<Record<LandId, LandStory>> = {
  'mistvale-marsh': {
    finishLabel: 'Into the fog',
    panels: [
      {
        image: landStoryPanelUrl('mistvale-marsh', 1),
        text: 'Past the orchard, the path sinks into Mistvale Marsh. The fog is so thick that even the wisps over the water have lost their glow.',
      },
      {
        image: landStoryPanelUrl('mistvale-marsh', 2),
        speaker: 'wick',
        text: "I can't see past my own wings! Out here the fog hides which mote comes next. Trust your eyes, and keep the pile tidy so anything can land safely.",
      },
      {
        image: landStoryPanelUrl('mistvale-marsh', 3),
        speaker: 'wick',
        text: 'Look, an old note tucked in this post: "…too much for one light to carry alone…" Who wrote that? Let\'s bring the fireflies back, and keep our eyes open.',
      },
    ],
  },
  emberpeak: {
    finishLabel: 'Light the forges',
    panels: [
      {
        image: landStoryPanelUrl('emberpeak', 1),
        text: 'High in Emberpeak the forges have gone cold, and the hot springs have stopped steaming. Even the embers have forgotten how to glow.',
      },
      {
        image: landStoryPanelUrl('emberpeak', 2),
        speaker: 'wick',
        text: "We'll have to be quick and clever here. The motes fall bigger and the drops run short, so plan each merge before you let go.",
      },
      {
        image: landStoryPanelUrl('emberpeak', 3),
        speaker: 'wick',
        text: "This old painting… it's the Skylight, holding up every land at once. It looks so tired. Maybe it didn't just break. Come on, let's wake the forges.",
      },
    ],
  },
};
