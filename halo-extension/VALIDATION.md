# Validation notes

This release was checked with automated browser fixtures for the extension, Twitch layout, YouTube theater controls, and the Zen tab bridge. These fixtures reproduce key DOM geometry and interactions; they are not a substitute for testing every live Zen, YouTube, and Twitch layout.

- `work/test-halo.cjs`: video color capture, directional reach and blur, adjustable black-pixel opacity, black-bar handling, dimming, scene cuts, pause, navigation, fullscreen, scrolling, protected-pixel fallback, popup persistence, separate site profiles, precise numeric fields, and JSON backup/restore.
- `work/test-twitch.cjs`: stream detection, theater mode, scrolling, page and chat surfaces, rounded corners, native control preservation, and cleanup.
- `work/test-zen-tabs.cjs`: the extension-to-Sine color bridge, active-tab behavior, transparency, dimming, sidebar continuity, and cleanup.
- Additional fixtures cover YouTube theater seeking and timeline alignment, rounded video corners, directional blur, header coverage, and scroll appearance.

The extension uses the same internal ID and storage keys as earlier releases. The Sine mod also retains its ID. Existing settings should therefore survive the visible rename to Halora.

After reloading the temporary extension in `about:debugging`, reload open YouTube and Twitch pages to replace their content scripts. The popup should display **Halora 0.2.24**. Temporary installations must be loaded again after a Zen restart.

Known limits: protected streams may block color sampling; split views and some compact Zen layouts have not been verified; opaque third-party theme layers can hide the tab halo. No real Zen profile or theme is modified by these automated tests.
