---
name: nos-presentation-branding
description: >
  Apply NOS Comunicações brand identity when creating or editing PowerPoint presentations.
  Use this skill whenever the user asks to create a presentation, slide deck, or .pptx file
  for NOS, CoE Data, DataOps & Platforms, or any internal NOS team. Also trigger when the
  user says "use NOS branding", "make it look like NOS", "apply our brand", or "DSI/CoE style".
  Always use this skill in combination with the pptx skill for any NOS presentation work.
---

# NOS Presentation Branding Skill

Use this skill **together with the `pptx` skill** whenever creating or editing NOS presentations.
The `pptx` skill is the PowerPoint document-creation skill bundled with the AI assistant (e.g. Claude's document skills); it is a companion runtime skill, not a file in this repository.
If no `pptx` skill is available, generate the `.pptx` directly with `python-pptx` or `pptxgenjs`, applying every rule in this document.

## Assets (bundled in `assets/`)

| File                   | Description                                      |
|------------------------|--------------------------------------------------|
| `nos_logo.png`         | NOS logo (black on transparent), top-right corner of all non-cover slides on white/light backgrounds |
| `nos_logo_white.png`   | NOS logo (white on transparent), top-right corner of slides on dark/teal backgrounds (e.g. section dividers) |
| `cover_background.png` | NOS fan/arc motif — full-slide background for cover slide |

Always embed these files from the skill's `assets/` directory. Never recreate them programmatically.

---

## Font

**Always use `Azo Sans` for all text — no exceptions, no fallbacks.**

- The full family name in the template is `Azo Sans Woso`; `Azo Sans` and `Azo Sans Woso` both refer to the same family and either is an acceptable reference
- pptxgenjs: `fontFace: 'Azo Sans'` on every text object
- python-pptx: `run.font.name = 'Azo Sans'` on every text run
- Never substitute Calibri, Arial, or any other font

---

## Slide Master — MANDATORY, Build First

> ⚠️ **NON-NEGOTIABLE**: You MUST build the slide master before writing a single slide. Do not skip this step, do not add the logo or footer as per-slide objects, do not proceed to slide content until the master is complete. If the toolchain does not support slide masters natively, manipulate the XML directly to inject master elements. There is no acceptable workaround.

The slide master is mandatory because:

- The logo and footer appear on every slide consistently without repeating code
- Slide layouts inherit master elements automatically
- Per-slide duplication of master elements is a defect, not an alternative

### Slide Size — MUST be set explicitly

- 16:9 — **33.867 cm × 19.05 cm** (= 13.333 in × 7.5 in, standard PowerPoint widescreen)
- White background (`#FFFFFF`)

> ⚠️ **CRITICAL pptxgenjs trap:** `LAYOUT_16x9` is **NOT** the standard PowerPoint 16:9 size — it produces 25.4 cm × 14.29 cm (10" × 5.625"), which is WRONG. You **MUST use `LAYOUT_WIDE`** which produces the correct 33.867 cm × 19.05 cm (13.333" × 7.5").
>
> ```javascript
> // ✅ CORRECT — standard PowerPoint 16:9
> pres.layout = 'LAYOUT_WIDE';  // 13.333" × 7.5" = 33.867 cm × 19.05 cm
>
> // ❌ WRONG — do NOT use these
> pres.layout = 'LAYOUT_16x9';  // 10" × 5.625" = 25.4 cm × 14.29 cm — TOO SMALL
> pres.layout = 'LAYOUT_4x3';   // 10" × 7.5" = 25.4 cm × 19.05 cm — WRONG RATIO
> ```
>
> In python-pptx: `prs.slide_width = Cm(33.867)` and `prs.slide_height = Cm(19.05)`.
>
> **After generating the file, verify the slide dimensions.** If slides are ~25 cm wide instead of ~33.8 cm, the wrong layout was used — this is a blocking defect.

### Master Elements Checklist

> ⚠️ **ALL FOUR elements below MUST be present in the slide master. A master missing any one of them is a defect. Verify after building the master that all four exist before proceeding to slide content.**

| # | Element | Required? |
|---|---------|-----------|
| 1 | Title text placeholder | ✅ MANDATORY |
| 2 | Subtitle text placeholder | ✅ MANDATORY |
| 3 | NOS Logo | ✅ MANDATORY |
| 4 | Page number / footnote | ✅ MANDATORY |

### Master Elements (appear on ALL non-cover slides via the master)

#### 1. Title text placeholder — MANDATORY on every non-cover slide

| Property  | Value                         |
|-----------|-------------------------------|
| Left (x)  | 1.13 cm                       |
| Top (y)   | 0.83 cm                       |
| Width     | 29.46 cm                      |
| Height    | 0.92 cm                       |
| Font size | 24pt                          |
| Style     | Bold, ALL CAPS                |
| Alignment | **Left-aligned** (never centred) |
| Font      | Azo Sans                      |
| Colour    | #00B3AD                       |

**Title format rule — STRICTLY ENFORCED:**
Every slide title MUST follow the pattern `<SECTION> | <SLIDE TITLE>` (e.g., `FINOPS | COST BREAKDOWN BY TEAM`).
Additionally, no two slides may share the same title text — always add a differentiating word or short qualifier that relates to that specific slide's content (e.g., `FINOPS | COST OVERVIEW`, `FINOPS | COST TRENDS`, `FINOPS | COST ACTIONS`).
If the user provides duplicate titles, append a relevant summary word to disambiguate.

#### 2. Subtitle text placeholder — MANDATORY on every non-cover slide, "So What" rule

| Property  | Value                         |
|-----------|-------------------------------|
| Left (x)  | 1.14 cm                       |
| Top (y)   | 2.02 cm                       |
| Width     | 29.46 cm                      |
| Height    | 1.65 cm                       |
| Font size | 20pt                          |
| Style     | Italic                        |
| Alignment | **Left-aligned** (never centred) |
| Font      | Azo Sans                      |
| Max lines | 2                             |
| Colour    | #37373A                       |

> ⚠️ **Both the title AND subtitle placeholders are MANDATORY in the slide master.** Every non-cover slide MUST have both placeholders present. A slide master that only has a title placeholder is a defect.

**The subtitle must always answer "so what?" for that slide** — a concise 1–2 sentence insight or takeaway, never a description of the content.
Maximum 2 lines.
If the user provides slide content without a subtitle, generate one from the content.

**Exception — Agenda slide:** The agenda slide subtitle must be **left empty** (the placeholder must still exist in the layout, but its text content must be blank). Do not generate a "so what" subtitle for the agenda slide.

- BAD: "Overview of Q1 pipeline performance"
- GOOD: "Pipeline SLAs were met in 94% of runs — the 6% failures concentrate in a single job and have a known fix."

#### 3. NOS Logo — EXACT dimensions, aspect ratio enforced

| Property  | Value                                          |
|-----------|------------------------------------------------|
| File      | `assets/nos_logo.png` on white/light backgrounds; `assets/nos_logo_white.png` on dark/teal backgrounds (e.g. section dividers) |
| Position  | Top-right corner                               |
| Right     | ~0.3 cm from slide right edge                  |
| Top       | ~0.3 cm from slide top edge                    |
| Width     | **2.38 cm** (exact)                            |
| Height    | **1.28 cm** (exact)                            |

> ⚠️ **NEVER stretch or distort the logo.** Always use exactly Width=2.38cm, Height=1.28cm. When resizing ANY image, always maintain the original aspect ratio — stretched or squashed images are a defect. If only one dimension is set, calculate the other from the source image's aspect ratio.

#### 4. Page number / footnote

| Property  | Value                         |
|-----------|-------------------------------|
| Position  | Bottom-right corner           |
| Right     | ~0.5 cm from slide right edge |
| Bottom    | ~0.3 cm from slide bottom     |
| Font size | 9pt                           |
| Font      | Azo Sans                      |
| Colour    | #6E6F73                       |

### Cover Slide Layout (separate — does NOT inherit logo/footer from master)

- Background: full-slide `assets/cover_background.png` (the teal fan/arc motif)
- NOS logo: **NOT shown** on cover
- Footer: **NOT shown** on cover
- Content is placed directly on the slide (not via master placeholders)

---

## Slide Boundary Rules — STRICTLY ENFORCED

> ⚠️ **Every single element must fit within the slide boundaries.** Violating this is a defect.

### Text Inside Shapes — NO overlay text boxes

> ⚠️ **BLOCKING DEFECT: When a shape contains text, the text MUST be set as the shape's own text content — NEVER as a separate `addText()` call positioned on top of the shape.** Overlaid text boxes make editing impossible because the text and shape move independently. This is the most common defect in generated slides — check for it explicitly.

**pptxgenjs — CORRECT pattern:**

```javascript
// ✅ CORRECT — text is part of the shape
slide.addShape(pres.ShapeType.roundRect, {
  x: 1, y: 4, w: 5, h: 3,
  fill: { color: '00B3AD' },
  rectRadius: 0.2,
  // Text goes HERE, inside the shape definition:
  text: [
    { text: 'KPI Title', options: { fontSize: 14, color: 'FFFFFF', bold: true, breakLine: true } },
    { text: '94%', options: { fontSize: 54, color: 'FFFFFF' } }
  ],
  align: 'center',
  valign: 'middle',
  fontFace: 'Azo Sans'
});

// ❌ WRONG — shape + separate text box on top = DEFECT
slide.addShape(pres.ShapeType.roundRect, {
  x: 1, y: 4, w: 5, h: 3,
  fill: { color: '00B3AD' },
  rectRadius: 0.2
});
slide.addText('94%', {  // ← NEVER DO THIS — creates overlay text box
  x: 1, y: 5, w: 5, h: 1,
  fontSize: 54, color: 'FFFFFF'
});
```

**python-pptx — CORRECT pattern:**

```python
# ✅ CORRECT — use shape.text_frame
from pptx.util import Inches, Pt, Cm
shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Cm(1), Cm(4), Cm(5), Cm(3))
shape.fill.solid()
shape.fill.fore_color.rgb = RGBColor(0x00, 0xB3, 0xAD)
tf = shape.text_frame
tf.text = "94%"
tf.paragraphs[0].font.size = Pt(54)
tf.paragraphs[0].font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

# ❌ WRONG — adding a textbox on top of a shape = DEFECT
shape = slide.shapes.add_shape(...)
textbox = slide.shapes.add_textbox(...)  # ← NEVER overlay text on shapes
```

**Applies to ALL shape types:** rectangles, rounded rectangles, circles, ovals, callout boxes, arrows, agenda number circles — any shape that visually contains text.

**QA check:** After generating, count the number of shapes and text boxes. If a text box overlaps a shape by >50%, it is an overlay defect — the text should be inside the shape instead.

### Text Size in Shapes — Scale to Fit

> When text is placed inside a shape, the font size MUST be proportional to the shape's size. Large shapes should use larger text to give emphasis and fill the space appropriately; small shapes use smaller text. Do not use the same small font in a large card/box — it looks empty and lacks visual weight. Use the Text Level table below as a guide for selecting the right size.

---

## Text Levels — MANDATORY Reference

All body text on content slides MUST use one of the levels below. Pick the level that matches the semantic role of the text (heading, body, bullet, callout, big number). Do not invent ad-hoc sizes/spacing.

| Level | Size | Colour | Weight | Indent before text | Hanging | Spacing before | Spacing after | Line spacing | Usage |
|-------|------|--------|--------|--------------------|---------|----------------|---------------|--------------|-------|
| 1 | 12pt | `#000000` | Regular | 0 cm | — | 6pt | 3pt | 1.1× multiple | Top-level paragraph, no bullets |
| 2 | 12pt | `#000000` | Regular | 0.79 cm | 0.48 cm | 0pt | 3pt | 0.9× multiple | First-level bullet |
| 3 | 12pt | `#000000` | Regular | 1.42 cm | 0.46 cm | 0pt | 3pt | 0.9× multiple | Second-level bullet (sub-bullet) |
| 4 | 16pt | `#00B3AD` | Regular | 0 cm | — | 3pt | 3pt | 1.1× multiple | Teal sub-heading / label |
| 5 | 16pt | `#000000` | **Bold** | 0 cm | — | 0pt | 3pt | Single | Bold sub-heading |
| 6 | 16pt | `#000000` | Regular | 0.75 cm | 0.42 cm | 0pt | 6pt | 0.9× multiple | Large bullet (summary lists) |
| 7 | 44pt | `#000000` | Regular | 0 cm | — | 9pt | 9pt | 0.9× multiple | Big statement / key message |
| 8 | 54pt | `#00B3AD` | Regular | 0 cm | — | 9pt | 9pt | 0.9× multiple | Hero number / KPI callout (teal) |
| 9 | 24pt | `#00B3AD` | Regular | 0 cm | — | 9pt | 9pt | 0.9× multiple | Medium callout / section label (teal) |

**How to apply indentation (hanging bullets):**

- "Indent before text" = left margin of the text area (pptxgenjs: `indentLevel` + `margin`; python-pptx: `paragraph_format.left_margin`)
- "Hanging" = first-line indent is negative by the hanging value, so the bullet character hangs left while wrapped lines align to the indent (python-pptx: `paragraph_format.first_line_indent = -hanging`)
- Levels without a hanging value have no bullet — they are flush-left paragraphs

**Choosing a level:**

- Standard body text → Level 1; its bullets → Level 2; sub-bullets → Level 3
- Section labels or teal headers inside content → Level 4 or Level 9
- Bold headers inside content → Level 5
- Summary / highlight bullets → Level 6
- Big text statements or key messages → Level 7
- Hero KPI numbers in large shapes → Level 8
- When text is inside a large shape, prefer Levels 7/8/9 to fill the shape with emphasis

Slide canvas: **33.867 cm wide × 19.05 cm tall** (origin at top-left = 0,0).

Before placing any object, verify:

```
x >= 0  AND  x + width  <= 33.867
y >= 0  AND  y + height <= 19.05
```

Rules:

- **No element may start at a negative coordinate**
- **No element may extend beyond the right edge (x + width > 33.867 cm)**
- **No element may extend beyond the bottom edge (y + height > 19.05 cm)**
- Apply a minimum **0.3 cm margin** from all slide edges for all content objects
- The safe content area is therefore: x in [0.3, 33.567], y in [0.3, 18.75]
- Text boxes that could overflow due to wrapping must have `autoFit` disabled and content must be pre-trimmed to fit
- After generating, verify every object's computed bounding box before finalising — do not assume the default will be in-bounds

**Content area below the subtitle**: Body content starts at y ≈ 3.8 cm (below subtitle bottom at 2.02 + 1.65 = 3.67 cm) and must end no lower than y = 18.75 cm (leaving bottom margin).

---

## Colour Quick Reference

| Name          | Hex       | Usage                              |
|---------------|-----------|------------------------------------|
| NOS Teal      | #00B3AD   | Primary — titles, accents, circles |
| Dark Teal     | #006462   | Deep backgrounds, cover title      |
| Mid Teal      | #008E8B   | Secondary elements                 |
| Light Teal    | #00E6E1   | Highlights                         |
| Dark Charcoal | #37373A   | Body text                          |
| Mid Grey      | #6E6F73   | Captions, footnotes                |
| Off-White     | #F2F2F2   | Slide background variant           |
| White         | #FFFFFF   | Text on dark, slide background     |
| Blue          | #3E5BC7   | Callouts, links                    |
| Green         | #29BA74   | Positive/success indicators        |
| Red           | #E71C57   | Alerts, critical                   |

### Grey Minimum Contrast — STRICTLY ENFORCED

> ⚠️ **Never use light greys for text, borders, icons, or shape fills on white/light backgrounds.** Light greys are hard to read on projectors and many screens.

**Rules:**

- **Text on white/light backgrounds**: minimum `#6E6F73` (Mid Grey). Never go lighter — no `#999999`, `#AAAAAA`, `#BBBBBB`, `#CCCCCC`, `#D0D0D0`, etc.
- **Lines, borders, shape outlines on white**: minimum `#9E9E9E`. Thinner lines need darker colours.
- **Shape fills (cards, boxes) on white**: minimum `#E8E8E8` for subtle backgrounds. Never use near-white fills like `#F8F8F8` or `#FAFAFA` — they are invisible on most screens.
- **Icons and small graphical elements**: minimum `#6E6F73` on light backgrounds — small elements need stronger contrast than large ones.
- **The only acceptable light neutral is `#F2F2F2`** (Off-White) and only as a slide or card background, never for text, lines, or icons.

**Quick test:** if you squint and the element disappears against its background, it's too light.

Full palette and slide layout details: `references/branding.md`

---

## Workflow

1. Read `references/branding.md` for full specification
2. Follow the companion **`pptx` skill** for the technical workflow (its `editing.md` / `pptxgenjs.md` guides); if it is unavailable, generate the deck directly with `python-pptx` or `pptxgenjs`
3. **Set slide size explicitly** — `33.867 cm × 19.05 cm`. Do NOT rely on library defaults.
4. **Build slide master first** — ALL FOUR elements: title placeholder, subtitle placeholder, logo, footer. **Verify all four exist before proceeding.**
5. Add cover slide using `assets/cover_background.png` as full-bleed background image (no master inheritance)
6. Add content slides — each slide MUST have both a title AND subtitle filled in (except agenda slide where subtitle is empty)
7. **Verify all element bounding boxes** are within slide boundaries before finalising
8. QA: verify logo placement (2.38×1.28 cm, not stretched), fonts, colour correctness, subtitle "so what" quality, and that every slide has both title and subtitle
