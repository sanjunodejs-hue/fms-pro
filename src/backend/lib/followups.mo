import Types "../types/common";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Iter "mo:core/Iter";

module {
  public func addFollowUp(
    followUps : Map.Map<Nat, Types.FollowUp>,
    leads : Map.Map<Nat, Types.Lead>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    leadId : Nat,
    notes : Text,
    nextFollowUpDate : Types.Timestamp,
    reminderDate : ?Types.Timestamp,
    state : Types.AppState,
  ) : Types.Result<Types.FollowUp, Text> {
    switch (users.get(caller)) {
      case (?(u)) { ignore u };
      case null { return #err("User not found") };
    };
    switch (leads.get(leadId)) {
      case (?(lead)) {
        // Update lead status to followUp
        let updated = { lead with status = #followUp; updatedAt = Time.now() };
        leads.add(leadId, updated);
      };
      case null { return #err("Lead not found") };
    };
    state.nextFollowUpId += 1;
    let id = state.nextFollowUpId;
    let followUp : Types.FollowUp = {
      id; leadId; notes; nextFollowUpDate; reminderDate;
      createdBy = caller;
      createdAt = Time.now();
    };
    followUps.add(id, followUp);
    // TODO: send email via extension — subject: "Follow-up Scheduled", body: "A follow-up for lead ID " # Nat.toText(leadId) # " has been scheduled for " # Int.toText(nextFollowUpDate);
    // TODO: send WhatsApp via extension — notify counselor of next follow-up date
    #ok(followUp);
  };

  public func getFollowUps(
    followUps : Map.Map<Nat, Types.FollowUp>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    leadId : ?Nat,
  ) : [Types.FollowUp] {
    let callerProfile = switch (users.get(caller)) {
      case (?(u)) { u };
      case null { return [] };
    };
    followUps.values()
      |> _.filter(func(f : Types.FollowUp) : Bool {
          let matchesLead = switch (leadId) {
            case (?(lid)) { f.leadId == lid };
            case null { true };
          };
          let hasAccess = switch (callerProfile.role) {
            case (#admin) { true };
            case (#accountant) { true };
            case _ { f.createdBy == caller };
          };
          matchesLead and hasAccess;
        })
      |> _.toArray();
  };

  public func updateFollowUp(
    followUps : Map.Map<Nat, Types.FollowUp>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    id : Nat,
    notes : Text,
    nextFollowUpDate : Types.Timestamp,
    reminderDate : ?Types.Timestamp,
  ) : Types.Result<Types.FollowUp, Text> {
    let callerProfile = switch (users.get(caller)) {
      case (?(u)) { u };
      case null { return #err("User not found") };
    };
    switch (followUps.get(id)) {
      case (?(f)) {
        if (callerProfile.role != #admin and f.createdBy != caller) {
          return #err("Unauthorized");
        };
        let updated = { f with notes; nextFollowUpDate; reminderDate };
        followUps.add(id, updated);
        #ok(updated);
      };
      case null { #err("FollowUp not found") };
    };
  };

  public func deleteFollowUp(
    followUps : Map.Map<Nat, Types.FollowUp>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    id : Nat,
  ) : Types.Result<Bool, Text> {
    let callerProfile = switch (users.get(caller)) {
      case (?(u)) { u };
      case null { return #err("User not found") };
    };
    switch (followUps.get(id)) {
      case (?(f)) {
        if (callerProfile.role != #admin and f.createdBy != caller) {
          return #err("Unauthorized");
        };
        followUps.remove(id);
        #ok(true);
      };
      case null { #err("FollowUp not found") };
    };
  };
}
