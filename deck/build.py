# Inlines fonts and the demo screenshot so the deck is one self-contained file.
import base64, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
fs = root / "node_modules/@fontsource"
faces = [("Onest", "onest", w) for w in (400, 600, 700)] + [("Unbounded", "unbounded", w) for w in (700, 800)] + [("JetBrains Mono", "jetbrains-mono", 500)]
css = []
for fam, pkg, w in faces:
    for sub, rng in (("latin", "U+0000-00FF,U+2000-206F,U+20B8,U+2190-21FF"), ("cyrillic", "U+0400-04FF")):
        b = base64.b64encode((fs / pkg / "files" / f"{pkg}-{sub}-{w}-normal.woff2").read_bytes()).decode()
        css.append(f'@font-face{{font-family:"{fam}";font-weight:{w};font-display:swap;src:url(data:font/woff2;base64,{b}) format("woff2");unicode-range:{rng};}}')
shot = base64.b64encode((root / "media/demo-screenshot.jpg").read_bytes()).decode()
src = (root / "deck/deck.src.html").read_text()
out = src.replace("/*FONTS*/", "\n".join(css)).replace("/*SHOT*/", "data:image/jpeg;base64," + shot)
(root / "deck/holdback-pitch.html").write_text(out)
print("ok", len(out) // 1024, "KB")
