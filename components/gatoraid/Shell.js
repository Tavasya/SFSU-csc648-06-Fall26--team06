import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

// Every app page: the shared top bar, the page, and the shared footer.
// The header and footer sit outside .ga so the app-wide .ga styles don't reach them.
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
