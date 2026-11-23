/**
 * Public interfaces supporting R12.10.
 * @module components/gatoraid/Shell
 */
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

// Every app page: the shared top bar, the page, and the shared footer.
// The header and footer sit outside .ga so the app-wide .ga styles don't reach them.
/**
 * Render the shared platform header, page content and footer.
 * @function Shell
 * @memberof module:components/gatoraid/Shell
 * @static
 * @param {Object} props - Component properties.
 * @param {React.ReactNode} props.children - Nested page content.
 * @returns {React.ReactElement} Rendered component tree.
 */
export default function Shell({ children }) {
  return (
    <div className="site-page">
      <SiteHeader />
      <div className="ga">
        <main className="ga-content site-wrap">{children}</main>
      </div>
      <SiteFooter />
    </div>
  );
}
