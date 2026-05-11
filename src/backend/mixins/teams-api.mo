import Types "../types/common";
import TeamsLib "../lib/teams";
import Map "mo:core/Map";

mixin (
  teams : Map.Map<Nat, Types.Team>,
  users : Map.Map<Principal, Types.UserProfile>,
  state : Types.AppState,
) {
  public shared ({ caller }) func addTeam(name : Text, categoryId : ?Nat, description : Text) : async Types.Result<Types.Team, Text> {
    TeamsLib.addTeam(teams, users, caller, name, categoryId, description, state);
  };

  public shared query ({ caller }) func getTeams() : async [Types.Team] {
    TeamsLib.getTeams(teams);
  };

  public shared query ({ caller }) func getTeam(id : Nat) : async ?Types.Team {
    TeamsLib.getTeam(teams, id);
  };

  public shared ({ caller }) func updateTeam(
    id : Nat,
    name : Text,
    categoryId : ?Nat,
    headId : ?Principal,
    description : Text,
  ) : async Types.Result<Types.Team, Text> {
    TeamsLib.updateTeam(teams, users, caller, id, name, categoryId, headId, description);
  };

  public shared ({ caller }) func deleteTeam(id : Nat) : async Types.Result<Bool, Text> {
    TeamsLib.deleteTeam(teams, users, caller, id);
  };

  public shared ({ caller }) func assignTeamHead(teamId : Nat, headId : Principal) : async Types.Result<Types.Team, Text> {
    TeamsLib.assignHead(teams, users, caller, teamId, headId);
  };
}
