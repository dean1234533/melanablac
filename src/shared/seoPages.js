// Search / answer-engine landing pages. Pure data, shared by the storefront (React) and the Pages Functions
// (server-rendered meta, JSON-LD and crawler-readable HTML). Only facts true of the catalogue are stated:
// original illustrated cards, A5, blank inside, supplied with an envelope. Prices, stock and delivery come from the live shop.

import { deliveryText } from './delivery.js';

export const FACTS = {
  size: 'A5 (148 × 210 mm)',
  inside: 'blank inside, ready for your own message',
  extras: 'supplied with an envelope',
};

const A = (path, label) => ({ path, label });

export const SEO_PAGES = [
  // ---------- occasion hub ----------
  {
    slug: 'cards', path: '/cards', kind: 'hub',
    title: 'Black Art Greeting Cards by Occasion | MelanaBlac',
    h1: 'Greeting cards by occasion',
    description: 'Illustrated greeting cards celebrating Black joy, family and faith: birthday, Christmas, nativity, Mother\'s Day and inspirational. A5, blank inside.',
    intro: [
      'MelanaBlac cards are original illustrations that put Black women, men, children and families at the centre of the picture. Each card is A5, blank inside so the words are yours, and comes with an envelope.',
      'Pick an occasion below, or browse every design in the shop.',
    ],
    sections: [],
    faqs: [
      { q: 'What size are MelanaBlac greeting cards?', a: 'Every card is A5 (148 × 210 mm) and blank inside, supplied with an envelope.' },
      { q: 'Are the designs original?', a: 'Yes. Every illustration is original MelanaBlac artwork and is protected by copyright.' },
    ],
    related: [],
  },

  // ---------- category pages ----------
  {
    slug: 'birthday-cards', path: '/cards/birthday-cards', kind: 'category', category: 'Birthday Cards',
    title: 'Black & Gold Birthday Cards, Illustrated | MelanaBlac',
    h1: 'Birthday cards',
    description: 'Illustrated birthday cards for 16th, 18th, 21st, 30th and 60th birthdays, plus mum, grandma, sister, daughter, son and king. A5, blank inside, with envelope.',
    intro: [
      'A birthday card should look like the person receiving it. These illustrated MelanaBlac designs feature braids, headwraps, afros, gold crowns, balloons and gifts, in black and gold, pink and gold, blue and blush.',
      'There are milestone cards for 16th, 18th, 21st, 30th and 60th birthdays, and cards written for a mother, grandma, sister, daughter, son or king. Every card is A5, blank inside, and comes with an envelope.',
    ],
    sections: [
      { h: 'Milestone birthday cards', p: ['Turning 16, 18, 21, 30 or 60 deserves more than a generic card. Browse the milestone designs, then write your own message inside.'], links: [A('/cards/16th-birthday-cards', '16th birthday cards'), A('/cards/18th-birthday-cards', '18th birthday cards'), A('/cards/21st-birthday-cards', '21st birthday cards')] },
      { h: 'Birthday cards for someone special', p: ['Cards for the women, girls, boys and men in your life, from a grandma to a growing son.'], links: [A('/cards/birthday-cards-for-mum-and-grandma', 'For mum and grandma'), A('/cards/birthday-cards-for-daughter-and-sister', 'For a daughter or sister'), A('/cards/birthday-cards-for-boys-and-men', 'For boys and men')] },
    ],
    faqs: [
      { q: 'Are the birthday cards blank inside?', a: 'Yes. Every birthday card is blank inside so you can write your own message, and each one comes with an envelope.' },
      { q: 'What size are the birthday cards?', a: 'A5 (148 × 210 mm), a generous size that stands up well on a shelf or mantelpiece.' },
      { q: 'Which milestone birthdays do you have cards for?', a: 'The collection includes 16th, 18th, 21st, 30th and 60th birthday designs. The range changes as new designs are added, so check the shop for what is available now.' },
    ],
    related: ['/guides/what-to-write-in-a-birthday-card', '/guides/a5-greeting-card-size-guide', '/cards/christmas-cards'],
  },
  {
    slug: 'christmas-cards', path: '/cards/christmas-cards', kind: 'category', category: 'Christmas Cards',
    title: 'Christmas Cards Celebrating Black Families | MelanaBlac',
    h1: 'Christmas cards',
    description: 'Illustrated Christmas cards showing Black families singing carols, walking through snow and gathering for dinner. A5, blank inside, with envelope.',
    intro: [
      'Snowy villages, carols, family dinners and walks beneath a bright star: these Christmas cards show Black families celebrating the season together.',
      'Each design is an original illustration. Every card is A5, blank inside for your own greeting, and comes with an envelope.',
    ],
    sections: [
      { h: 'Looking for a nativity card instead?', p: ['The nativity range tells the Christmas story in silver blue and starlight.'], links: [A('/cards/nativity-cards', 'Nativity cards')] },
    ],
    faqs: [
      { q: 'Are the Christmas cards blank inside?', a: 'Yes. They are blank inside so you can add a personal message, and each card comes with an envelope.' },
      { q: 'Do you have religious Christmas cards?', a: 'Yes. Some Christmas designs carry a message of praise and grace, and there is a separate range of nativity cards.' },
      { q: 'What size are the Christmas cards?', a: 'A5 (148 × 210 mm).' },
    ],
    related: ['/cards/nativity-cards', '/guides/choosing-a-christmas-or-nativity-card', '/cards/birthday-cards'],
  },
  {
    slug: 'nativity-cards', path: '/cards/nativity-cards', kind: 'category', category: 'Nativity Cards',
    title: 'Nativity Christmas Cards, Illustrated | MelanaBlac',
    h1: 'Nativity cards',
    description: 'Illustrated nativity cards: Mary and child, the holy family by starlight, a shepherd and a star. A5, blank inside, with envelope.',
    intro: [
      'The nativity story, illustrated in silver blue, gold and starlight. These cards show Mary watching over the manger, the holy family by starlight, a shepherd and a star, and Emmanuel.',
      'Each card is an original illustration, A5, blank inside, and comes with an envelope.',
    ],
    sections: [],
    faqs: [
      { q: 'Are the nativity cards blank inside?', a: 'Yes, so you can write your own Christmas message. Each card comes with an envelope.' },
      { q: 'What is the difference between nativity and Christmas cards?', a: 'Nativity cards illustrate the Christmas story itself: the manger, the holy family, the shepherds and the star. Christmas cards show family celebrations such as carols, snow and dinner.' },
    ],
    related: ['/cards/christmas-cards', '/guides/choosing-a-christmas-or-nativity-card', '/cards'],
  },
  {
    slug: 'inspirational-cards', path: '/cards/inspirational-cards', kind: 'category', category: 'Inspirational Cards',
    title: 'Inspirational Cards: Black Women Portraits | MelanaBlac',
    h1: 'Inspirational cards',
    description: 'Portrait cards celebrating Black women: Becoming Her, Earthstrong and afro portraits in colour and gold. A5, blank inside, with envelope.',
    intro: [
      'Portraits of Black women in curls, locs, beads and gold, for a friend, a sister or yourself. The Becoming Her and Earthstrong designs are made to encourage.',
      'Each card is an original illustration, A5, blank inside, and comes with an envelope. They suit a thank-you, an encouragement or a gift with no occasion at all.',
    ],
    sections: [],
    faqs: [
      { q: 'What can I use an inspirational card for?', a: 'They are blank inside, so they work for encouragement, thanks, congratulations or simply a note to say you are thinking of someone.' },
      { q: 'What size are they?', a: 'A5 (148 × 210 mm), supplied with an envelope.' },
    ],
    related: ['/cards/birthday-cards', '/cards/mothers-day-cards', '/cards'],
  },
  {
    slug: 'mothers-day-cards', path: '/cards/mothers-day-cards', kind: 'category', category: "Mother's Day Cards",
    title: "Mother's Day Cards, Illustrated in Gold | MelanaBlac",
    h1: "Mother's Day cards",
    description: "Illustrated Mother's Day cards honouring mothers as icons of grace and original queens. A5, blank inside, with envelope.",
    intro: [
      'Honour the woman who raised you. The Icon of Grace and The Original Queen designs celebrate mothers with gold, colour and dignity.',
      'Each card is an original illustration, A5, blank inside for your own words, and comes with an envelope.',
    ],
    sections: [],
    faqs: [
      { q: "Are the Mother's Day cards blank inside?", a: 'Yes. Write your own message; each card comes with an envelope.' },
      { q: 'Is there a card for a grandma or a mother on her birthday?', a: 'Yes. See the birthday cards for mum and grandma.' },
    ],
    related: ['/cards/birthday-cards-for-mum-and-grandma', '/guides/mothers-day-card-messages', '/cards/inspirational-cards'],
  },

  // ---------- milestone and recipient pages (filtered from the Birthday Cards category by title) ----------
  {
    slug: '16th-birthday-cards', path: '/cards/16th-birthday-cards', kind: 'filter', category: 'Birthday Cards', match: '16th',
    title: '16th Birthday Cards, Black & Gold | MelanaBlac',
    h1: '16th birthday cards',
    description: 'Illustrated 16th birthday cards in black and gold with balloons and gifts. A5, blank inside, with envelope.',
    intro: ['Sweet sixteen, illustrated. These 16th birthday cards pair black and gold balloons with wrapped gifts. A5, blank inside, with an envelope.'],
    sections: [],
    faqs: [{ q: 'Is the 16th birthday card blank inside?', a: 'Yes, so you can write your own message. It comes with an envelope.' }],
    related: ['/cards/18th-birthday-cards', '/cards/21st-birthday-cards', '/cards/birthday-cards'],
  },
  {
    slug: '18th-birthday-cards', path: '/cards/18th-birthday-cards', kind: 'filter', category: 'Birthday Cards', match: '18th',
    title: '18th Birthday Cards for Daughter & Sister | MelanaBlac',
    h1: '18th birthday cards',
    description: 'Illustrated 18th birthday cards in pink and gold, including cards for a daughter and a sister. A5, blank inside, with envelope.',
    intro: ['Becoming an adult is worth marking. These 18th birthday cards include a pink and gold design with champagne and balloons, plus cards written for a beautiful daughter or sister. A5, blank inside, with an envelope.'],
    sections: [],
    faqs: [{ q: 'Do you have an 18th birthday card for a daughter?', a: 'Yes. "18th Birthday: To My Beautiful Daughter" is part of the range, and there is a matching card for a sister.' }],
    related: ['/cards/21st-birthday-cards', '/cards/birthday-cards-for-daughter-and-sister', '/cards/birthday-cards'],
  },
  {
    slug: '21st-birthday-cards', path: '/cards/21st-birthday-cards', kind: 'filter', category: 'Birthday Cards', match: '21st',
    title: '21st Birthday Cards, Black & Gold | MelanaBlac',
    h1: '21st birthday cards',
    description: 'Illustrated 21st birthday cards in black and gold with braids, balloons and cake. A5, blank inside, with envelope.',
    intro: ['A 21st deserves a card with presence. These illustrated designs feature balloons, gifts and birthday cake in black and gold. A5, blank inside, with an envelope.'],
    sections: [],
    faqs: [{ q: 'What size is the 21st birthday card?', a: 'A5 (148 × 210 mm), blank inside, supplied with an envelope.' }],
    related: ['/cards/18th-birthday-cards', '/guides/what-to-write-in-a-birthday-card', '/cards/birthday-cards'],
  },
  {
    slug: 'birthday-cards-for-mum-and-grandma', path: '/cards/birthday-cards-for-mum-and-grandma', kind: 'filter', category: 'Birthday Cards', match: '\\b(Mama|Mother|Grandma)\\b',
    title: 'Birthday Cards for Mum & Grandma, Illustrated | MelanaBlac',
    h1: 'Birthday cards for mum and grandma',
    description: 'Illustrated birthday cards for a mum, mama or grandma, with family kisses and lilac florals. A5, blank inside, with envelope.',
    intro: ['For the woman who holds the family together. These birthday cards are written for a mother, a mama or a grandma, with family kisses, florals and soft colour. A5, blank inside, with an envelope.'],
    sections: [],
    faqs: [{ q: 'Are these cards blank inside?', a: 'Yes. The front carries the greeting; the inside is yours to fill.' }],
    related: ['/cards/mothers-day-cards', '/guides/what-to-write-in-a-birthday-card', '/cards/birthday-cards'],
  },
  {
    slug: 'birthday-cards-for-daughter-and-sister', path: '/cards/birthday-cards-for-daughter-and-sister', kind: 'filter', category: 'Birthday Cards', match: '\\b(Daughter|Sister)\\b',
    title: 'Birthday Cards for Daughter & Sister | MelanaBlac',
    h1: 'Birthday cards for a daughter or sister',
    description: 'Illustrated birthday cards for a daughter or a sister in blue, gold and pink. A5, blank inside, with envelope.',
    intro: ['Say it to her face, or at least on the card. These birthday cards are written for a wonderful daughter or a sister, in blue and gold and pink and gold. A5, blank inside, with an envelope.'],
    sections: [],
    faqs: [{ q: 'Are these cards blank inside?', a: 'Yes, so you can write something personal. An envelope is included.' }],
    related: ['/cards/18th-birthday-cards', '/guides/what-to-write-in-a-birthday-card', '/cards/birthday-cards'],
  },
  {
    slug: 'birthday-cards-for-boys-and-men', path: '/cards/birthday-cards-for-boys-and-men', kind: 'filter', category: 'Birthday Cards', match: '\\b(Boy|Gentleman|King|Son)\\b',
    title: 'Birthday Cards for Boys, Sons & Men | MelanaBlac',
    h1: 'Birthday cards for boys, sons and men',
    description: 'Illustrated birthday cards for a son, a boy, a gentleman or a king. A5, blank inside, with envelope.',
    intro: ['Birthday cards for the boys and men in your life: a son, a little boy among gift boxes, a gentleman in cream, or a king. A5, blank inside, with an envelope.'],
    sections: [],
    faqs: [{ q: 'Are these cards blank inside?', a: 'Yes. Write your own message; an envelope is included.' }],
    related: ['/cards/birthday-cards', '/guides/what-to-write-in-a-birthday-card', '/cards'],
  },

  // ---------- guides (evergreen answers) ----------
  {
    slug: 'what-to-write-in-a-birthday-card', path: '/guides/what-to-write-in-a-birthday-card', kind: 'guide',
    title: 'What to Write in a Birthday Card: Ideas & Examples | MelanaBlac',
    h1: 'What to write in a birthday card',
    description: 'Simple ways to start a birthday message, with examples for a mum, a daughter, a friend and a milestone birthday.',
    intro: ['A blank card is a good thing: the picture says the occasion, and your words say the rest. Keep it short, specific and true.'],
    sections: [
      { h: 'A simple formula', p: ['Greet them by name, say one thing you value about them, add one memory or wish for the year ahead, and sign off warmly. Three or four lines is plenty.'] },
      { h: 'Examples you can borrow', p: ['For a mum or grandma: "Thank you for every meal, every prayer and every time you believed in me. Happy birthday. I love you."', 'For a daughter or sister: "Watching you grow into yourself is my favourite thing. Happy birthday, and here is to your best year yet."', 'For a milestone such as an 18th or 21st: "New chapter, same brilliant you. Proud of everything you have become. Happy birthday."', 'For a son or a king: "You make this family proud every day. Enjoy your day, you have earned it."'] },
      { h: 'Make it feel personal', p: ['Mention a shared joke, a place or something they said. One real detail beats three generic lines.'] },
    ],
    faqs: [
      { q: 'How long should a birthday card message be?', a: 'Two to four sentences is enough. A short message that mentions something specific feels warmer than a long generic one.' },
      { q: 'What do I write if I am not close to the person?', a: 'Keep it warm and simple: "Wishing you a wonderful birthday and a year full of good things."' },
    ],
    related: ['/cards/birthday-cards', '/cards/21st-birthday-cards', '/guides/mothers-day-card-messages'],
  },
  {
    slug: 'mothers-day-card-messages', path: '/guides/mothers-day-card-messages', kind: 'guide',
    title: "Mother's Day Card Messages: What to Write | MelanaBlac",
    h1: "Mother's Day card messages",
    description: "Heartfelt ideas for what to write in a Mother's Day card, for a mum, a grandma or a mother figure.",
    intro: ["Mother's Day messages land best when they are specific. Name one thing she did, and say what it meant."],
    sections: [
      { h: 'Short messages', p: ['"Thank you for everything you are." "You are my original queen." "I am who I am because of you."'] },
      { h: 'Longer messages', p: ['"Thank you for the sacrifices I did not see until I was older. Your strength shaped me, and your love still carries me. Happy Mother\'s Day."', '"Every good thing in me, I learned from you. I hope today feels as special as you make everyone else feel."'] },
      { h: 'For a grandma or mother figure', p: ['"You have loved me like your own, and I will never forget it. Happy Mother\'s Day."'] },
    ],
    faqs: [
      { q: "What should I write in a Mother's Day card?", a: 'Thank her for something specific, say what it meant to you, and end with love. Even two lines from the heart are enough.' },
      { q: 'Can I give a Mother\'s Day card to someone who is not my mother?', a: 'Yes. Grandmothers, aunts, mentors and carers are often celebrated on Mother\'s Day.' },
    ],
    related: ['/cards/mothers-day-cards', '/cards/birthday-cards-for-mum-and-grandma', '/guides/what-to-write-in-a-birthday-card'],
  },
  {
    slug: 'choosing-a-christmas-or-nativity-card', path: '/guides/choosing-a-christmas-or-nativity-card', kind: 'guide',
    title: 'Christmas or Nativity Card? How to Choose | MelanaBlac',
    h1: 'Choosing a Christmas or nativity card',
    description: 'How to choose between a family Christmas card and a nativity card, and what to write inside.',
    intro: ['Both are Christmas cards. The difference is the picture: one celebrates the season, the other tells the story.'],
    sections: [
      { h: 'Choose a Christmas card for family warmth', p: ['Carols in the snow, a family dinner, children by the tree. These are best for friends, neighbours, colleagues and relatives, whatever their faith.'] },
      { h: 'Choose a nativity card for the story', p: ['The manger, Mary and child, the holy family under the star, the shepherd. These suit church friends, family who keep the faith, and anyone who wants the meaning of Christmas front and centre.'] },
      { h: 'What to write inside', p: ['"Wishing you peace, joy and time together this Christmas." For nativity cards: "May the light of the season fill your home with grace."'] },
    ],
    faqs: [
      { q: 'When should I send Christmas cards in the UK?', a: 'Many people post cards in the first two weeks of December. Check the last recommended posting dates with Royal Mail.' },
      { q: 'Are the cards blank inside?', a: 'Yes. Every MelanaBlac Christmas and nativity card is blank inside and comes with an envelope.' },
    ],
    related: ['/cards/christmas-cards', '/cards/nativity-cards', '/cards'],
  },
  {
    slug: 'a5-greeting-card-size-guide', path: '/guides/a5-greeting-card-size-guide', kind: 'guide',
    title: 'A5 Greeting Card Size Guide | MelanaBlac',
    h1: 'A5 greeting card size guide',
    description: 'A5 is 148 × 210 mm (5.8 × 8.3 in). What that looks like, which envelope fits and where an A5 card stands best.',
    intro: ['A5 is 148 × 210 mm, or about 5.8 × 8.3 inches: half the size of an A4 sheet.'],
    sections: [
      { h: 'How big is A5?', p: ['An A5 card is slightly larger than a standard postcard and about the size of a paperback book. It is a generous format for illustration, so the artwork has room to be seen.'] },
      { h: 'Envelopes', p: ['A5 cards usually fit a C5 envelope, which measures 162 × 229 mm. Every MelanaBlac card comes with an envelope.'] },
      { h: 'Displaying an A5 card', p: ['A5 cards stand well on a shelf, mantelpiece or windowsill, and fit a standard A5 frame if you want to keep the artwork.'] },
    ],
    faqs: [
      { q: 'What size is an A5 card in inches?', a: 'About 5.8 × 8.3 inches (148 × 210 mm).' },
      { q: 'What envelope fits an A5 card?', a: 'A C5 envelope (162 × 229 mm) is the usual fit.' },
    ],
    related: ['/cards', '/cards/birthday-cards', '/guides/what-to-write-in-a-birthday-card'],
  },
];

