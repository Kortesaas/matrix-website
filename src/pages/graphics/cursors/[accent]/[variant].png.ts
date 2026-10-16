import type { APIRoute, GetStaticPaths } from 'astro';
import sharp from 'sharp';
import { accents } from '../../../../data/site';
import { accentColours } from '../../../../styles/palette';

const variants = ['hand', 'hand@2x', 'hand-tap', 'hand-tap@2x', 'hand-flat@2x'];

// Generate the native and animated cursor assets at build time. Colours come
// from the same tokens as the pages; the deployed site stays entirely static.
export const getStaticPaths: GetStaticPaths = () => accents.flatMap((accent) => {
  return variants.map((variant) => ({ params: { accent, variant }, props: { colour: accentColours[accent] } }));
});

export const GET: APIRoute = async ({ params, props }) => {
  const source = `public/graphics/cursors/${params.variant}.png`;
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const colour = props.colour as string;
  const rgb = [1, 3, 5].map((offset) => parseInt(colour.slice(offset, offset + 2), 16));

  // Only the sleeve is mint (#00B877) in the original artwork. Its green
  // chroma measures coverage at the smoothed edges; leave the white glove,
  // ink outlines and transparency untouched.
  const sleeve = [0, 184, 119];
  for (let i = 0; i < data.length; i += info.channels) {
    const green = data[i + 1];
    if (green - data[i] < 12 || green - data[i + 2] < 8) continue;
    const coverage = Math.min(1, (green - data[i]) / sleeve[1]);
    for (let channel = 0; channel < 3; channel++) {
      const value = data[i + channel] + (rgb[channel] - sleeve[channel]) * coverage;
      data[i + channel] = Math.round(Math.max(0, Math.min(255, value)));
    }
  }
  const png = await sharp(data, { raw: info }).png().toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
