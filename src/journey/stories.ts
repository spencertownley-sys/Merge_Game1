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
  'cloudspire-isles': {
    finishLabel: 'Rebuild the bridges',
    panels: [
      {
        image: landStoryPanelUrl('cloudspire-isles', 1),
        text: 'Above Emberpeak the path climbs into the sky. The Cloudspire Isles have drifted apart, and their bridges have faded to nothing.',
      },
      {
        image: landStoryPanelUrl('cloudspire-isles', 2),
        speaker: 'wick',
        text: "Not much room up here! Glass pillars and narrow ledges split the space. Mind the edges, and build in the gaps you're given.",
      },
      {
        image: landStoryPanelUrl('cloudspire-isles', 3),
        speaker: 'wick',
        text: 'This window shows the Skylight pouring its light into a ring of little lanterns. It looks like it wanted to give its light away…',
      },
    ],
  },
  'frostglass-tundra': {
    finishLabel: 'Melt the ice',
    panels: [
      {
        image: landStoryPanelUrl('frostglass-tundra', 1),
        text: 'Further north, Frostglass Tundra lies frozen solid. Motes of light are locked inside the ice, glowing faintly, like stars under glass.',
      },
      {
        image: landStoryPanelUrl('frostglass-tundra', 2),
        speaker: 'wick',
        text: 'So much ice, and so much light inside it! Make a merge right beside a frozen mote and the warmth will thaw it free.',
      },
      {
        image: landStoryPanelUrl('frostglass-tundra', 3),
        speaker: 'wick',
        text: 'Look at these cracks. They run out to every land, just like the cracks in the Skylight. Maybe the breaking was a beginning, not an ending.',
      },
    ],
  },
  'neonoko-city': {
    finishLabel: 'Start the festival',
    panels: [
      {
        image: landStoryPanelUrl('neonoko-city', 1),
        text: 'Neonoko City should be the brightest night market in all the lands. Tonight every lantern hangs dark, and the stalls are shut.',
      },
      {
        image: landStoryPanelUrl('neonoko-city', 2),
        speaker: 'wick',
        text: "They say this city loves a show! Make merge after merge, one right after another. That's a combo, and the bigger it gets, the brighter it shines.",
      },
      {
        image: landStoryPanelUrl('neonoko-city', 3),
        speaker: 'wick',
        text: "A festival for the light coming home! Look, every family hangs a little lantern of its own, all around the Skylight's. A piece of it in every home…",
      },
    ],
  },
  'starlit-harbor': {
    finishLabel: 'Rest a while',
    panels: [
      {
        image: landStoryPanelUrl('starlit-harbor', 1),
        text: 'After the festival, the road winds down to Starlit Harbor. The boats are resting, and the water lies still and dim before dawn.',
      },
      {
        image: landStoryPanelUrl('starlit-harbor', 2),
        speaker: 'wick',
        text: "Let's rest a moment. You've earned it. No rush here and nothing in the way, just steady merges while the sun comes up.",
      },
      {
        image: landStoryPanelUrl('starlit-harbor', 3),
        speaker: 'wick',
        text: "There it is, across the water: Sunreach Spire. Whatever happened to the Skylight happened up there. When you're ready, we'll climb.",
      },
    ],
  },
};
