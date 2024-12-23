import React, { useCallback, useContext, useMemo, useReducer } from "react";
import { ModalDialog } from "./ModalDialog/ModalDialog";

export type ShowModalDialogFunction = <Result extends string>(
  dialog: IDialog<Result>,
  options?: IDialogOptions
) => Promise<IDialogResult<Result>>;

interface IModalDialogContext {
  show: ShowModalDialogFunction;
}

const ModalDialogContext = React.createContext<IModalDialogContext>({
  show: () => Promise.reject(),
});

const ModalDialogsStateContext = React.createContext<boolean>(false);

export function useHasModalDialogsOpen() {
  const modalDialogsContext = useContext(ModalDialogsStateContext);

  return modalDialogsContext;
}

export function useModalDialog() {
  const modalContext = useContext(ModalDialogContext);

  return {
    showDialog: modalContext.show,
  };
}

export function ModalDialogContextProvider({
  children,
}: React.PropsWithChildren<{}>) {
  const [dialogRequests, dispatch] = useReducer(dialogRequestReducer, []);

  const context = useMemo<IModalDialogContext>(
    () => ({
      show: <Result extends string>(
        dialog: IDialog<Result>,
        options?: IDialogOptions | undefined
      ) => {
        return new Promise<IDialogResult<string>>((resolve, reject) => {
          const dialogRequest: IDialogRequest<string> = {
            dialog,
            resolveReject: [resolve, reject],
          };

          if (options?.signal) {
            const signal = options.signal;
            const listener = () => {
              dispatch({
                type: "abort",
                dialog: dialogRequest,
                reason: "aborted",
              });
            };

            dialogRequest.signalAndListener = {
              signal,
              listener,
            };
          }

          dispatch({
            type: "insert",
            dialog: dialogRequest,
          });
        }) as Promise<IDialogResult<Result>>;
      },
    }),
    []
  );

  const topDialogRequest = dialogRequests[0] as
    | IDialogRequest<string>
    | undefined;

  const onUserChoice = useCallback(
    (result: string) => {
      if (!topDialogRequest) return;

      dispatch({
        type: "resolve",
        dialog: topDialogRequest,
        choice: result,
      });
    },
    [topDialogRequest]
  );

  return (
    <ModalDialogContext.Provider value={context}>
      <ModalDialogsStateContext.Provider value={dialogRequests.length > 0}>
        {topDialogRequest && (
          <ModalDialog
            choices={topDialogRequest.dialog.choices}
            onUserChoice={onUserChoice}
          >
            {topDialogRequest.dialog.message}
          </ModalDialog>
        )}
        {children}
      </ModalDialogsStateContext.Provider>
    </ModalDialogContext.Provider>
  );
}

type IDialogRequestOp =
  | {
      type: "insert";
      dialog: IDialogRequest<string>;
    }
  | {
      type: "resolve";
      dialog: IDialogRequest<string>;
      choice: string;
    }
  | {
      type: "abort";
      dialog: IDialogRequest<string>;
      reason: any;
    };

interface IDialogRequest<Choice extends string> {
  dialog: IDialog<Choice>;
  resolveReject: [
    (value: IDialogResult<string> | PromiseLike<IDialogResult<string>>) => void,
    (reason: any) => void
  ];
  signalAndListener?: {
    signal: AbortSignal;
    listener: () => void;
  };
}

