import Types "../types/common";
import Map "mo:core/Map";
import Iter "mo:core/Iter";

module {
  public func addReminder(
    reminders : Map.Map<Nat, Types.Reminder>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    targetType : Types.ReminderTargetType,
    targetId : Nat,
    message : Text,
    scheduledAt : Types.Timestamp,
    state : Types.AppState,
  ) : Types.Result<Types.Reminder, Text> {
    switch (users.get(caller)) {
      case null { return #err("User not found") };
      case (?(u)) { ignore u };
    };
    state.nextReminderId += 1;
    let id = state.nextReminderId;
    let reminder : Types.Reminder = {
      id;
      targetType;
      targetId;
      recipientType = #all;
      message;
      scheduledAt;
      sentAt = null;
      status = #pending;
    };
    reminders.add(id, reminder);
    // TODO: send email via extension — subject: "Reminder Set", body: message;
    // TODO: send WhatsApp via extension — message: message at scheduledAt;
    #ok(reminder);
  };

  public func getReminders(
    reminders : Map.Map<Nat, Types.Reminder>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
  ) : [Types.Reminder] {
    let callerProfile = switch (users.get(caller)) {
      case (?(u)) { u };
      case null { return [] };
    };
    if (callerProfile.role == #admin) {
      return reminders.values() |> _.toArray();
    };
    // Non-admin: return all reminders (reminders are global notifications)
    reminders.values() |> _.toArray();
  };

  public func deleteReminder(
    reminders : Map.Map<Nat, Types.Reminder>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    id : Nat,
  ) : Types.Result<Bool, Text> {
    let callerProfile = switch (users.get(caller)) {
      case (?(u)) { u };
      case null { return #err("User not found") };
    };
    if (callerProfile.role != #admin) { return #err("Unauthorized") };
    reminders.remove(id);
    #ok(true);
  };
}
