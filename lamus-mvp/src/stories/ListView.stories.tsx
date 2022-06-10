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
  <ListView>
    <ListViewItem key={"raz"} value={"raz"}>
      Raz
    </ListViewItem>
    <ListViewItem key={"dwa"} value={"dwa"}>
      Dwa
    </ListViewItem>
    <ListViewItem key={"trzy"} value={"trzy"}>
      Trzy
    </ListViewItem>
  </ListView>
);
Basic.storyName = "Basic ListView, uncontrolled, single-select, with 3 items";
