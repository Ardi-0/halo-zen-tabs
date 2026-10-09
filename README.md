# Halora Tabs for Zen

<img src="icon.svg" alt="Halora icon" width="72" height="72">

A [Sine](https://github.com/CosmoCreeper/Sine) mod that carries Halora's live video light from the web page into Zen Browser's tab sidebar. A small sampled colour grid follows the glow across the tabs and the gap to the page while preserving Zen's theme and transparency.

This repository contains the **Zen mod only**. The [Halora Firefox extension](https://addons.mozilla.org/firefox/addon/halora-video-light-for-zen/) captures colors from YouTube videos and Twitch streams; the mod receives small color strips from that extension inside the browser. **The Firefox Add-ons link is a placeholder while the listing is under review.** The mod does not produce a halo on its own.

## Install

1. Install the Halora Firefox extension when its [Firefox Add-ons listing](https://addons.mozilla.org/firefox/addon/halora-video-light-for-zen/) becomes available. A signed installation is required for the extension to survive a browser restart.
2. Add [`Ardi-0/halora-zen-tabs`](https://github.com/Ardi-0/halora-zen-tabs) in Sine. Enable scripts from personal repositories if Sine asks, and restart Zen if prompted.
3. Open a YouTube video or Twitch stream. In the extension's **Zen tabs** settings, confirm **Halora Tabs connected**, then enable **Light up tabs**.

If the effect is missing, check that the extension is enabled on the current site, the Sine mod is enabled, and Zen was restarted after installation. Protected video can prevent color sampling. Split views and some compact Zen layouts have not been verified.

## Adjust the effect

Use the extension popup to control **Tab light intensity** and **Fade toward outer edge**. The side nearest the page keeps the page halo's full strength to avoid a visible seam. Only the active tab lights its sidebar. The effect clears when playback ends, you leave the video page, or you enter fullscreen.

To turn it off, disable **Light up tabs** in Halora or disable this mod in Sine. Removing the mod from Sine and restarting Zen removes its script.

## Privacy and compatibility

The extension processes video pixels locally without storing or transmitting frames, browsing history, or personal information to an external service. Settings stay in local extension storage; export creates a JSON file only when requested. When enabled, the mod receives a compact sampled colour grid, edge strips, and dimming values inside Zen. It never receives full video frames or sends data to a server. Neither component uses an account, analytics, or an advertising network.

The internal Sine ID remains `halo-zen-tabs` to preserve existing installations after the GitHub repository rename. This mod is licensed under [MIT](LICENSE). To report a problem, [open an issue](https://github.com/Ardi-0/halora-zen-tabs/issues) and mention your Zen and Sine versions.

## Development

Run `node --check halo-tabs.uc.js`, `node scripts/check-mod.mjs`, and `node --test tests/*.test.cjs` to validate the script, Sine metadata, and content bridge. GitHub Actions runs these checks on pushes and pull requests.
