import React from "react";
import { ComponentMeta } from "@storybook/react";

export function ColorPalette() {
  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gridTemplateRows: "repeat(4, 5em)",
          gridAutoFlow: "column",
        }}
      >
        {[
          "--color-general",
          "--color-success",
          "--color-danger",
          "--color-files",
          "--color-brand",
          "--color-dark",
        ]
          .map((prefix) => {
            return [1, 2, 3, 4]
              .map((num) => `${prefix}-${num}`)
              .map((colorVar, index) => (
                <div
                  key={colorVar}
                  style={{
                    background: `var(${colorVar})`,
                    color:
                      index % 4 === 0
                        ? `var(${colorVar.replace("-1", "-4")})`
                        : undefined,
                  }}
                >
                  {colorVar}
                </div>
              ));
          })
          .flat(2)}
      </div>
    </>
  );
}

export default {
  /* 👇 The title prop is optional.
   * See https://storybook.js.org/docs/react/configure/overview#configure-story-loading
   * to learn how to generate automatic titles
   */
  title: "Color Palette",
} as ComponentMeta<typeof ColorPalette>;
