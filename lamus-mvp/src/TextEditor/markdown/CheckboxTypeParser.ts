import { Literal } from "unist";
import { DocumentBlockChecklist } from "@editorjs/editorjs";

export function parseCheckboxToMarkdown(
  block: DocumentBlockChecklist["data"]
): string {
  let items = [];

  items = block.items.map((item) => {
    if (item.checked === true) {
      return `- [x] ${item.text}`;
    }
    return `- [ ] ${item.text}`;
  });

  return items.join("\n").concat("\n");
}

export function parseMarkdownToCheckbox(node: Literal) {
  console.log(node);
}
