import Types "types/common";
import Map "mo:core/Map";

import UsersApi "mixins/users-api";
import CoursesApi "mixins/courses-api";
import LeadsApi "mixins/leads-api";
import FollowUpsApi "mixins/followups-api";
import StudentsApi "mixins/students-api";
import EmiApi "mixins/emi-api";
import PaymentsApi "mixins/payments-api";
import ReceiptsApi "mixins/receipts-api";
import RemindersApi "mixins/reminders-api";
import TeamsApi "mixins/teams-api";
import ReportsApi "mixins/reports-api";
import SettingsApi "mixins/settings-api";
import LogsApi "mixins/logs-api";

actor {
  // --- Stable state ---
  let users = Map.empty<Principal, Types.UserProfile>();
  let categories = Map.empty<Nat, Types.CourseCategory>();
  let courses = Map.empty<Nat, Types.Course>();
  let leads = Map.empty<Nat, Types.Lead>();
  let followUps = Map.empty<Nat, Types.FollowUp>();
  let students = Map.empty<Nat, Types.Student>();
  let emis = Map.empty<Nat, Types.EmiInstallment>();
  let payments = Map.empty<Nat, Types.Payment>();
  let receipts = Map.empty<Nat, Types.Receipt>();
  let reminders = Map.empty<Nat, Types.Reminder>();
  let teams = Map.empty<Nat, Types.Team>();
  let logs = Map.empty<Nat, Types.ActivityLog>();
  let settingsStore = Map.empty<Text, Types.AppSettings>();

  // Mutable counters wrapped in a record (passed by reference to mixins)
  let state : Types.AppState = {
    var nextUserId = 0;
    var nextCategoryId = 1;
    var nextCourseId = 1;
    var nextLeadId = 1;
    var nextFollowUpId = 1;
    var nextStudentId = 1;
    var nextEmiId = 1;
    var nextPaymentId = 1;
    var nextReceiptId = 1;
    var nextReminderId = 1;
    var nextTeamId = 1;
    var nextLogId = 1;
  };

  // --- Mixin composition ---
  include UsersApi(users, state);
  include CoursesApi(categories, courses, users, state);
  include LeadsApi(leads, students, courses, emis, users, logs, state);
  include FollowUpsApi(followUps, leads, users, state);
  include StudentsApi(students, courses, users, state);
  include EmiApi(emis, students, users, settingsStore, state);
  include PaymentsApi(payments, students, receipts, users, settingsStore, state);
  include ReceiptsApi(receipts, users);
  include RemindersApi(reminders, users, state);
  include TeamsApi(teams, users, state);
  include ReportsApi(leads, students, payments, emis, followUps, logs, users);
  include SettingsApi(settingsStore, users);
  include LogsApi(logs, users);
};
