import { EnterIcon } from "src/components/CommandBar/EnterIcon";
import { Dialog } from "src/components/Dialog";
import { useFragmentParams } from "src/helpers/useFragmentRoute";

export interface IFindEventProps {
  searchText: string;
}

export function FindReplaceDialog({
  show,
  defaultValue,
  onFind,
  onCancel
}: {
  show: boolean;
  defaultValue?: string;
  onFind: (e: IFindEventProps) => void;
  onCancel: () => void;
}): JSX.Element | null {
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const target = e.target as typeof e.target & {
      text: { value: string }
    }

    onFind({
      searchText: target.text.value
    })
  }

  const params = useFragmentParams();

  if (!show) return null;
  return (
    <Dialog>
      <h1>Find</h1>
      <p>Text to find</p>
      <form onSubmit={onSubmit}>
        <p>
          <input
            className="form-control"
            type="text"
            data-focus="true"
            enterKeyHint="search"
            minLength={1}
            defaultValue={defaultValue ?? params.get('text') ?? ""}
            autoComplete="off"
            autoCapitalize="off"
            name="text"
          />
        </p>
        <div className="buttons">
          <button
            className="reject"
            tabIndex={2}
            data-accept
            type="button"
            onClick={onCancel}
          >
            <span className="DialogButtonHotkey">Esc</span>
            Cancel
          </button>
          <button tabIndex={1} data-accept type="submit">
            <span className="DialogButtonHotkey">
              <EnterIcon />
            </span>
            Find
          </button>
        </div>
      </form>
    </Dialog>
  );
}
