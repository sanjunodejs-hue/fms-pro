import Types "../types/common";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Iter "mo:core/Iter";

module {
  public func addTeam(
    teams : Map.Map<Nat, Types.Team>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    name : Text,
    categoryId : ?Nat,
    description : Text,
    state : Types.AppState,
  ) : Types.Result<Types.Team, Text> {
    switch (users.get(caller)) {
      case (?(u)) { if (u.role != #admin) { return #err("Unauthorized") } };
      case null { return #err("User not found") };
    };
    state.nextTeamId += 1;
    let id = state.nextTeamId;
    let team : Types.Team = {
      id; name; categoryId;
      headId = null;
      description;
      isActive = true;
      createdAt = Time.now();
    };
    teams.add(id, team);
    #ok(team);
  };

  public func getTeams(
    teams : Map.Map<Nat, Types.Team>,
  ) : [Types.Team] {
    teams.values() |> _.toArray();
  };

  public func getTeam(
    teams : Map.Map<Nat, Types.Team>,
    id : Nat,
  ) : ?Types.Team {
    teams.get(id);
  };

  public func updateTeam(
    teams : Map.Map<Nat, Types.Team>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    id : Nat,
    name : Text,
    categoryId : ?Nat,
    headId : ?Principal,
    description : Text,
  ) : Types.Result<Types.Team, Text> {
    switch (users.get(caller)) {
      case (?(u)) { if (u.role != #admin) { return #err("Unauthorized") } };
      case null { return #err("User not found") };
    };
    switch (teams.get(id)) {
      case (?(team)) {
        let updated = { team with name; categoryId; headId; description };
        teams.add(id, updated);
        // If head changed, update user's teamId
        switch (headId) {
          case (?(hid)) {
            switch (users.get(hid)) {
              case (?(u)) {
                users.add(hid, { u with teamId = ?(id); role = #teamHead });
              };
              case null {};
            };
          };
          case null {};
        };
        #ok(updated);
      };
      case null { #err("Team not found") };
    };
  };

  public func deleteTeam(
    teams : Map.Map<Nat, Types.Team>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    id : Nat,
  ) : Types.Result<Bool, Text> {
    switch (users.get(caller)) {
      case (?(u)) { if (u.role != #admin) { return #err("Unauthorized") } };
      case null { return #err("User not found") };
    };
    switch (teams.get(id)) {
      case (?(team)) {
        teams.add(id, { team with isActive = false });
        #ok(true);
      };
      case null { #err("Team not found") };
    };
  };

  public func assignHead(
    teams : Map.Map<Nat, Types.Team>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    teamId : Nat,
    headId : Principal,
  ) : Types.Result<Types.Team, Text> {
    switch (users.get(caller)) {
      case (?(u)) { if (u.role != #admin) { return #err("Unauthorized") } };
      case null { return #err("User not found") };
    };
    switch (teams.get(teamId)) {
      case (?(team)) {
        let updated = { team with headId = ?(headId) };
        teams.add(teamId, updated);
        // Update user role to teamHead and set teamId
        switch (users.get(headId)) {
          case (?(u)) {
            users.add(headId, { u with role = #teamHead; teamId = ?(teamId) });
          };
          case null {};
        };
        #ok(updated);
      };
      case null { #err("Team not found") };
    };
  };
}
