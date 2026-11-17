import type { ComponentProps, MouseEvent } from "react";
export default function Link(props: ComponentProps<"a">) {
  return (
    <a
      {...props}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        if (props.target) return;
        event.preventDefault();
        history.pushState(null, "", props.href);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }}
    />
  );
}
