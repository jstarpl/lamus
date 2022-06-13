import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { ListView } from "./../components/ListView";
import { ListViewItem } from "../components/ListViewItem";

export default {
  /* 👇 The title prop is optional.
   * See https://storybook.js.org/docs/react/configure/overview#configure-story-loading
   * to learn how to generate automatic titles
   */
  title: "ListView",
  component: ListView,
} as ComponentMeta<typeof ListView>;

export const Basic: ComponentStory<typeof ListView> = () => (
  <ListView multiple>
    <ListViewItem key={"one"} value={"one"}>
      One
    </ListViewItem>
    <ListViewItem key={"two"} value={"two"}>
      Two
    </ListViewItem>
    <ListViewItem key={"three"} value={"three"}>
      Three
    </ListViewItem>
    <ListViewItem key={"four"} value={"four"}>
      Four
    </ListViewItem>
    <ListViewItem key={"five"} value={"five"}>
      Five
    </ListViewItem>
  </ListView>
);
Basic.storyName = "List View, uncontrolled, multi-select, with 5 items";
