"""Inject the shared flame stage (src/stage.js + src/stage.css) into the button-card templates and the custom card."""
import pathlib, re
root = pathlib.Path(__file__).resolve().parents[1]
js = (root / "src/stage.js").read_text().rstrip()
css = (root / "src/stage.css").read_text().rstrip()
fire = (root / "src/fire.js").read_text().rstrip()

def inject(text, tag, body, indent, cstyle):
    o, c = (f"// <{tag}>", f"// </{tag}>") if cstyle == "js" else (f"/* <{tag}> */", f"/* </{tag}> */")
    pat = re.compile(re.escape(indent + o) + r".*?" + re.escape(indent + c), re.S)
    block = "\n".join(indent + l if l.strip() else "" for l in [o] + body.split("\n") + [c])
    new, n = pat.subn(lambda _: block, text)
    assert n == 1, (tag, n)
    return new

p = root / "button-card/modern-flames-templates.yaml"
t = inject(p.read_text(), "mf-stage", js, " " * 10, "js")
t = inject(t, "mf-css", css, " " * 8, "css")
t = inject(t, "mf-fire", fire, " " * 10, "js")
p.write_text(t)
p = root / "dist/modern-flames-card.js"
t = inject(p.read_text(), "mf-stage", js, "", "js")
t = inject(t, "mf-css", css, "  ", "css")
t = inject(t, "mf-fire", fire, "", "js")
p.write_text(t)
print("built")
