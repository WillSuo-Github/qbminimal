# qbminimal

A minimal, phone-friendly Web UI for [qBittorrent](https://www.qbittorrent.org/). It replaces qBittorrent's built-in browser interface with a cleaner one that works just as well on a phone as on a desktop.

Built with React, TypeScript, Vite, and Tailwind CSS.

## Features

- **Torrent list** as a table or as cards. In the table you can show, hide, drag, and resize columns, and sort by any of them. The layout is remembered on each device.
- **Filters** by name, status, category, tag, and tracker, each showing how many torrents it matches.
- **Torrent details**: pieces, transfer facts, files (choose what to download, rename, and save finished files with qBittorrent 5.3), trackers, peers with country flags, and every per-torrent setting: limits, location, queue, category, tags, and more.
- **Bulk actions** for several torrents at once.
- **Add torrents** from links or .torrent files with all of qBittorrent's options, and **create torrents** from files on the server.
- **RSS** feeds and folders, articles, and download rules, including import and export.
- **Search** with qBittorrent's search plugins, and plugin management.
- **Logs**, statistics, connection status, and the alternative speed limit switch.
- **Settings**: every qBittorrent preference, shown only when your qBittorrent version has it.
- Light and dark themes that follow your device, and a layout made for phones, including when added to the home screen.

## Requirements

qBittorrent 5.0 or newer. A few features need a newer version and stay hidden or explain themselves on older ones: SSL settings for torrents need 5.1, reading .torrent files before adding them needs 5.2, and saving finished files from the browser needs 5.3.

## Installing

1. Download `qbminimal-release.zip` from the [latest release](https://github.com/kajover/qbminimal/releases/latest).
2. Unzip it. You get a folder named `qbminimal` with a `public` folder inside it.
3. Copy the `qbminimal` folder to the computer that runs qBittorrent.
4. In qBittorrent, open **Tools > Options > Web UI**, turn on **Use alternative Web UI**, and set **Files location** to the `qbminimal` folder. Choose the folder that contains `public`, not `public` itself.
5. Open the Web UI address in your browser and sign in with your qBittorrent username and password.

To update, replace the contents of the `qbminimal` folder with the new release and reload the page.

## Development

```bash
npm install
npm run dev
```

The dev server sends API requests under `/api` to qBittorrent at `http://localhost:8080`. Change `server.proxy` in `vite.config.ts` to point at yours.

To try the app without a qBittorrent server, run the demo. It keeps pretend torrents in memory, and they react to what you do:

```bash
npm run demo
```

Set `VITE_DEMO_WEB_API=2.17.0` to make the demo act like a newer qBittorrent.

Checks, also run by CI on every push and pull request:

```bash
npm run lint
npm test
npx tsc -b
```

## Building a release

```bash
npm run package
```

This builds into `release/public` and packs it as `qbminimal-release.zip`, the same layout the install steps describe.

`scripts/deploy.sh` copies a release to a server over SSH with `rsync`, then checks that the server is serving it. Put your settings in `.deploy.env`, which git ignores:

```bash
DEPLOY_TARGET=user@host:/path/to/qbminimal
DEPLOY_URL=https://example.com/qbittorrent/
```

Then run `npm run deploy` for the latest release, or `scripts/deploy.sh --zip qbminimal-release.zip` for a local build.

## Credits

qbminimal is influenced by the original project qbitwebber.

Third-party components and their licenses are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## License

qbminimal is free software under the [GNU General Public License v3.0](LICENSE).