function dialogRequestReducer(
  dialogRequests: IDialogRequest<string>[],
  action: IDialogRequestOp
): IDialogRequest<string>[] {
  switch (action.type) {
    case "insert": {
      const newDialogRequests = dialogRequests.slice();
      newDialogRequests.push(action.dialog);

      if (action.dialog.signalAndListener) {
        const { signal, listener } = action.dialog.signalAndListener;
        signal.addEventListener("abort", listener);
      }

      return newDialogRequests;
    }
    case "resolve": {
      const resolve = action.dialog.resolveReject[0];
      resolve({ result: action.choice });

      if (action.dialog.signalAndListener) {
        const { signal, listener } = action.dialog.signalAndListener;
        signal.removeEventListener("abort", listener);
      }

      if (!dialogRequests.includes(action.dialog)) return dialogRequests;
      const newDialogRequests = dialogRequests.filter(
        (obj) => obj !== action.dialog
      );
      return newDialogRequests;
    }
    case "abort": {
      const reject = action.dialog.resolveReject[1];
      reject(action.reason);

      if (action.dialog.signalAndListener) {
        const { signal, listener } = action.dialog.signalAndListener;
        signal.removeEventListener("abort", listener);
      }

      if (!dialogRequests.includes(action.dialog)) return dialogRequests;
      const newDialogRequests = dialogRequests.filter(
        (obj) => obj !== action.dialog
      );
      return newDialogRequests;
    }
    default:
      throw new Error("Not implemented");
  }
}

interface IDialogResult<Choice extends string> {
  result: Choice;
}

interface IDialog<Choice extends string> {
  type: DialogType;
  message: React.ReactNode | string;
  choices: IDialogChoice<Choice>[];
}

interface IDialogOptions {
  signal?: AbortSignal;
}

export enum DialogType {
  ERROR = "error",
  WARNING = "warning",
  INFO = "info",
  QUESTION = "question",
}

export interface IDialogChoice<Value extends string = string> {
  label: React.ReactNode;
  value: Value;
  role?: DialogButtonRole;
  default?: boolean;
  combo?: string[];
}

export enum DialogButtonResult {
  OK = "ok",
  CANCEL = "cancel",
  YES = "yes",
  NO = "no",
  RETRY = "retry",
  CONTINUE = "continue",
}

export enum DialogButtonRole {
  ACCEPT = "accept",
  REJECT = "reject",
  OTHER = "other",
}

const DialogButtonsImpl = {
  OK: [
    {
      label: "OK",
      value: DialogButtonResult.OK,
      default: true,
      role: DialogButtonRole.ACCEPT,
      combo: ["Enter"],
    },
  ] as IDialogChoice<DialogButtonResult.OK>[],
  CANCEL_OK: [
    {
      label: "Cancel",
      value: DialogButtonResult.CANCEL,
      role: DialogButtonRole.REJECT,
      combo: ["Escape"],
    },
    {
      label: "OK",
      value: DialogButtonResult.OK,
      default: true,
      role: DialogButtonRole.ACCEPT,
      combo: ["Enter"],
    },
  ] as IDialogChoice<DialogButtonResult.OK | DialogButtonResult.CANCEL>[],
  CANCEL_RETRY: [
    {
      label: "Cancel",
      value: DialogButtonResult.CANCEL,
      role: DialogButtonRole.REJECT,
      combo: ["Escape"],
    },
    {
      label: "Retry",
      value: DialogButtonResult.RETRY,
      role: DialogButtonRole.ACCEPT,
      default: true,
      combo: ["Enter"],
    },
  ] as IDialogChoice<DialogButtonResult.CANCEL | DialogButtonResult.RETRY>[],
  CONTINUE_CANCEL_RETRY: [
    {
      label: "Continue",
      value: DialogButtonResult.CONTINUE,
      combo: ["C"],
    },
    {
      label: "Cancel",
      value: DialogButtonResult.CANCEL,
      role: DialogButtonRole.REJECT,
      combo: ["Escape"],
    },
    {
      label: "Retry",
      value: DialogButtonResult.RETRY,
      default: true,
      role: DialogButtonRole.ACCEPT,
      combo: ["Enter"],
    },
  ] as IDialogChoice<
    | DialogButtonResult.CONTINUE
    | DialogButtonResult.CANCEL
    | DialogButtonResult.RETRY
  >[],
  NO_YES: [
    {
      label: "No",
      value: DialogButtonResult.NO,
      combo: ["N"],
    },
    {
      label: "Yes",
      value: DialogButtonResult.YES,
      default: true,
      combo: ["Y"],
    },
  ] as IDialogChoice<DialogButtonResult.NO | DialogButtonResult.YES>[],
  NO_CANCEL_YES: [
    {
      label: "No",
      value: DialogButtonResult.NO,
      combo: ["N"],
    },
    {
      label: "Cancel",
      value: DialogButtonResult.CANCEL,
      role: DialogButtonRole.REJECT,
      combo: ["Escape"],
    },
    {
      label: "Yes",
      value: DialogButtonResult.YES,
      default: true,
      combo: ["Y"],
    },
  ] as IDialogChoice<
    DialogButtonResult.NO | DialogButtonResult.CANCEL | DialogButtonResult.YES
  >[],
};

