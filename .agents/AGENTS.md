# Workspace AI Custom Rules

- **Strict Semantics-Based Field Matching**:
  - Whenever generating or editing a form, the AI must automatically match questions to their most appropriate premium widget type (e.g. `name` for names, `email` for emails, `phone` for contact numbers, `price` for money, `rating` for star ratings, `agreement` for check consents, `feedback` for paragraph texts, and `photo`/`resume` for file uploads).
  - Standard text inputs (`short_text`/`long_text`) must never be used for fields that have dedicated premium types.

- **Automated Options Lists & Settings**:
  - Generation prompts must automatically supply comprehensive, meaningful choice lists (e.g. detailed gender choices, satisfaction levels, dining/visiting frequencies, experience tiers) instead of generic options.

- **Topic-Specific Themes**:
  - Automatically apply cohesive, beautiful HSL primary colors, backgrounds, and font families matching the form's niche (e.g. warm ambers for coffee, deep indigo for corporate, emerald/green for medical, dark slate/violet for modern tech).
