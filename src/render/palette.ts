// Board/background palettes: one soft pastel palette per land (ART_AND_STORY_DIRECTION.md §3),
// with a dimmer "unrestored" variant for the before/after shift (§4.2). Placeholder gradients
// until the commissioned watercolor pieces exist.

import type { LandId } from '../types';

export interface LandPalette {
  skyTop: string;
  skyBottom: string;
  ground: string;
  accent: string;
  /** Dimmed/greyed version used before a land is restored. */
  dim: { skyTop: string; skyBottom: string; ground: string };
}

export const LAND_PALETTES: Record<LandId, LandPalette> = {
  'sunmeadow-hollow': {
    skyTop: '#fde9c9',
    skyBottom: '#f9d9a8',
    ground: '#cfe3a2',
    accent: '#f4b860',
    dim: { skyTop: '#e6e0d6', skyBottom: '#ddd6cb', ground: '#c9ccc2' },
  },
  'driftmoor-cove': {
    skyTop: '#dbe9f4',
    skyBottom: '#c3d7e6',
    ground: '#a9c3d3',
    accent: '#7fa6c2',
    dim: { skyTop: '#e1e4e7', skyBottom: '#d5d9dd', ground: '#c3c8cd' },
  },
  whisperwood: {
    skyTop: '#e3f1dd',
    skyBottom: '#c9e2c0',
    ground: '#9ec59b',
    accent: '#79a86f',
    dim: { skyTop: '#e2e5e0', skyBottom: '#d3d8d1', ground: '#c1c8bf' },
  },
  'thistledown-hills': {
    skyTop: '#ece6f5',
    skyBottom: '#d9d0ea',
    ground: '#b9aed4',
    accent: '#a08cc9',
    dim: { skyTop: '#e5e3e9', skyBottom: '#d8d5dd', ground: '#c6c3cc' },
  },
  'copperleaf-orchard': {
    skyTop: '#fbe4cf',
    skyBottom: '#f2c9a7',
    ground: '#d99a6c',
    accent: '#c97b4b',
    dim: { skyTop: '#e8e1da', skyBottom: '#ddd3ca', ground: '#c9bfb5' },
  },
  'mistvale-marsh': {
    skyTop: '#dbe8e6',
    skyBottom: '#bfd4d1',
    ground: '#8fb3ae',
    accent: '#6f9a95',
    dim: { skyTop: '#e0e4e3', skyBottom: '#d1d7d6', ground: '#bcc5c3' },
  },
  emberpeak: {
    skyTop: '#f9d7d0',
    skyBottom: '#f2b8ad',
    ground: '#c67d70',
    accent: '#e0836f',
    dim: { skyTop: '#e7dfdd', skyBottom: '#dbd0cd', ground: '#c4b6b3' },
  },
  'cloudspire-isles': {
    skyTop: '#f3e4f4',
    skyBottom: '#dfcde6',
    ground: '#b8b6dc',
    accent: '#c9a3d6',
    dim: { skyTop: '#e7e2e8', skyBottom: '#dad5dc', ground: '#c7c6cf' },
  },
  'frostglass-tundra': {
    skyTop: '#e6f2fb',
    skyBottom: '#cfe3f3',
    ground: '#b4cfe3',
    accent: '#9dc2dd',
    dim: { skyTop: '#e4e8ec', skyBottom: '#d7dde2', ground: '#c7ced4' },
  },
  'neonoko-city': {
    skyTop: '#2f2a4a',
    skyBottom: '#4b3f6b',
    ground: '#6e5a8e',
    accent: '#f4a6d7',
    dim: { skyTop: '#3a3a44', skyBottom: '#4a4a55', ground: '#5c5c66' },
  },
  'starlit-harbor': {
    skyTop: '#c9d4e6',
    skyBottom: '#a9b9d4',
    ground: '#7f93b5',
    accent: '#e8e2b8',
    dim: { skyTop: '#d6dae0', skyBottom: '#c5c9d0', ground: '#aeb3bb' },
  },
  'sunreach-spire': {
    skyTop: '#fde6c8',
    skyBottom: '#f8c9a5',
    ground: '#e5a17c',
    accent: '#f2c46a',
    dim: { skyTop: '#e8e1d8', skyBottom: '#ddd2c7', ground: '#cbbcb0' },
  },
  'skylight-sanctuary': {
    skyTop: '#fff1d6',
    skyBottom: '#fbd9c2',
    ground: '#f3c5c5',
    accent: '#ffd700',
    dim: { skyTop: '#ece7df', skyBottom: '#e0d8d3', ground: '#d4c8c8' },
  },
};

export const DEFAULT_LAND: LandId = 'sunmeadow-hollow';