export const DialogButtons: Readonly<typeof DialogButtonsImpl> =
  DialogButtonsImpl;

const DialogTemplatesImpl = {
  overwriteExistingFile: (
    fileName: string
  ): IDialog<DialogButtonResult.NO | DialogButtonResult.YES> => ({
    message: (
      <>
        <p>
          File <strong>“{fileName}”</strong> already exists in this directory.
        </p>
        <p>Are you sure you want to overwrite it?</p>
      </>
    ),
    choices: [
      {
        label: "No",
        value: DialogButtonResult.NO,
        default: true,
        role: DialogButtonRole.REJECT,
        combo: ["N"],
      },
      {
        label: "Yes",
        value: DialogButtonResult.YES,
        combo: ["Y"],
      },
    ],
    type: DialogType.WARNING,
  }),
  copyMultipleObjects: (
    firstObjectName: string,
    objectCount: number,
    targetName: string | null
  ): IDialog<DialogButtonResult.NO | DialogButtonResult.YES> => ({
    message:
      objectCount === 1 ? (
       (
          <>
            <p>
              The item{" "}
              <strong>“{firstObjectName}”</strong>
              will be copied to{" "}
              <>
                {targetName ? (
                  <strong>“{targetName}”</strong>
                ) : (
                  "an unknown location"
                )}
              </>
              .
            </p>
            <p>Are you sure you want to copy it?</p>
          </>
        )
      ) : (
        <>
          <p>
            The item{" "}
            <strong>“{firstObjectName}”</strong> and
            <strong>{objectCount - 1}</strong> files and/or folders will be
            copied to{" "}
            <>
              {targetName ? (
                <strong>“{targetName}”</strong>
              ) : (
                "an unknown location"
              )}
            </>
            .
          </p>
          <p>Are you sure you want to copy them?</p>
        </>
      ),
    choices: [
      {
        label: "No",
        value: DialogButtonResult.NO,
        default: true,
        role: DialogButtonRole.REJECT,
        combo: ["N"],
      },
      {
        label: "Yes",
        value: DialogButtonResult.YES,
        combo: ["Y"],
      },
    ],
    type: DialogType.WARNING,
  }),
  deleteObject: (
    objectName: string,
    objectType: "file" | "directory"
  ): IDialog<DialogButtonResult.NO | DialogButtonResult.YES> => ({
    message:
      objectType === "file" ? (
        <>
          <p>
            The file <strong>“{objectName}”</strong> will be permanently
            removed.
          </p>
          <p>Are you sure you want to delete it?</p>
        </>
      ) : (
        <>
          <p>
            The directory <strong>“{objectName}”</strong> will be permanently
            removed.
          </p>
          <p>Are you sure you want to delete it?</p>
        </>
      ),
    choices: [
      {
        label: "No",
        value: DialogButtonResult.NO,
        default: true,
        role: DialogButtonRole.REJECT,
        combo: ["N"],
      },
      {
        label: "Yes",
        value: DialogButtonResult.YES,
        combo: ["Y"],
      },
    ],
    type: DialogType.WARNING,
  }),
  saveBeforeExit: (): IDialog<
    DialogButtonResult.NO | DialogButtonResult.CANCEL | DialogButtonResult.YES
  > => ({
    message: (
      <>
        <p>This file has not been saved.</p>
        <p>Do you want to save it before exiting?</p>
      </>
    ),
    choices: DialogButtons.NO_CANCEL_YES,
    type: DialogType.WARNING,
  }),
};

export const DialogTemplates: Readonly<typeof DialogTemplatesImpl> =
  DialogTemplatesImpl;
