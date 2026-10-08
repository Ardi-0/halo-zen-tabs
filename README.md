# Halora Tabs for Zen

<img src="icon.svg" alt="Halora icon" width="88" height="88">

This repository contains **only the [Sine](https://github.com/CosmoCreeper/Sine) mod for Zen Browser**. It continues the Halora light behind Zen's tabs, matching the page edge and fading toward the outer edge of the sidebar.

The Firefox extension samples YouTube and Twitch video and draws the page halo. This mod receives compact edge-color strips from that extension inside the browser and paints the matching light in Zen's interface. The extension is maintained and packaged separately; this repository contains no extension source or installable add-on.

## Install

1. Install or update this repository, [`Ardi-0/halo-zen-tabs`](https://github.com/Ardi-0/halo-zen-tabs), in Sine. Allow scripts from personal repositories if Sine requests it, then restart Zen if prompted.
2. Install the Halora Firefox extension separately. Its public AMO listing is being prepared; existing development installations can keep using their local temporary build until the signed release is available.
3. Open a YouTube video or Twitch stream. In Halora's **Zen tabs** section, check for **Halora Tabs connected**, then enable **Light up tabs**.

The Sine mod alone cannot sample video; it needs the extension. A persistent extension installation requires a Mozilla-signed add-on.

## Settings

Use Halora's popup to enable **Light up tabs** and adjust the tab effect. The extension's own settings control the video halo and can be set independently for YouTube and Twitch.

**Tab light intensity** controls the light deeper in the sidebar (100% by default). The edge touching the page keeps the page halo's full strength to avoid a visible seam. **Fade toward outer edge** controls how quickly the light falls away (60% by default). The mod also fills the measured space between the sidebar and the web view, up to 160 CSS pixels. Only the active tab lights its sidebar. The effect clears when playback ends, the site changes, the feature is disabled, or fullscreen is entered. The mod keeps Zen's theme colors and controls; an opaque third-party theme element can cover the light.

To disable the effect, turn off **Light up tabs** in Halora or disable the mod in Sine. Uninstall the mod in Sine and restart Zen to remove its script.

## Privacy and compatibility

The connection stays inside the browser. It passes small RGBA color strips sampled from the already filtered page halo and the dimming level, not complete video frames. The page and Zen tabs therefore use the same blur and color grading instead of calculating those effects separately. The mod paints new colors as soon as they arrive. If Zen is busy, the bridge keeps only the newest waiting strip so old frames cannot queue up and leave the tabs behind the page. It sends nothing to a remote service.

The mod temporarily adjusts the active web container's shadow and corner clipping so dark seams do not interrupt the light at Zen's edges. Those styles are restored when the effect stops. Split views and some compact Zen layouts have not been verified. The current implementation has been exercised in automated browser and interface fixtures, but this release has not been inspected in every live Zen layout.

The mod ID remains unchanged from earlier releases so existing Sine installations continue to work. Licensed under [MIT](LICENSE).
