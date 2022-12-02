import { Paragraph } from "mdast";
import { DocumentBlockImage, DocumentBlockParagraph } from "@editorjs/editorjs";

export function parseParagraphToMarkdown(
  block: DocumentBlockParagraph["data"]
) {
  return `${block.text}\n`;
}

export function parseMarkdownToParagraph(block: Paragraph) {
  let paragraphData: (DocumentBlockParagraph | DocumentBlockImage)[] = [];

  if (block.type === "paragraph") {
    block.children.forEach((item) => {
      if (item.type === "text") {
        if (paragraphData[paragraphData.length - 1]?.type === "paragraph") {
          const lastParagraph = paragraphData[
            paragraphData.length - 1
          ] as DocumentBlockParagraph;
          lastParagraph.data.text += "\n" + String(item.value);
        } else {
          paragraphData.push({
            data: {
              text: String(item.value),
            },
            type: "paragraph",
          });
        }
      } else if (item.type === "image") {
        paragraphData.push({
          data: {
            caption: String(item.title),
            stretched: false,
            url: String(item.url),
            withBackground: false,
            withBorder: false,
          },
          type: "image",
        });
      }
    });
  }

  return paragraphData;
}
