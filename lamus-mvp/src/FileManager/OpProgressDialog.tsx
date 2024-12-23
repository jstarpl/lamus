import React from "react";
import { Dialog } from "src/components/Dialog";
import classes from './OpProgressDialog.module.css';
import { IBatchFileOperation } from "./stores/FileManagerStore";

export function OpProgressDialog({
  currentStep,
  currentStepIndex,
  totalStepsCount,
  className
}: {
  currentStep: IBatchFileOperation
  currentStepIndex: number
  totalStepsCount: number
  className: string
}) {
  return (
    <Dialog className={`${classes.OpProgressDialog} bg-files ${className}`}>
      <StepLabel step={currentStep} />
      <p>
        <progress value={currentStepIndex} max={totalStepsCount} />
      </p>
    </Dialog>
  );
}

function StepLabel({
  step,
}: {
  step: IBatchFileOperation;
}): React.ReactNode {
  switch (step.op) {
    case "copyFile":
      return (
        <>
          <p>Copying File</p>
          <p>
            <em className={`${classes.StepLabelItemName}`}>{step.fileName}</em>
          </p>
        </>
      );
    case "delFile":
      return (
        <>
          <p>Deleting File</p>
          <p>
            <em className={`${classes.StepLabelItemName}`}>{step.fileName}</em>
          </p>
        </>
      );
    case "mkDir":
      return (
        <>
          <p>Creating Directory</p>
          <p>
            <em className={`${classes.StepLabelItemName}`}>{step.dirName}</em>
          </p>
        </>
      );
    case "rmDir":
      return (
        <>
          <p>Removing Directory</p>
          <p>
            <em className={`${classes.StepLabelItemName}`}>{step.dirName}</em>
          </p>
        </>
      );
  }
  return null;
}