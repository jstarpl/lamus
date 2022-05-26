import { Parent, Literal } from "unist";
import { DocumentBlockImage, DocumentBlockParagraph } from "@editorjs/editorjs";

export function parseParagraphToMarkdown(
  block: DocumentBlockParagraph["data"]
) {
  return `${block.text}\n`;
}

export function parseMarkdownToParagraph(block: Parent<Literal<any>>) {
  let paragraphData: DocumentBlockParagraph | DocumentBlockImage | undefined =
    undefined;

  console.log(block);

  if (block.type === "paragraph") {
    block.children.forEach((item) => {
      if (item.type === "text") {
        paragraphData = {
          data: {
            text: String(item.value),
          },
          type: "paragraph",
        };
      }
      if (item.type === "image") {
        paragraphData = {
          data: {
            caption: String(item.value?.title),
            stretched: false,
            url: String(item.value?.url),
            withBackground: false,
            withBorder: false,
          },
          type: "image",
        };
      }
    });
  }

  return paragraphData;
}
