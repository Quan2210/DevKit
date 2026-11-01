import type { GuideBlock } from "../../i18n";

/** Renders structured help content from the i18n catalog (prerendered, so it is also the page's SEO text). */
export function GuideContent({ blocks }: { blocks: ReadonlyArray<GuideBlock> }) {
  return (
    <div className="max-w-[70ch] space-y-3">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "h2":
            return (
              <h2 key={index} className="pt-3 text-lg font-semibold">
                {block.text}
              </h2>
            );
          case "p":
            return <p key={index}>{block.text}</p>;
          case "ul":
            return (
              <ul key={index} className="list-disc space-y-1 pl-5">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            );
        }
      })}
    </div>
  );
}
