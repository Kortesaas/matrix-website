// Runs after `astro build` and turns dist/ into the PHP site for the webspace:
//  1. every page becomes index.php (so edited content renders on the server),
//  2. <template data-php-template> blocks move to dist/_app/templates/,
//  3. the PHP code from server/ (admin area, calendar endpoint) is copied in,
//  4. the seed content goes to dist/_app/seed.json.
import { cp, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const templatesDir = join(dist, '_app', 'templates');

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

// 3. PHP code first, so the templates land inside its _app folder.
await cp(join(root, 'server'), dist, {
  recursive: true,
  filter: (src) => !src.endsWith(`${sep}dev-router.php`),
});
await mkdir(templatesDir, { recursive: true });

// 4. Seed content.
await rename(join(dist, 'matrix-seed.json'), join(dist, '_app', 'seed.json'));

// 1 + 2. Pages.
const templates = new Map();
const templatePattern = /<template data-php-template="([a-z0-9-]+)">([\s\S]*?)<\/template>/g;
let pages = 0;

for await (const file of walk(dist)) {
  if (!file.endsWith('.html') || file.startsWith(join(dist, '_app'))) continue;
  let html = await readFile(file, 'utf8');

  html = html.replace(templatePattern, (_, name, body) => {
    if (body.includes('<template')) throw new Error(`Template "${name}" must not contain another <template>.`);
    // Astro inlines a component's script where it first renders. Keep it in
    // the page (once) instead of repeating it with every filled template.
    const scripts = [];
    body = body.replace(/<script\b[\s\S]*?<\/script>/g, (script) => {
      scripts.push(script);
      return '';
    });
    if (templates.has(name) && templates.get(name) !== body) {
      throw new Error(`Template "${name}" differs between pages; give each variant its own name.`);
    }
    templates.set(name, body);
    return scripts.join('');
  });

  // Literal "<?" that is not our code (e.g. <?xml in an inline SVG) would
  // start PHP on hosts with short_open_tag on.
  html = html.replace(/<\?(?!php\s|=)/g, "<?= '<?' ?>");

  const toApp = relative(dirname(file), join(dist, '_app')).split(sep).join('/');
  const status = file === join(dist, '404.html') ? ' http_response_code(404);' : '';
  html = `<?php require_once __DIR__ . '/${toApp}/page.php';${status} ?>\n${html}`;

  await writeFile(file.replace(/\.html$/, '.php'), html);
  await rm(file);
  pages++;
}

for (const [name, body] of templates) await writeFile(join(templatesDir, `${name}.html`), body);

console.log(`[postbuild] ${pages} pages as PHP, ${templates.size} templates: ${[...templates.keys()].join(', ')}`);
