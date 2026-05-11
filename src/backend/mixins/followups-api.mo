import Types "../types/common";
import FollowUpsLib "../lib/followups";
import Map "mo:core/Map";

mixin (
  followUps : Map.Map<Nat, Types.FollowUp>,
  leads : Map.Map<Nat, Types.Lead>,
  users : Map.Map<Principal, Types.UserProfile>,
  state : Types.AppState,
) {
  public shared ({ caller }) func addFollowUp(
    leadId : Nat,
    notes : Text,
    nextFollowUpDate : Types.Timestamp,
    reminderDate : ?Types.Timestamp,
  ) : async Types.Result<Types.FollowUp, Text> {
    FollowUpsLib.addFollowUp(followUps, leads, users, caller, leadId, notes, nextFollowUpDate, reminderDate, state);
  };

  public shared query ({ caller }) func getFollowUps(leadId : ?Nat) : async [Types.FollowUp] {
    FollowUpsLib.getFollowUps(followUps, users, caller, leadId);
  };

  public shared ({ caller }) func updateFollowUp(
    id : Nat,
    notes : Text,
    nextFollowUpDate : Types.Timestamp,
    reminderDate : ?Types.Timestamp,
  ) : async Types.Result<Types.FollowUp, Text> {
    FollowUpsLib.updateFollowUp(followUps, users, caller, id, notes, nextFollowUpDate, reminderDate);
  };

  public shared ({ caller }) func deleteFollowUp(id : Nat) : async Types.Result<Bool, Text> {
    FollowUpsLib.deleteFollowUp(followUps, users, caller, id);
  };
}
