# Halora Tabs for Zen

<img src="halo-extension/icon.svg" alt="Halora icon" width="88" height="88">

Halora extends colors from YouTube and Twitch video edges into the page while preserving Zen Browser's transparency. This [Sine](https://github.com/CosmoCreeper/Sine) mod continues that light behind Zen's tabs, matching the page edge and fading toward the outer edge of the sidebar.

The Firefox extension and Sine mod work together: the extension samples the video and renders the page halo; the mod renders the matching light in Zen's interface. The extension also works without the Sine mod; only the light behind Zen's tabs is missing.

The source for the installable Firefox add-on is in [`halo-extension/`](halo-extension/). Its [release checklist](PUBLISHING.md) covers validation, packaging, and Mozilla signing. The Sine mod stays at the repository root so Sine can install it directly.

## Install

1. Install or update this repository, [`Ardi-0/halo-zen-tabs`](https://github.com/Ardi-0/halo-zen-tabs), in Sine. Allow scripts from personal repositories if Sine requests it, then restart Zen if prompted.
2. Install the Firefox extension from [`halo-extension/`](halo-extension/README.md). For a temporary installation, open `about:debugging#/runtime/this-firefox` in Zen, select **Load Temporary Add-on**, and choose `halo-extension/manifest.json`. Reload it after each Zen restart.
3. Open a YouTube video or Twitch stream. In Halora's **Zen tabs** section, check for **Halora Tabs connected**, then enable **Light up tabs**.

For a persistent extension installation, a signed Firefox add-on is required. The temporary installation does not change browser security settings.

## Settings

Use Halora's popup to adjust reach, blur, color, dimming, rounded player corners, and the Zen tab effect. Every slider has a numeric field for exact values; percentage fields support tenths. **Separate YouTube and Twitch settings** creates independent profiles while preserving the shared profile. **Settings backup** exports or imports all profiles in a versioned JSON file.

**Tab light intensity** controls the light deeper in the sidebar (100% by default). The edge touching the page keeps the page halo's full strength to avoid a visible seam. **Fade toward outer edge** controls how quickly the light falls away (60% by default). The mod also fills the measured space between the sidebar and the web view, up to 160 CSS pixels. Only the active tab lights its sidebar. The effect clears when playback ends, the site changes, the feature is disabled, or fullscreen is entered. The mod keeps Zen's theme colors and controls; an opaque third-party theme element can cover the light.

To disable the effect, turn off **Light up tabs** in Halora or disable the mod in Sine. Uninstall the mod in Sine and restart Zen to remove its script.

## Privacy and compatibility

The connection stays inside the browser. It passes small RGBA color strips sampled from the already filtered page halo and the dimming level, not complete video frames. The page and Zen tabs therefore use the same blur and color grading instead of calculating those effects separately. The mod paints new colors as soon as they arrive instead of waiting for another animation frame. If Zen is busy, the bridge keeps only the newest waiting strip so old frames cannot queue up and leave the tabs behind the page. It does not send them to a remote service. The extension stores settings in `browser.storage.local`, validates them when loading, and applies defaults for missing values. Import replaces the current profiles only after the JSON file passes format and value checks. Some protected videos prevent pixel sampling; Halora reports this in the popup.

The mod temporarily adjusts the active web container's shadow and corner clipping so dark seams do not interrupt the light at Zen's edges. Those styles are restored when the effect stops. Split views and some compact Zen layouts have not been verified. The current implementation has been exercised in automated browser and interface fixtures, but this release has not been inspected in every live Zen layout.

The mod ID and extension ID remain unchanged from earlier releases so existing installations and saved preferences continue to work. Licensed under [MIT](LICENSE).
