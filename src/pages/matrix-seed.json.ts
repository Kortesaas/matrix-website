/**
 * Starting content for the admin area: today's opening hours and team,
 * portraits included (as built WebP files). PHP reads this until somebody
 * saves their own version in the admin area.
 */
import type { APIRoute } from 'astro';
import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';
import { site } from '../data/site';
import { teamGroups } from '../data/team';

async function photo(image: ImageMetadata) {
  const widths = [400, 800].filter((w) => w <= image.width);
  const built = await Promise.all(widths.map((width) => getImage({ src: image, width, format: 'webp' })));
  return {
    src: built[built.length - 1].src,
    srcset: built.map((b, i) => `${b.src} ${widths[i]}w`).join(', '),
  };
}

export const GET: APIRoute = async () => {
  const team = [];
  for (const group of teamGroups) {
    for (const member of group.members) {
      if ('open' in member) continue;
      team.push({
        name: member.name,
        role: member.role,
        group: group.key,
        photo: member.portrait && 'width' in member.portrait ? await photo(member.portrait) : null,
      });
    }
  }
  const seed = {
    hours: site.hours,
    team: { members: team, fsjOpening: teamGroups.some((g) => g.members.some((m) => 'open' in m)) },
    teamGroups: teamGroups.map((g) => ({ key: g.key, title: g.title })),
  };
  return new Response(JSON.stringify(seed, null, 2), { headers: { 'Content-Type': 'application/json' } });
};
