import { SomeDocumentBlock } from "@editorjs/editorjs";
import { parseCheckboxToMarkdown } from "./CheckboxTypeParser";
import { parseCodeToMarkdown } from "./CodeTypeParser";
import { parseDelimiterToMarkdown } from "./DelimiterTypeParser";
import { parseHeaderToMarkdown } from "./HeaderTypeParser";
import { parseImageToMarkdown } from "./ImageTypeParser";
import { parseListToMarkdown } from "./ListTypeParser";
import { parseParagraphToMarkdown } from "./ParagraphTypeParser";
import { parseQuoteToMarkdown } from "./QuoteTypeParser";

export function toMarkdown(document: SomeDocumentBlock[]): string {
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
