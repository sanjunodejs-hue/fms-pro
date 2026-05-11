import Types "../types/common";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Iter "mo:core/Iter";

module {
  public func setProfile(
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    name : Text,
    email : Text,
    state : Types.AppState,
  ) : Types.Result<Types.UserProfile, Text> {
    let role : Types.Role = if (users.isEmpty()) { #admin } else {
      switch (users.get(caller)) {
        case (?(existing)) { existing.role };
        case null { #counselor };
      };
    };
    let profile : Types.UserProfile = {
      id = caller;
      name;
      email;
      role;
      teamId = switch (users.get(caller)) {
        case (?(existing)) { existing.teamId };
        case null { null };
      };
      createdAt = switch (users.get(caller)) {
        case (?(existing)) { existing.createdAt };
        case null { Time.now() };
      };
    };
    users.add(caller, profile);
    #ok(profile);
  };

  public func getProfile(
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
  ) : ?Types.UserProfile {
    users.get(caller);
  };

  public func getAllUsers(
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
  ) : Types.Result<[Types.UserProfile], Text> {
    switch (users.get(caller)) {
      case (?(u)) {
        if (u.role == #admin) {
          #ok(users.values() |> _.toArray());
        } else {
          #err("Unauthorized");
        };
      };
      case null { #err("User not found") };
    };
  };

  public func updateRole(
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    userId : Principal,
    role : Types.Role,
  ) : Types.Result<Types.UserProfile, Text> {
    switch (users.get(caller)) {
      case (?(u)) {
        if (u.role != #admin) { return #err("Unauthorized") };
      };
      case null { return #err("User not found") };
    };
    switch (users.get(userId)) {
      case (?(target)) {
        let updated = { target with role };
        users.add(userId, updated);
        #ok(updated);
      };
      case null { #err("Target user not found") };
    };
  };

  public func deleteUser(
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    userId : Principal,
  ) : Types.Result<Bool, Text> {
    switch (users.get(caller)) {
      case (?(u)) {
        if (u.role != #admin) { return #err("Unauthorized") };
      };
      case null { return #err("User not found") };
    };
    users.remove(userId);
    #ok(true);
  };

  public func getRole(
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
  ) : ?Types.Role {
    switch (users.get(caller)) {
      case (?(u)) { ?(u.role) };
      case null { null };
    };
  };
}
