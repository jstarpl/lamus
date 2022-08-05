import "./BreadcrumbCrumb.css";

type IProps = React.DetailedHTMLProps<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
>;

export function BreadcrumbCrumb(props: IProps) {
  return <button className="BreadcrumbBar__Crumb" {...props} />;
}
