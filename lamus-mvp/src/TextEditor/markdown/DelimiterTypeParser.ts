import { DocumentBlockDelimiter } from "@editorjs/editorjs";

export function parseDelimiterToMarkdown() {
  const delimiter = "---";

  return `\n${delimiter}\n`;
}

export function parseMarkdownToDelimiter() {
  const delimiterData: DocumentBlockDelimiter = {
    data: {
      items: [],
    },
    type: "delimiter",
  };

  return delimiterData;
}
