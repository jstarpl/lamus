import { EditorView, Decoration, WidgetType } from "@codemirror/view";
import {
  Compartment,
  EditorState,
  Extension,
  RangeSetBuilder,
  StateEffect,
  Transaction,
  TransactionSpec,
} from "@codemirror/state";

class LineErrorWidget extends WidgetType {
  constructor(
    readonly message: string,
    readonly column: number,
    readonly index: number,
    readonly total: number
  ) {
    super();
  }
  eq(other: LineErrorWidget) {
    return (
      other.message === this.message &&
      other.column === this.column &&
      other.index === this.index &&
      other.total === this.total
    );
  }
  toDOM() {
    const wrap = document.createElement("div");
    wrap.setAttribute("aria-hidden", "true");
    wrap.className = "cm-line-error";

    const icon = wrap.appendChild(document.createElement("span"));
    icon.className = "cm-line-error-icon";
    icon.setAttribute("role", "presentation");
    icon.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-octagon-fill" viewBox="0 0 16 16"><title>Error</title><path d="M11.46.146A.5.5 0 0 0 11.107 0H4.893a.5.5 0 0 0-.353.146L.146 4.54A.5.5 0 0 0 0 4.893v6.214a.5.5 0 0 0 .146.353l4.394 4.394a.5.5 0 0 0 .353.146h6.214a.5.5 0 0 0 .353-.146l4.394-4.394a.5.5 0 0 0 .146-.353V4.893a.5.5 0 0 0-.146-.353L11.46.146zm-6.106 4.5L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 1 1 .708-.708z"/></svg>';
    const counter = wrap.appendChild(document.createElement("span"));
    counter.className = "cm-line-error-counter";
    counter.setAttribute("role", "presentation");
    counter.innerText = `(${this.index}/${this.total})`;
    const message = wrap.appendChild(document.createElement("span"));
    message.className = "cm-line-error-message";
    message.setAttribute("role", "alert");
    message.innerText = this.message;
    message.ariaPosInSet = `${this.index}`;
    message.ariaSetSize = `${this.total}`;
    message.ariaLive = "assertive";

    return wrap;
  }
}

export function syntaxErrorDecorations() {
  let globalErrors: IError[] = [];

  const compartment = new Compartment();
  const decorations: Extension = compartment.of(
    EditorView.decorations.of(new RangeSetBuilder<Decoration>().finish())
  );

  const updateModel: Extension = EditorState.transactionExtender.of(
    (
      transaction: Transaction
    ): Pick<TransactionSpec, "effects" | "annotations"> | null => {
      if (transaction.changes.empty) return null;
      let positionsModified = false;

      const errorsToRemove: IError[] = [];
      for (const error of globalErrors) {
        // eslint-disable-next-line no-loop-func
        transaction.changes.iterChangedRanges((fromA, toA, fromB, toB) => {
          /** Check if the intial or final range touches the error */
          if (
            (fromA >= error.from && fromA <= error.to) ||
            (toA > error.from && toA <= error.to) ||
            (fromB >= error.from && fromB <= error.to) ||
            (toB > error.from && toB <= error.to) ||
            (fromA < error.from && toA > error.to) ||
            (fromB < error.from && toB > error.to)
          ) {
            errorsToRemove.push(error);
          }
          /** If the range modified was before the error, move the error */
          if (fromA < error.from || toA < error.to) {
            const diff = toB - fromB - (toA - fromA);
            error.to = error.to + diff;
            error.from = error.from + diff;
            positionsModified = true;
          }
        });
      }

      if (errorsToRemove.length === 0 && !positionsModified) return null;
      globalErrors = globalErrors.filter(
        (error) => !errorsToRemove.includes(error)
      );

      return {
        effects: update(globalErrors),
      };
    }
  );

  const errorDecorations: Extension = [decorations, updateModel];

  function update(errors: IError[]): StateEffect<unknown> {
    const rangeSet = new RangeSetBuilder<Decoration>();

    errors = errors.sort((a, b) => a.from - b.from || a.to - b.to);

    for (let i = 0; i < errors.length; i++) {
      const error = errors[i];
      rangeSet.add(
        error.to,
        error.to,
        Decoration.widget({
          widget: new LineErrorWidget(
            error.message,
            error.column,
            i + 1,
            errors.length
          ),
          block: true,
          side: 1,
        })
      );
    }

    globalErrors = errors;

    return compartment.reconfigure(
      EditorView.decorations.of(rangeSet.finish())
    );
  }

  return {
    errorDecorations,
    update,
  };
}

interface IError {
  message: string;
  from: number;
  to: number;
  column: number;
}
