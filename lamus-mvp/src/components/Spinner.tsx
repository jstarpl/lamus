import React from "react";
import PulseLoader from "react-spinners/PulseLoader";

export const Spinner: React.FC<{}> = function Spinner() {
  return (
    <div className="Spinner">
      <PulseLoader size="1em" color="currentcolor" />
    </div>
  );
};
