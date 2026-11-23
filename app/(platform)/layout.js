/**
 * Public interfaces supporting R12.10.
 * @module app/platform/layout
 */
import Shell from "@/components/gatoraid/Shell";
import "./platform.css";
export const metadata = {
  title: "GatorAid | SFSU Events",
  description: "Discover and manage events at San Francisco State University.",
};
/**
 * Wrap platform routes in the shared application shell.
 * @function Layout
 * @memberof module:app/platform/layout
 * @static
 * @param {Object} props - Component properties.
 * @param {React.ReactNode} props.children - Nested page content.
 * @returns {React.ReactElement} Rendered component tree.
 */
export default function Layout({ children }) {
  return <Shell>{children}</Shell>;
}
