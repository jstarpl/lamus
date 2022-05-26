import { Parent, Literal } from "unist";
import { DocumentBlockQuote } from "@editorjs/editorjs";

export function parseQuoteToMarkdown(block: DocumentBlockQuote["data"]) {
  return `> ${block.text}\n>\n> -- ${block.caption}\n`;
}

export function parseMarkdownToQuote(block: Parent<Parent<Literal<any>>>) {
  let quoteData: DocumentBlockQuote | undefined = undefined;

  block.children.forEach((items) => {
    items.children.forEach((listItem) => {
      if (listItem.type === "text") {
        quoteData = {
          data: {
            alignment: "left",
            caption: "",
            text: listItem.value,
          },
          type: "quote",
        };
      }
    });
  });

  return quoteData;
}
