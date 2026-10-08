"""Build the unsigned AMO upload archive from reviewed runtime files only."""

import json
import re
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "halo-extension"
DIST = ROOT / "dist"
RUNTIME_FILES = (
    "manifest.json",
    "icon.svg",
    "popup.html",
    "popup.css",
    "popup.js",
    "settings.js",
    "projection.js",
    "site.js",
    "blur.js",
    "twitch-surfaces.js",
    "zen-bridge.js",
    "content.js",
    "content.css",
)


def main():
    manifest = json.loads((SOURCE / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["manifest_version"] == 2
    assert manifest["browser_specific_settings"]["gecko"]["id"] == "halo-transparent@local.extension"
    assert manifest["browser_specific_settings"]["gecko"]["data_collection_permissions"] == {"required": ["none"]}
    assert manifest["permissions"] == ["storage", "https://www.youtube.com/*", "https://www.twitch.tv/*"]
    declared = {"manifest.json"}
    declared.update(manifest["icons"].values())
    declared.update((manifest["browser_action"]["default_popup"], manifest["browser_action"]["default_icon"]))
    declared.add(manifest["options_ui"]["page"])
    for script in manifest["content_scripts"]:
        declared.update(script["js"] + script["css"])
    popup = (SOURCE / "popup.html").read_text(encoding="utf-8")
    declared.update(re.findall(r'(?:src|href)="([\w.-]+\.(?:js|css|svg))"', popup))
    assert declared == set(RUNTIME_FILES), f"Runtime file list drift: {declared ^ set(RUNTIME_FILES)}"
    assert len(RUNTIME_FILES) == len(set(RUNTIME_FILES))

    DIST.mkdir(exist_ok=True)
    archive = DIST / f"halora-{manifest['version']}-unsigned.zip"
    with ZipFile(archive, "w", ZIP_DEFLATED, compresslevel=9) as output:
        for name in sorted(RUNTIME_FILES):
            path = SOURCE / name
            assert path.is_file() and path.resolve().is_relative_to(SOURCE.resolve())
            info = ZipInfo(name, date_time=(2020, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            output.writestr(info, path.read_bytes(), compress_type=ZIP_DEFLATED, compresslevel=9)
    with ZipFile(archive) as check:
        assert check.testzip() is None
        assert set(check.namelist()) == set(RUNTIME_FILES)
    print(f"Built {archive} ({len(RUNTIME_FILES)} runtime files). Mozilla signing is still required for persistent installation.")


if __name__ == "__main__":
    main()
