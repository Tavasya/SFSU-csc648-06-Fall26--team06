import Interests from "./Interests";
import ScheduleManager from "./ScheduleManager";

export default function Profile() {
  return (
    <>
      <div className="ga-heading">
        <div>
          <h1>Your profile</h1>
          <p className="ga-muted">
            Manage the interests and class schedule used to personalize your campus events.
          </p>
        </div>
      </div>
      {/* Keep interests and availability together; both help personalize event discovery. */}
      <div className="student-profile-grid">
        <Interests embedded />
        <ScheduleManager />
      </div>
    </>
  );
}
