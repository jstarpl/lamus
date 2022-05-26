import { Parent, Literal } from "unist";
import { DocumentBlockList } from "@editorjs/editorjs";

export function parseListToMarkdown(block: DocumentBlockList["data"]) {
  let items: string[] = [];
  switch (block.style) {
    case "unordered":
      items = block.items.map((item) => `* ${item}`);

      return items.join("\n").concat("\n");
    case "ordered":
      items = block.items.map((item, index) => `${index + 1}. ${item}`);

      return items.join("\n").concat("\n");
    default:
      break;
  }
}

export function parseMarkdownToList(
  block: Parent<Parent<Parent<Literal<string>>>, { ordered: boolean }>
) {
  let listData = {};
  const itemData: string[] = [];

  console.log(block);

  block.children.forEach((items) => {
    items.children.forEach((listItem) => {
      listItem.children.forEach((listEntry) => {
        itemData.push(listEntry.value);
      });
    });
  });

  listData = {
    data: {
      items: itemData,
      style: block.data?.ordered ? "ordered" : "unordered",
    },
    type: "list",
  };

  return listData;
}
