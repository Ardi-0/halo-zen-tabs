# Releasing the Halora Firefox extension

The extension source is `halo-extension/`. The Sine mod at the repository root is a separate optional companion. Keep the existing Gecko add-on ID in `manifest.json` so signed upgrades retain users' settings.

1. Update the extension version in `halo-extension/manifest.json` and the root `package.json`. Review the permission and data-collection declarations when functionality changes.
2. Run `npm ci` and `npm run check`. This runs Mozilla's `web-ext lint`, tests preference compatibility, and builds `dist/halora-<version>-unsigned.zip` from an explicit list of browser files. CI runs the same checks on pushes and pull requests.
3. Exercise the ZIP as a temporary add-on in Zen and check YouTube, Twitch, the settings popup, export/import, fullscreen, and the optional Sine connection. The fixture coverage in `halo-extension/VALIDATION.md` is additional evidence, not a replacement for a live browser check.
4. Review the [draft public listing](AMO-LISTING.md), then submit the unsigned ZIP through the [AMO Developer Hub](https://addons.mozilla.org/developers/) for a public listing. This requires a Mozilla developer account and Mozilla signing. The unsigned ZIP is an upload artifact, not a permanently installable add-on. Save the signed XPI returned by Mozilla for installation or distribution.
5. Publish release notes and the signed package only after confirming the signed build works in Zen. Never commit AMO API credentials or an unsigned ZIP as if it were a signed XPI.

The add-on declares no data collection. It samples video pixels in the browser, stores settings in `browser.storage.local`, and sends no video or profile data to external services. An explicit settings export creates a local JSON file. Keep the [privacy statement](PRIVACY.md) and AMO disclosure aligned with the implementation.

Mozilla references: [package an extension](https://extensionworkshop.com/documentation/publish/package-your-extension/), [signing and distribution](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/), and [web-ext](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/).