export const SEO_BY_PATH = Object.fromEntries(SEO_PAGES.map((p) => [p.path, p]));
export const categoryOf = (page) => page.category || '';
export const matchesProduct = (page, product) => {
  if (page.category && product.category !== page.category) return false;
  if (page.match && !new RegExp(page.match, 'i').test(product.title)) return false;
  return true;
};

// Sitewide FAQ, rendered at /faq and marked up as FAQPage. Dynamic answers (delivery) are filled in from site content.
export const SITE_FAQ = (t) => [
  { q: 'What is MelanaBlac?', a: 'MelanaBlac is an independent art brand selling original illustrated greeting cards that celebrate Black culture, family, faith and joy.' },
  { q: 'What size are the cards, and are they blank inside?', a: 'Every card is A5 (148 × 210 mm), blank inside so you can write your own message, and comes with an envelope.' },
  { q: 'What occasions do you have cards for?', a: 'Birthday (including 16th, 18th, 21st, 30th and 60th), Christmas, nativity, Mother\'s Day and inspirational cards.' },
  { q: 'Are the illustrations original?', a: 'Yes. Every design is original MelanaBlac artwork and is protected by copyright.' },
  { q: 'How does delivery work?', a: deliveryText({ 'shop.deliveryFee': t('shop.deliveryFee'), 'shop.freeDeliveryOver': t('shop.freeDeliveryOver'), 'shop.shipping': t('shop.shipping'), 'site.currency': t('site.currency') }) },
  { q: 'Can I ask about a commission or a custom design?', a: 'Yes. Send a message through the contact page with what you have in mind.' },
  { q: 'How do I contact MelanaBlac?', a: `Use the contact form on the website, or email ${t('site.email')}.` },
];
