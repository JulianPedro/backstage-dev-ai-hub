# NOS Comunicações — Presentation Brand Reference

Extracted from: `yyyymmdd_-_Template_coe_data.pptx` (CoE Data / DataOps & Platforms template)

---

## Colour Palette

### Primary Brand Colours

| Name            | Hex       | Usage                                         |
|-----------------|-----------|-----------------------------------------------|
| NOS Teal        | `#00B3AD` | Primary accent, section divider backgrounds, agenda circles |
| Dark Teal       | `#006462` | Theme accent1, deep backgrounds               |
| Mid Teal        | `#008E8B` | Theme accent2, secondary elements             |
| Light Teal      | `#00E6E1` | Theme accent4, highlights                     |
| Dark Green      | `#005A57` | Slide master background elements              |
| Coral (master)  | `#F26B43` | Slide master decorative accent (rare)         |

### Neutral Colours

| Name            | Hex       | Usage                                         |
|-----------------|-----------|-----------------------------------------------|
| Black           | `#000000` | Primary text (dk1)                            |
| Dark Charcoal   | `#37373A` | Body text                                     |
| Mid Grey        | `#6E6F73` | Captions, secondary text (accent5)            |
| Off-White       | `#F2F2F2` | Slide background (lt2)                        |
| White           | `#FFFFFF` | Text on dark backgrounds, lt1                 |

### Accent Colours

| Name            | Hex       | Usage                                         |
|-----------------|-----------|-----------------------------------------------|
| Blue            | `#3E5BC7` | accent6, call-outs, links                     |
| Navy            | `#2D459B` | Hyperlinks                                    |
| Bright Blue     | `#405DC8` | Followed hyperlinks                           |
| Green           | `#29BA74` | Positive indicators, success states           |
| Yellow          | `#FFFF00` | accent3, high-contrast callout (use sparingly)|
| Dark Navy       | `#2E3558` | Dark text on light backgrounds                |
| Cyan            | `#30C1D7` | Data visualisation accent                     |
| Burgundy        | `#670F31` | Warning/critical states                       |
| Bright Red      | `#E71C57` | Alerts, critical indicators                   |

---

## Typography

### Font Family

- **Primary font**: `Azo Sans` — **always use this font for all text elements without exception**
- The full font family name in the template is `Azo Sans Woso`; both `Azo Sans` and `Azo Sans Woso` are acceptable references to the same family
- **No fallbacks** — do not substitute Calibri, Arial, or any other font. If pptxgenjs or python-pptx defaults to another font, explicitly override it with `Azo Sans`
- In pptxgenjs: set `fontFace: 'Azo Sans'` on every text object
- In python-pptx: set `run.font.name = 'Azo Sans'` on every text run
- Theme font scheme name: "Custom 1"

### Sizes & Weights

| Element              | Size     | Weight   | Colour            |
|----------------------|----------|----------|-------------------|
| Cover title          | 28–36pt  | Bold     | `#006462` or `#00B3AD` |
| Cover subtitle       | 16–18pt  | Regular  | `#37373A`         |
| Slide title          | 24–28pt  | Bold     | `#00B3AD` or White |
| Section header label | 10–12pt  | Bold     | `#00B3AD`         |
| Agenda item          | 12–14pt  | Regular  | `#37373A`         |
| Body text            | 11–14pt  | Regular  | `#37373A`         |
| Caption / footnote   | 9–10pt   | Regular  | `#6E6F73`         |
| Slide number         | 9–10pt   | Regular  | `#6E6F73` or White |

### Text Levels (body content — canonical reference)

All body text must use one of these 9 levels. See SKILL.md for full indent/spacing specs.

| Level | Size | Colour | Weight | Role |
|-------|------|--------|--------|------|
| 1 | 12pt | Black | Regular | Top-level paragraph (no bullet) |
| 2 | 12pt | Black | Regular | First-level bullet |
| 3 | 12pt | Black | Regular | Second-level bullet |
| 4 | 16pt | `#00B3AD` | Regular | Teal sub-heading / label |
| 5 | 16pt | Black | Bold | Bold sub-heading |
| 6 | 16pt | Black | Regular | Large bullet (summary lists) |
| 7 | 44pt | Black | Regular | Big statement / key message |
| 8 | 54pt | `#00B3AD` | Regular | Hero number / KPI callout |
| 9 | 24pt | `#00B3AD` | Regular | Medium callout / section label |

