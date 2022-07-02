import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { ListView } from "../components/ListView";

export default {
  /* 👇 The title prop is optional.
   * See https://storybook.js.org/docs/react/configure/overview#configure-story-loading
   * to learn how to generate automatic titles
   */
  title: "ListView",
  component: ListView.List,
} as ComponentMeta<typeof ListView.List>;

export const Basic: ComponentStory<typeof ListView.List> = () => (
  <ListView.List multiple>
    <ListView.Item key={"one"} value={"one"}>
      One
    </ListView.Item>
    <ListView.Item key={"two"} value={"two"}>
      Two
    </ListView.Item>
    <ListView.Item key={"three"} value={"three"}>
      Three
    </ListView.Item>
    <ListView.Item key={"four"} value={"four"}>
      Four
    </ListView.Item>
    <ListView.Item key={"five"} value={"five"}>
      Five
    </ListView.Item>
  </ListView.List>
);
Basic.storyName = "List View, uncontrolled, multi-select, with 5 items";
