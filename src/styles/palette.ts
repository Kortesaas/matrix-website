import { accents } from '../data/site';
import tokens from './tokens.css?raw';

// Build-time access to the CSS palette, so generated assets and the initial
// browser theme colour always use the same values as the page.
export const accentColours = Object.fromEntries(accents.map((accent) => {
  const colour = tokens.match(new RegExp(`--${accent}-500:\\s*(#[0-9a-f]{6})`, 'i'))?.[1];
  if (!colour) throw new Error(`Missing colour token for ${accent}`);
  return [accent, colour];
}));