**Text inside shapes must scale to shape size** — use larger levels (7/8/9) for large shapes to give emphasis.

---

## Slide Layouts

### 1. Cover Slide

- **Background**: White (`#FFFFFF`)
- **Top-left**: `DSI | CoE Data` in bold teal (`#00B3AD`), large; subtitle below in dark charcoal
- **Bottom-left**: Date in format `YYYY-MM`, small grey text
- **Bottom-right / Right edge**: Decorative fan/arc graphic made of teal bars graduating from dark to light teal (characteristic NOS visual motif)
- **No NOS logo** on the cover (logo appears on all other slides)
- **No slide number** on cover

### 2. Agenda Slide

- **Background**: White
- **Top-right**: NOS logo
- **Top-left**: `AGENDA` label in teal, small caps, bold
- **Top-right of content area**: Teal separator line
- **Content**: 2-column grid of 8 items (4 left, 4 right)
  - Each item: teal circle with number, text to the right
  - Circles: `#00B3AD` fill, white number text
  - Text: `#37373A`

### 3. Section Divider Slide

- **Background**: Full bleed teal (`#00B3AD`)
- **Top-right**: NOS logo, white variant (`assets/nos_logo_white.png`)
- **Centre-left**: Section title in white, bold, large
- **Below title**: Thin white horizontal rule
- **Bottom-right**: Slide number in white

### 4. Content Slide (Standard)

- **Background**: White or `#F2F2F2`
- **Top-right**: NOS logo
- **Top**: Section label in teal (`#00B3AD`), small, bold — acts as a category/topic tag
- **Title**: Bold, dark charcoal or teal
- **Content area**: Body text, charts, diagrams
- **Bottom**: Slide number, optional source citation in grey

---

## Logo Placement

- **Position**: Top-right corner
- **All slides except cover**
- **Exact size**: Width = 2.38 cm, Height = 1.28 cm — **never stretch or distort**
- The NOS logo uses a white version on dark/teal backgrounds and the standard coloured version on white backgrounds
- Keep consistent size across all slides

---

## The NOS Fan / Arc Motif

The cover slide features a distinctive arc/fan graphic:

- Composed of multiple curved bars/lines radiating from bottom-right
- Colour gradient: dark teal (`#006462`) → mid teal (`#008E8B`) → bright teal (`#00B3AD`) → light teal (`#00E6E1`)
- Bars increase in size from inside to outside
- This motif is the key visual identifier of NOS brand presentations
- Only used on cover slides; content slides use flat colour blocks

---

## Do's and Don'ts

### Do

- Use `#00B3AD` as the primary brand colour throughout
- Apply Azo Sans for all text — no fallbacks, no substitutions
- Keep the NOS logo top-right on every non-cover slide
- Use teal circles for numbered lists and agenda items
- Use full-bleed teal backgrounds for section dividers
- Keep slides clean and minimal — NOS brand is modern and uncluttered

### Don't

- Use random colours outside the NOS palette
- Change font families arbitrarily
- Place logo in positions other than top-right
- Use gradient text or drop shadows (NOS style is flat)
- Mix Portuguese and English labels without consistency
- Omit slide numbers (except cover)
- Stretch or distort images — always maintain aspect ratio
- Place text boxes on top of shapes — use the shape's own text frame
- Centre-align titles or subtitles — always left-align
- Use duplicate slide titles — every title must be unique with pattern `<SECTION> | <SLIDE TITLE>`
- Add subtitle text to the agenda slide — leave subtitle empty on agenda
- Use light greys on white backgrounds — minimum `#6E6F73` for text, `#9E9E9E` for lines/borders, `#E8E8E8` for shape fills. No `#CCCCCC`, `#D0D0D0`, `#F8F8F8`, etc.

---

## Template Reference Files

The canonical template is: `yyyymmdd_-_Template_coe_data.pptx`

- Slide 1: Cover
- Slide 2: Agenda (8-item grid)
- Slide 3: Section divider (teal background)
- Slide 4: Standard content slide (blank)

When available, always use this file as the base template for editing workflows.
