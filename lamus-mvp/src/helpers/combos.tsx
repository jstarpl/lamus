import { EnterIcon } from "../components/CommandBar/EnterIcon";

export function parseCombo(combo: string[] | undefined): {
  lastKey: string | undefined;
  hasShift: boolean;
  hasAlt: boolean;
  hasCtrl: boolean;
  hasMeta: boolean;
} {
  if (!combo) {
    return {
      lastKey: undefined,
      hasShift: false,
      hasAlt: false,
      hasCtrl: false,
      hasMeta: false,
    };
  }

  const lastKey =
    (combo && combo.length > 0 && combo[combo.length - 1]) || undefined;
  const hasShift = (combo && combo.includes("Shift")) || false;
  const hasAlt = (combo && combo.includes("Alt")) || false;
  const hasCtrl = (combo && combo.includes("Control")) || false;
  const hasMeta = (combo && combo.includes("Meta")) || false;

  return {
    lastKey,
    hasShift,
    hasAlt,
    hasCtrl,
    hasMeta,
  };
}

export const COMBO_SHORTHAND: Record<string, React.ReactNode> = {
  Escape: "Esc",
  Enter: <EnterIcon />,
  AnyEnter: <EnterIcon />,
};
