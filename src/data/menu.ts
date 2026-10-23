/**
 * Speisekarte of the X-Bar (shown on Theke & Küche). Fill in `groups` with
 * the dishes and drinks (each group is one page of the little booklet),
 * and/or put the menu as a PDF into public/ and set
 * `pdf` (e.g. '/speisekarte.pdf'). While both are empty the card says the
 * menu is coming soon.
 */
export interface MenuItem {
  name: string;
  /** As printed, e.g. '1,50 €'. */
  price: string;
  note?: string;
}

export interface MenuGroup {
  title: string;
  items: MenuItem[];
  /** Small print under the group, e.g. the Pfand. */
  note?: string;
}

export const menu: { groups: MenuGroup[]; pdf?: string } = {
  // From the chalkboard at the X-Bar.
  groups: [
    {
      title: 'Essen',
      items: [
        { name: 'Käse- oder Nutella-Toast', price: '0,60 €' },
        { name: 'Käse-Wrap (mit oder ohne Mais)', price: '0,80 €' },
        { name: 'Tomate-Mozzarella', price: '1,00 €' },
        { name: 'Kräuterbaguette', price: '1,50 €' },
        { name: 'Pommes', price: '1,00 €', note: 'Jeden Freitag' },
      ],
    },
    {
      title: 'Süßes',
      items: [
        { name: 'Lolli', price: '0,20 €' },
        { name: 'Riegel', price: '0,70 €' },
        { name: 'Süße Tüte', price: '1,00 €' },
      ],
    },
    {
      title: 'Getränke',
      items: [
        { name: 'fritz-limo', price: '1,50 €' },
        { name: 'Coca-Cola', price: '1,50 €' },
        { name: 'Eistee', price: '1,50 €' },
        { name: 'Spezi-E', price: '1,50 €' },
        { name: 'Spezi', price: '1,00 €' },
        { name: 'Kaffee', price: '1,50 €' },
      ],
      note: 'Auf alle Flaschen kommen 50 ct Pfand.',
    },
  ],
  pdf: undefined,
};
