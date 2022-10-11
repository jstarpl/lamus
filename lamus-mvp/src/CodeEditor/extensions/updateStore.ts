import { EditorState, Extension, Transaction } from "@codemirror/state";
import { EditorStore } from "../stores/EditorStore";

export const updateModel: Extension = EditorState.changeFilter.of(
  (transaction: Transaction) => {
    if (transaction.changes.length === 0) return true;

    EditorStore.setDocument(transaction.newDoc?.sliceString(0));

    return true;
  }
);
