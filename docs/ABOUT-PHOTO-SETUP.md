# About page photographs

The two user-supplied photographs are integrated after the existing mandate section on `/about`, in `components/features/about-highlights.tsx`. The user's original files under `public/images/` are preserved.

| Photograph | Original local file | Published asset |
| --- | --- | --- |
| Meeting with Madam Wajiha Qamar | `ec4679a1-4451-4c6c-add5-d145ebe90f04.jpg` | `public/images/editorial/about-institutional-support.jpg` |
| Senate Shield of Honour presentation | `c611ac11-baa9-494a-a89d-6a5d7fa17e21.jpg` | `public/images/editorial/about-senate-recognition.jpg` |

Both photographs were visually inspected before use. The copies preserve the image bytes. The responsive figures use `object-contain` to retain every person's face and the complete composition without stretching. Cards display side by side on large screens and stack on mobile.

Captions retain the owner's wording and paragraph breaks, with HTML ampersands rendered as ordinary ampersands. They are owner-supplied statements, not independently researched reporting.

Local preview: `http://127.0.0.1:55297/about`. No production deployment has been performed.
