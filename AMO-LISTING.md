# Draft AMO listing for Halora

This text is ready to review in the AMO submission form. It has not been submitted.

**Name:** Halora — Video Light for Zen

**Summary:** Live, blurred light from YouTube and Twitch videos that preserves Zen Browser transparency.

**Description:**

Halora extends the colors at the edges of YouTube videos and Twitch streams into a soft, moving glow around the player. It is designed for transparent Zen Browser setups: keep your existing transparency or add adjustable page dimming.

Tune the reach and blur on each side, color and brightness, black pixel opacity, and rounded player corners. YouTube and Twitch can share settings or use independent profiles. Export and import your settings as a local JSON file.

The optional [Halora Tabs for Zen](https://github.com/Ardi-0/halo-zen-tabs) Sine mod continues the light behind Zen's tabs. The Firefox extension works on its own without Sine; only the tab effect needs the companion mod.

Halora processes video pixels locally. It does not upload frames or settings, run analytics, or require an account. Some protected streams prevent pixel sampling.

**Firefox categories:** Appearance; Photos, Music & Videos.

**License:** MIT.

**Support website:** https://github.com/Ardi-0/halo-zen-tabs/issues

**Privacy statement:** https://github.com/Ardi-0/halo-zen-tabs/blob/main/PRIVACY.md

**Reviewer notes:** The add-on runs only on `www.youtube.com` and `www.twitch.tv` and uses local storage for settings. Open a watch page or live stream to see the effect; the popup adjusts it in real time. Video pixels are sampled locally with a canvas and discarded after rendering. No remote code, service, or data transmission is used. The optional Zen/Sine component is separate and is not included in the Firefox upload ZIP. The submitted ZIP contains the plain, readable source files shown in `halo-extension/`.
