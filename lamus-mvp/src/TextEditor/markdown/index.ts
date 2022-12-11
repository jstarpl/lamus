import { remark } from "remark";
import { SomeDocumentBlock } from "@editorjs/editorjs";
import { parseCheckboxToMarkdown } from "./CheckboxTypeParser";
import { parseCodeToMarkdown } from "./CodeTypeParser";
import { parseDelimiterToMarkdown } from "./DelimiterTypeParser";
import {
  parseHeaderToMarkdown,
  parseMarkdownToHeader,
} from "./HeaderTypeParser";
import { parseImageToMarkdown } from "./ImageTypeParser";
import { parseListToMarkdown } from "./ListTypeParser";
import {
  parseMarkdownToParagraph,
  parseParagraphToMarkdown,
} from "./ParagraphTypeParser";
import { parseMarkdownToQuote, parseQuoteToMarkdown } from "./QuoteTypeParser";

export function toMarkdown(document: SomeDocumentBlock[]): string {
  console.log(JSON.parse(JSON.stringify(document)));
  const parsedData = document.map((item) => {
    switch (item.type) {
      case "header":
        return parseHeaderToMarkdown(item.data);
      case "paragraph":
        return parseParagraphToMarkdown(item.data);
      case "list":
        return parseListToMarkdown(item.data);
      case "delimiter":
        return parseDelimiterToMarkdown();
      case "image":
        return parseImageToMarkdown(item.data);
      case "quote":
        return parseQuoteToMarkdown(item.data);
      case "checkbox":
        return parseCheckboxToMarkdown(item.data);
      case "code":
        return parseCodeToMarkdown(item.data);
      case "checklist":
        return parseCheckboxToMarkdown(item.data);
      default:
        break;
    }
    return undefined;
  });

  return parsedData.join("\n");
}

export function fromMarkdown(text: string): SomeDocumentBlock[] {
  const parsedMarkdown = remark().parse(text);

  console.log(parsedMarkdown.children);

  const editorData: SomeDocumentBlock[] = [];

  for (const child of parsedMarkdown.children) {
    switch (child.type) {
      case "heading":
        editorData.push(...parseMarkdownToHeader(child));
        break;
      case "paragraph":
        editorData.push(...parseMarkdownToParagraph(child));
        break;
      case "blockquote":
        editorData.push(parseMarkdownToQuote(child));
    }
  }

  return editorData;
}
