interface IProps {}

export function BreadcrumbBar({ children }: React.PropsWithChildren<IProps>) {
  return <div className="BreadcrumbBar__Bar">{children}</div>;
}
