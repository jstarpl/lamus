declare module "@editorjs/editorjs" {
  interface DocumentBlockBase<T, K> {
    type: T;
    data: K;
  }

  interface DocumentBlockChecklist extends DocumentBlockBase {
    type: "checklist" | "checkbox";
    data: {
      items: { text: string; checked: boolean }[];
    };
  }

  interface DocumentBlockCode extends DocumentBlockBase {
    type: "code";
    data: {
      code: string;
    };
  }

  interface DocumentBlockDelimiter extends DocumentBlockBase {
    type: "delimiter";
    data: {
      items: [];
    };
  }

  interface DocumentBlockHeader extends DocumentBlockBase {
    type: "header";
    data: {
      level: number;
      text: string;
    };
  }

  interface DocumentBlockImage extends DocumentBlockBase {
    type: "image";
    data: {
      caption: string;
      url: string;

      stretched: boolean;
      withBackground: boolean;
      withBorder: boolean;
    };
  }

  interface DocumentBlockList extends DocumentBlockBase {
    type: "list";
    data: {
      items: string[];
      style: "ordered" | "unordered";
    };
  }

  interface DocumentBlockParagraph extends DocumentBlockBase {
    type: "paragraph";
    data: {
      text: string;
    };
  }

  interface DocumentBlockQuote extends DocumentBlockBase {
    type: "quote";
    data: {
      alignment: "left" | "center" | "right";
      caption: string;
      text: string;
    };
  }

  type SomeDocumentBlock =
    | DocumentBlockCode
    | DocumentBlockChecklist
    | DocumentBlockDelimiter
    | DocumentBlockHeader
    | DocumentBlockImage
    | DocumentBlockList
    | DocumentBlockParagraph
    | DocumentBlockQuote;

  interface Document {
    blocks: SomeDocumentBlock[];
    time: number;
    version: string;
  }
}
