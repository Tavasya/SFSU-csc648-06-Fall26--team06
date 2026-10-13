import Shell from "@/components/gatoraid/Shell";
import "./platform.css";
export const metadata = {
  title: "GatorAid | SFSU Events",
  description: "Discover and manage events at San Francisco State University.",
};
export default function Layout({ children }) {
  return <Shell>{children}</Shell>;
}
