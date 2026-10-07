# Halora for Zen

Halora is a Firefox extension for Zen Browser that draws a live, blurred halo from the edges of YouTube videos and Twitch streams. It preserves Zen's transparent background. You can leave the page fully transparent or dim it by a chosen amount.

## Install temporarily

1. Keep Zen's transparency enabled with your usual theme.
2. Open `about:debugging#/runtime/this-firefox` in Zen.
3. Choose **Load Temporary Add-on** and select this directory's `manifest.json`.
4. Reload any YouTube or Twitch tabs that were already open, then start a video or stream.
5. Open the Halora toolbar popup to adjust the effect. Changes apply immediately and are saved locally.

This build is unsigned. Temporary add-ons must be loaded again after a Zen restart. A signed Firefox add-on is needed for a persistent installation; no browser security preference needs to be disabled. See [Mozilla's temporary installation guide](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/).

## Controls

- **Light:** Set overall reach up to 6,000 CSS pixels per side, strength, and blur. Advanced controls adjust reach and blur independently for the top, right, bottom, and left edges. The default projection extends video edges; an enlarged-image projection is also available.
- **Page background:** 0% dimming keeps your existing transparency. Higher values add a translucent dark layer, either across the page or around the player. The video and text remain readable.
- **Player:** Set rounded corners for the displayed video. The effect is removed in fullscreen. YouTube's theater layout adapts the player to the displayed video so its native timeline, preview, and seeking stay aligned.
- **Twitch chat:** Optionally make the chat panel translucent, with adjustable background opacity.
- **Zen tabs:** With [Halora Tabs for Zen](../README.md) installed through Sine, continue the halo behind the active tab's sidebar. Set tab intensity and outer fade independently.
- **Fine-tuning:** Adjust color, smoothing, scene-change response, transparent black pixels, and automatic or manual treatment of black bars.
- **Performance:** Choose capture rate, quality, and where the effect runs.

Every slider has a numeric field for an exact value. The input is clamped to the control's allowed range, and both fields stay synchronized. Enable **Separate YouTube and Twitch settings** if you want a different profile for each site. Switching back to shared settings does not erase either profile.

The halo remains anchored to the player's location in the page as you scroll and leaves the screen naturally. It does not pin a copy of the video behind the comments. Twitch's theater layout keeps its own player geometry and native controls.

## Privacy and limitations

Video frames are processed locally for color sampling and are never stored or sent to a remote service. Settings are stored in the browser. Some protected video streams block pixel sampling; Halora shows a warning in that case. The optional Sine mod receives only compact edge-color data inside Zen.

The add-on's internal ID and setting keys remain stable across the Halora rename, preserving existing preferences. See [validation notes](VALIDATION.md) for automated coverage and limits. Licensed under [MIT](LICENSE).
