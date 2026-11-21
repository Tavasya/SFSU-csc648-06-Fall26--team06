/**
 * Public interfaces supporting R5.6.
 * @module app/platform/events/for-you/page
 */
import StudentEvents from "@/components/student/StudentEvents";
/**
 * Render the student personalized event recommendations view.
 * @function Page
 * @memberof module:app/platform/events/for-you/page
 * @static
 * @returns {React.ReactElement} Rendered component tree.
 */
export default function Page() { return <StudentEvents />; }
