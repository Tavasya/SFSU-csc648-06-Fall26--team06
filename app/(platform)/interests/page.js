/**
 * Public interfaces supporting R5.2.
 * @module app/platform/interests/page
 */
import Interests from "@/components/student/Interests";
/**
 * Render the student interest selection screen.
 * @function Page
 * @memberof module:app/platform/interests/page
 * @static
 * @returns {React.ReactElement} Rendered component tree.
 */
export default function Page() { return <Interests />; }
