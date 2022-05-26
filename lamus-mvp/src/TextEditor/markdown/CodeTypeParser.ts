import { Literal } from "unist";
import { DocumentBlockCode } from "@editorjs/editorjs";

export function parseCodeToMarkdown(block: DocumentBlockCode["data"]) {
  return `\`\`\`\n${block.code}\n\`\`\`\n`;
}

export function parseMarkdownToCode(block: Literal) {
  const codeData: DocumentBlockCode = {
    data: {
      code: String(block?.value),
    },
    type: "code",
  };

  return codeData;
}
