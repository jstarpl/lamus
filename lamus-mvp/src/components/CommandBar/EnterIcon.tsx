import React from "react";

const STYLE_CURRENT_COLOR = { fill: "currentcolor" };

export function EnterIcon() {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 18 18"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g>
        <path
          d="M5,17l0,-6l-3,0l0,-10l14,0l0,16l-11,0Zm8,-8l0,-4l-1,0l0,3l-4,0l0,-2l-3,2.5l3,2.5l0,-2l5,0Z"
          style={STYLE_CURRENT_COLOR}
        />
      </g>
    </svg>
  );
}
