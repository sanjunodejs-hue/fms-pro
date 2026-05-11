import Types "../types/common";
import UsersLib "../lib/users";
import Map "mo:core/Map";

mixin (
  users : Map.Map<Principal, Types.UserProfile>,
  state : Types.AppState,
) {
  public shared ({ caller }) func setUserProfile(name : Text, email : Text) : async Types.Result<Types.UserProfile, Text> {
    UsersLib.setProfile(users, caller, name, email, state);
  };

  public shared query ({ caller }) func getUserProfile() : async ?Types.UserProfile {
    UsersLib.getProfile(users, caller);
  };

  public shared query ({ caller }) func getAllUsers() : async [Types.UserProfile] {
    switch (UsersLib.getAllUsers(users, caller)) {
      case (#ok(all)) { all };
      case (#err(_)) { [] };
    };
  };

  public shared ({ caller }) func updateUserRole(userId : Principal, role : Types.Role) : async Types.Result<Types.UserProfile, Text> {
    UsersLib.updateRole(users, caller, userId, role);
  };

  public shared ({ caller }) func deleteUser(userId : Principal) : async Types.Result<Bool, Text> {
    UsersLib.deleteUser(users, caller, userId);
  };
}
