import { createInertiaPageWithChildren } from "@/inertia/createPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";

export default createInertiaPageWithChildren(() => (
  <PlaceholderPage page="reports" />
));
