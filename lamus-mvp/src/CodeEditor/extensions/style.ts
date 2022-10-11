import { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

export const style: Extension = EditorView.baseTheme({
  "&.cm-editor": {
    "font-size": "1.5em",
    "font-family": "var(--system-code-font-family)",
  },

  ".cm-activeLine": {
    "background-color": "var(--color-light)",
  },

  ".cm-gutters": {
    "background-color": "var(--color-tint-1)",
    "min-width": "80px",
  },

  ".cm-lineNumbers": {
    "flex-grow": 1,
  },

  ".cm-activeLineGutter": {
    "background-color": "var(--color-tone)",
  },
});

// .changeFilter.of(
//   (transaction: Transaction) => {
//     if (transaction.changes.length === 0) return true;

//     EditorStore.setDocument(transaction.newDoc?.sliceString(0));

//     return true;
//   }
// );
