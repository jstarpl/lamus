import { GeneralIORouter, InOutRequest } from "@lamus/qbasic-vm";
import {
  ShowModalDialogFunction,
  DialogButtons,
  DialogType,
} from "../../../helpers/useModalDialog";

export default function setup(
  router: GeneralIORouter,
  showModalDialog: ShowModalDialogFunction
) {
  let lastResult: string = "";
  async function outShowModalDialog(req: InOutRequest) {
    let dialogContents: any = {};
    try {
      dialogContents = JSON.parse(req.data ?? "");
    } catch (e) {
      return;
    }

    const dialogResult = await showModalDialog({
      choices: DialogButtons.NO_YES,
      message: dialogContents.message,
      type: dialogContents.type ?? DialogType.QUESTION,
    });
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
    return Promise.resolve();
  };
}
