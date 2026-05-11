import Types "../types/common";
import RemindersLib "../lib/reminders";
import LogsLib "../lib/logs";
import Map "mo:core/Map";

mixin (
  reminders : Map.Map<Nat, Types.Reminder>,
  users : Map.Map<Principal, Types.UserProfile>,
  state : Types.AppState,
) {
  public shared ({ caller }) func addReminder(
    targetType : Types.ReminderTargetType,
    targetId : Nat,
    message : Text,
    scheduledAt : Types.Timestamp,
  ) : async Types.Result<Types.Reminder, Text> {
    RemindersLib.addReminder(reminders, users, caller, targetType, targetId, message, scheduledAt, state);
  };

  public shared query ({ caller }) func getReminders() : async [Types.Reminder] {
    RemindersLib.getReminders(reminders, users, caller);
  };

  public shared ({ caller }) func deleteReminder(id : Nat) : async Types.Result<Bool, Text> {
    RemindersLib.deleteReminder(reminders, users, caller, id);
  };
}
