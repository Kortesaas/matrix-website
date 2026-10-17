/**
 * The X for the admin area's ink header, drawn in white from the same icon
 * data as the site's logo (src/data/icons.ts).
 */
import type { APIRoute } from 'astro';
import { icons } from '../../data/icons';

export const GET: APIRoute = () => {
  const { viewBox, paths } = icons.xmark;
  const body = paths
    .map((p) => `<path d="${p.d}"${'evenodd' in p && p.evenodd ? ' fill-rule="evenodd"' : ''}/>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="#fff">${body}</svg>`;
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
};
