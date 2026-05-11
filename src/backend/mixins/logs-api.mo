import Types "../types/common";
import LogsLib "../lib/logs";
import Map "mo:core/Map";

mixin (
  logs : Map.Map<Nat, Types.ActivityLog>,
  users : Map.Map<Principal, Types.UserProfile>,
) {
  public shared query ({ caller }) func getActivityLogs(limit : ?Nat, offset : ?Nat) : async [Types.ActivityLog] {
    LogsLib.getLogs(logs, users, caller, limit, offset);
  };
}
