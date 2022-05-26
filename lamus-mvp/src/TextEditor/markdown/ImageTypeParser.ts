import { DocumentBlockImage } from "@editorjs/editorjs";

export function parseImageToMarkdown(block: DocumentBlockImage["data"]) {
  return `![${block.caption}](${block.url} "${block.caption}")`.concat("\n");
}
