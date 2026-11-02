# XML formatter spike (M5, plan 5a)

**Decision:** write our own tokenizer and serializer in `src/features/xml-formatter/core/xml.ts` instead of adopting `xml-formatter`.

**Why.** The requirement is that the tool never changes text, attributes, namespaces, comments, CDATA or processing instructions (PRD 3.5), and that whitespace in mixed content and under `xml:space="preserve"` is content. A formatter built on a DOM round trip (or one that re-serialises tokens) normalises quotes, expands entities and drops the DOCTYPE internal subset and XML declaration. The plan allowed this fallback when a library cannot be proven equivalent, and a tokenizer over input that `DOMParser` has already accepted is small (about 200 lines), so it was cheaper to own than to verify and wrap a dependency. `xml-formatter` was not installed or run.

**Design.**
1. `DOMParser` validates; its `parsererror` is normalised to a position (Chrome/Safari "line N at column M", Firefox "Line Number N, Column M", jsdom "N:M:").
2. A tokenizer splits the well-formed text into elements, text, comments, CDATA, PIs and DOCTYPE, keeping each piece's exact source.
3. Only element-only content (elements, comments, PIs and blank text, no CDATA) is re-indented or compacted. Everything else, including `xml:space="preserve"` subtrees, whitespace-only values and mixed content, is written back verbatim.
4. The output is parsed again and compared with the input as a signature (names, sorted attributes, text, CDATA, PIs, comments; blank text ignored only in element-only content). A mismatch returns an error instead of text.

**Known limits** (shown in the tool's help): DTD content is kept verbatim but not validated; the parser's own error wording is shown in English.
