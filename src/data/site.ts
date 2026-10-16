import type { IconName } from './icons';

export type Accent = 'purple' | 'blue' | 'coral' | 'green' | 'yellow' | 'pink';

export const site = {
  name: 'Die MatriX',
  legalName: 'Jugendfreizeitstätte MatriX',
  operator: 'Kreisjugendring Augsburg-Land',
  operatorLine: 'Ein Haus des Kreisjugendrings Augsburg-Land',
  address: {
    street: 'Alter Postweg 2',
    zip: '86343',
    city: 'Königsbrunn',
  },
  phone: { display: '08231 957606-0', href: 'tel:+4982319576060' },
  email: 'info@diematrix.de',
  hours: [
    { days: 'Montag', time: '12:00 – 18:00 Uhr' },
    { days: 'Dienstag & Mittwoch', time: '12:00 – 20:00 Uhr' },
    { days: 'Donnerstag & Freitag', time: '15:00 – 20:00 Uhr' },
  ],
};

export interface NavItem {
  key: string;
  label: string;
  href: string;
}

export const mainNav: NavItem[] = [
  { key: 'angebot', label: 'Angebot', href: '/angebot/' },
  { key: 'raeume', label: 'Räume', href: '/raeume/' },
  { key: 'team', label: 'Team', href: '/team/' },
  { key: 'aktuelles', label: 'Aktuelles', href: '/aktuelles/' },
  { key: 'kontakt', label: 'Kontakt', href: '/mitmachen/#kontakt' },
];

export const ctaNav: NavItem = { key: 'mitmachen', label: 'Mitmachen', href: '/mitmachen/' };

export interface SocialLink {
  icon: IconName;
  label: string;
  handle?: string;
  /** Leave empty until the real profile URL is confirmed — empty entries are not rendered. */
  url: string;
}

// TODO: confirm every profile URL with the MatriX team. The handles come from
// the concepts; Twitch and Discord have no known address yet and stay hidden.
export const socials: SocialLink[] = [
  { icon: 'facebook', label: 'Facebook', handle: '@MatriX', url: 'https://www.facebook.com/MatriX' },
  { icon: 'instagram', label: 'Instagram', handle: '@matrixkoenigsbrunn', url: 'https://www.instagram.com/matrixkoenigsbrunn/' },
  { icon: 'twitch', label: 'Twitch', url: '' },
  { icon: 'youtube', label: 'YouTube', handle: '@DieMatriX', url: 'https://www.youtube.com/@DieMatriX' },
  { icon: 'discord', label: 'Discord', url: '' },
];

export const activeSocials = socials.filter((s) => s.url);
