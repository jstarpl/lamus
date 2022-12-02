import { Heading } from "mdast";
import { DocumentBlockHeader } from "@editorjs/editorjs";

export function parseHeaderToMarkdown(block: DocumentBlockHeader["data"]) {
  switch (block.level) {
    case 1:
      return `# ${block.text}\n`;
    case 2:
      return `## ${block.text}\n`;
    case 3:
      return `### ${block.text}\n`;
    case 4:
      return `#### ${block.text}\n`;
    case 5:
      return `##### ${block.text}\n`;
    case 6:
      return `###### ${block.text}\n`;
    default:
      return `# ${block.text}`;
  }
}

export function parseMarkdownToHeader(block: Heading) {
  const headerData: DocumentBlockHeader | undefined = {
    type: "header",
    data: {
      level: 1,
      text: "",
    },
  };

  console.log(block);
  const depth = block.depth;
  headerData.data.level = depth ?? 1;

  let text = "";
  block.children.forEach((item) => {
    if (item.type !== "text") return;
    text += String(item.value);
  });
  headerData.data.text = text;

  return [headerData];
}
