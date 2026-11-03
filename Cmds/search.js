// Search commands adapted for this bot's command-handler API.
// Wikipedia and npm use their public APIs; no API keys or extra packages are needed.
const MAX_NPM_TARBALL_BYTES = 20 * 1024 * 1024;

const requestJson = async (url) => {
  const res = await fetch(url, {
    headers: { 'user-agent': 'XMD-WhatsApp-Bot/1.0', accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Service returned HTTP ${res.status}`);
  return res.json();
};

const npmName = (value) => /^(?:@[a-z0-9._~-]+\/)?[a-z0-9._~-]+$/i.test(value || '');

module.exports = [
  {
    name: 'wiki',
    aliases: ['wikipedia'],
    category: 'search',
    description: 'Search Wikipedia and get a short summary',
    run: async ({ text, reply, prefix }) => {
      const term = text.trim();
      if (!term) return reply(`Usage: ${prefix}wiki <topic>`);
      try {
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srsearch=${encodeURIComponent(term)}&srlimit=1`;
        const data = await requestJson(searchUrl);
        const hit = data.query?.search?.[0];
        if (!hit) return reply('No Wikipedia results found.');
        const title = hit.title;
        const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
        const summary = await requestJson(summaryUrl);
        const extract = (summary.extract || hit.snippet || 'No summary available.')
          .replace(/<[^>]*>/g, '')
          .slice(0, 2500);
        await reply(`${summary.title || title}\n\n${extract}\n\n${summary.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`}`);
      } catch (error) {
        console.error('Wikipedia search failed:', error.message);
        await reply('Wikipedia search is temporarily unavailable. Try again later.');
      }
    },
  },
  {
    name: 'npm',
    aliases: ['npminfo', 'npmpackage'],
    category: 'search',
    description: 'Look up an npm package and its latest version',
    run: async ({ args, reply, prefix }) => {
      const name = (args[0] || '').trim();
      if (!npmName(name)) return reply(`Usage: ${prefix}npm <package-name>`);
      try {
        const data = await requestJson(`https://registry.npmjs.org/${encodeURIComponent(name)}`);
        const version = data['dist-tags']?.latest;
        const latest = data.versions?.[version] || {};
        await reply([
          `${data.name || name}@${version || 'unknown'}`,
          data.description || 'No description provided.',
          `License: ${latest.license || data.license || 'not specified'}`,
          `Weekly downloads: https://www.npmjs.com/package/${encodeURIComponent(name)}`,
          `Link: https://www.npmjs.com/package/${encodeURIComponent(name)}`,
        ].join('\n'));
      } catch (error) {
        console.error('npm lookup failed:', error.message);
        await reply('Package not found or npm registry is temporarily unavailable.');
      }
    },
  },
  {
    name: 'npmdl',
    aliases: ['npmdownload'],
    category: 'download',
    description: 'Download an npm package tarball (up to 20 MB)',
    run: async ({ args, reply, sock, from, msg, prefix }) => {
      const name = (args[0] || '').trim();
      if (!npmName(name)) return reply(`Usage: ${prefix}npmdl <package-name>`);
      try {
        const data = await requestJson(`https://registry.npmjs.org/${encodeURIComponent(name)}`);
        const version = data['dist-tags']?.latest;
        const tarball = data.versions?.[version]?.dist?.tarball;
        if (!version || !tarball) return reply('No downloadable package version was found.');

        const parsed = new URL(tarball);
        if (parsed.protocol !== 'https:' || !['registry.npmjs.org', 'registry.npmjs.com'].includes(parsed.hostname)) {
          return reply('The registry returned an unsupported download URL.');
        }
        const res = await fetch(parsed, { signal: AbortSignal.timeout(30000) });
        if (!res.ok) return reply(`Package download failed (HTTP ${res.status}).`);
        const declaredSize = Number(res.headers.get('content-length'));
        if (declaredSize > MAX_NPM_TARBALL_BYTES) return reply('That package archive is larger than 20 MB.');

        const chunks = [];
        let size = 0;
        for await (const chunk of res.body) {
          size += chunk.length;
          if (size > MAX_NPM_TARBALL_BYTES) return reply('That package archive is larger than 20 MB.');
          chunks.push(chunk);
        }
        const safeName = name.replace(/[^a-z0-9._-]/gi, '-');
        await sock.sendMessage(from, {
          document: Buffer.concat(chunks),
          fileName: `${safeName}-${version}.tgz`,
          mimetype: 'application/gzip',
          caption: `${name}@${version}`,
        }, { quoted: msg });
      } catch (error) {
        console.error('npm package download failed:', error.message);
        await reply('Could not download that package. Check the package name and try again.');
      }
    },
  },
];
