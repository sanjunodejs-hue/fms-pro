import Types "../types/common";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Array "mo:core/Array";

module {
  public func log(
    logs : Map.Map<Nat, Types.ActivityLog>,
    userId : Principal,
    action : Text,
    entityType : Text,
    entityId : ?Nat,
    details : Text,
    state : Types.AppState,
  ) {
    state.nextLogId += 1;
    let id = state.nextLogId;
    let entry : Types.ActivityLog = {
      id;
      userId;
      action;
      entityType;
      entityId;
      details;
      timestamp = Time.now();
    };
    logs.add(id, entry);
  };

  public func getLogs(
    logs : Map.Map<Nat, Types.ActivityLog>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    limit : ?Nat,
    offset : ?Nat,
  ) : [Types.ActivityLog] {
    let isAdmin = switch (users.get(caller)) {
      case (?(u)) { u.role == #admin };
      case null { false };
    };
    let all = logs.entries()
      |> _.map(func((_, v) : (Nat, Types.ActivityLog)) : Types.ActivityLog { v })
      |> _.filter(func(l : Types.ActivityLog) : Bool {
          if (isAdmin) { true } else { l.userId == caller }
        })
      |> _.toArray();
    let skip = switch (offset) { case (?o) { o }; case null { 0 } };
    let take = switch (limit) { case (?l) { l }; case null { all.size() } };
    all.sliceToArray(skip, skip + take);
  };
}
