import { Parent, Literal } from "unist";
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
      break;
  }
}

export function parseMarkdownToHeader(
  block: Parent<Literal, { depth: number }>
) {
  let headerData: DocumentBlockHeader | undefined = undefined;
  console.log(block);
  const depth = block.data?.depth;

  block.children.forEach((item) => {
    headerData = {
      type: "header",
      data: {
        level: depth ?? 1,
        text: String(item.value),
      },
    };
  });

  return headerData;
}
