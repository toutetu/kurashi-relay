import type { ComponentType, ReactNode } from "react";
import { InertiaAppShell } from "@/inertia/layouts/InertiaAppShell";

export function createInertiaPage(PageComponent: ComponentType): ComponentType {
  return function InertiaPage() {
    return (
      <InertiaAppShell>
        <PageComponent />
      </InertiaAppShell>
    );
  };
}

export function createInertiaPageWithChildren(
  render: () => ReactNode,
): ComponentType {
  return function InertiaPage() {
    return <InertiaAppShell>{render()}</InertiaAppShell>;
  };
}
