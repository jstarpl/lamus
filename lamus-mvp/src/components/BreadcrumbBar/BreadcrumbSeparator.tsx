import "./BreadcrumbSeparator.css";

export function BreadcrumbSeparator({ separator }: { separator?: string }) {
  return <div className="BreadcrumbBar__Separator">{separator ?? "/"}</div>;
}
