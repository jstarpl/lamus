import type { GeneralIORouter, InOutRequest } from "@lamus/qbasic-vm";
import type {
  ShowModalDialogFunction,
  IDialogChoice,
} from "../../../helpers/useModalDialog";
import { DialogButtons, DialogType } from "../../../helpers/useModalDialog";

export default function setup(
  router: GeneralIORouter,
  showModalDialog: ShowModalDialogFunction
) {
  let lastResult: string = "";
  let abortController: AbortController | null = null;

  async function outShowModalDialog(req: InOutRequest) {
    let dialogContents: DialogContents | undefined = undefined;
    try {
      dialogContents = JSON.parse(req.data ?? "") as DialogContents;
    } catch (e) {
      console.error("Could not parse modal dialog contents: ", req.data);
      return;
    }

    if (!dialogContents) return;

    abortController = new AbortController();
    const dialogResult = await showModalDialog(
      convertDialogContentsToDialog(dialogContents),
      {
        signal: abortController.signal,
      }
    );
    abortController = null;
    lastResult = dialogResult.result;
  }

  async function inReturnLastModalDialogResult(
    req: InOutRequest
  ): Promise<string> {
    const lastResultBuf = lastResult;
    lastResult = "";
    return Promise.resolve(lastResultBuf);
  }

  router.insertRoute("/modalDialog", async (req) => {
    if (req.method === "in") return inReturnLastModalDialogResult(req);
    return outShowModalDialog(req);
  });

  return async () => {
    abortController?.abort();
    return Promise.resolve();
  };
}

function convertDialogContentsToDialog(contents: DialogContents) {
  const choices = convertDialogContentsChoices(contents.choices);
  const type = convertDialogContentsType(contents.type);

  return {
    choices,
    type,
    message: String(contents.message),
  };
}

function convertDialogContentsChoices(
  choices: string
): IDialogChoice<string>[] {
  switch (choices) {
    case DialogContentsChoices.CANCEL_OK:
    case "ok-cancel":
      return DialogButtons.CANCEL_OK;
    case DialogContentsChoices.CANCEL_RETRY:
    case "retry-cancel":
      return DialogButtons.CANCEL_RETRY;
    case DialogContentsChoices.CONTINUE_CANCEL_RETRY:
      return DialogButtons.CONTINUE_CANCEL_RETRY;
    case DialogContentsChoices.NO_CANCEL_YES:
    case "yes-no-cancel":
    case "yes-cancel-no":
      return DialogButtons.NO_CANCEL_YES;
    case DialogContentsChoices.NO_YES:
    case "yes-no":
      return DialogButtons.NO_YES;
    case DialogContentsChoices.OK:
    default:
      return DialogButtons.OK;
  }
}

function convertDialogContentsType(type: string): DialogType {
  switch (type) {
    case DialogContentsType.ERROR:
    case "err":
      return DialogType.ERROR;
    case DialogContentsType.WARNING:
    case "warn":
    case "danger":
      return DialogType.WARNING;
    case DialogContentsType.QUESTION:
    case "ask":
      return DialogType.QUESTION;
    case DialogContentsType.INFO:
    default:
      return DialogType.INFO;
  }
}

interface DialogContents {
  choices: DialogContentsChoices;
  message: string;
  type: DialogContentsType;
}

enum DialogContentsChoices {
  OK = "ok",
  CANCEL_OK = "cancel-ok",
  CANCEL_RETRY = "cancel-retry",
  CONTINUE_CANCEL_RETRY = "continue-cancel-retry",
  NO_YES = "no-yes",
  NO_CANCEL_YES = "no-cancel-yes",
}

enum DialogContentsType {
  ERROR = "error",
  WARNING = "warning",
  INFO = "info",
  QUESTION = "question",
}
