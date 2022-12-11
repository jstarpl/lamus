import { PhrasingContent } from "mdast";

export function phrasingContentAsString(child: PhrasingContent): string {
  if (
    child.type === "image" ||
    child.type === "imageReference" ||
    child.type === "footnoteReference" ||
    child.type === "break" ||
    child.type === "linkReference"
  ) {
    return "";
  }

  if (
    child.type === "emphasis" ||
    child.type === "strong" ||
    child.type === "delete" ||
    child.type === "footnote" ||
    child.type === "link"
  ) {
    return child.children.map(phrasingContentAsString).join();
  }

  return child.value;
}
