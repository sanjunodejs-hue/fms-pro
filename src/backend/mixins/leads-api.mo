import Types "../types/common";
import LeadsLib "../lib/leads";
import LogsLib "../lib/logs";
import Map "mo:core/Map";
import Nat "mo:core/Nat";

mixin (
  leads : Map.Map<Nat, Types.Lead>,
  students : Map.Map<Nat, Types.Student>,
  courses : Map.Map<Nat, Types.Course>,
  emis : Map.Map<Nat, Types.EmiInstallment>,
  users : Map.Map<Principal, Types.UserProfile>,
  logs : Map.Map<Nat, Types.ActivityLog>,
  state : Types.AppState,
) {
  public shared ({ caller }) func addLead(
    name : Text,
    email : Text,
    phone : Text,
    courseId : Nat,
    source : Text,
    notes : Text,
  ) : async Types.Result<Types.Lead, Text> {
    let result = LeadsLib.addLead(leads, users, caller, name, email, phone, courseId, source, notes, state);
    switch (result) {
      case (#ok(l)) {
        LogsLib.log(logs, caller, "addLead", "lead", ?(l.id), "Lead added: " # name, state);
      };
      case (#err(_)) {};
    };
    result;
  };

  public shared query ({ caller }) func getLeads() : async [Types.Lead] {
    LeadsLib.getLeads(leads, users, caller);
  };

  public shared query ({ caller }) func getLead(id : Nat) : async ?Types.Lead {
    LeadsLib.getLead(leads, id);
  };

  public shared ({ caller }) func updateLead(
    id : Nat,
    name : Text,
    email : Text,
    phone : Text,
    courseId : Nat,
    source : Text,
    notes : Text,
  ) : async Types.Result<Types.Lead, Text> {
    let result = LeadsLib.updateLead(leads, users, caller, id, name, email, phone, courseId, source, notes);
    switch (result) {
      case (#ok(_)) {
        LogsLib.log(logs, caller, "updateLead", "lead", ?(id), "Lead updated", state);
      };
      case (#err(_)) {};
    };
    result;
  };

  public shared ({ caller }) func deleteLead(id : Nat) : async Types.Result<Bool, Text> {
    let result = LeadsLib.deleteLead(leads, users, caller, id);
    switch (result) {
      case (#ok(_)) {
        LogsLib.log(logs, caller, "deleteLead", "lead", ?(id), "Lead deleted", state);
      };
      case (#err(_)) {};
    };
    result;
  };

  public shared ({ caller }) func assignLead(leadId : Nat, teamId : Nat, counselorId : Principal) : async Types.Result<Types.Lead, Text> {
    let result = LeadsLib.assignLead(leads, users, caller, leadId, teamId, counselorId);
    switch (result) {
      case (#ok(_)) {
        LogsLib.log(logs, caller, "assignLead", "lead", ?(leadId), "Lead assigned to counselor: " # counselorId.toText(), state);
      };
      case (#err(_)) {};
    };
    result;
  };

  public shared ({ caller }) func transferLead(leadId : Nat, newTeamId : Nat, newCounselorId : Principal) : async Types.Result<Types.Lead, Text> {
    let result = LeadsLib.transferLead(leads, users, caller, leadId, newTeamId, newCounselorId);
    switch (result) {
      case (#ok(_)) {
        LogsLib.log(logs, caller, "transferLead", "lead", ?(leadId), "Lead transferred to team: " # newTeamId.toText(), state);
      };
      case (#err(_)) {};
    };
    result;
  };

  public shared ({ caller }) func updateLeadStatus(leadId : Nat, status : Types.LeadStatus) : async Types.Result<Types.Lead, Text> {
    let result = LeadsLib.updateLeadStatus(leads, users, caller, leadId, status);
    switch (result) {
      case (#ok(_)) {
        LogsLib.log(logs, caller, "updateLeadStatus", "lead", ?(leadId), "Lead status updated", state);
      };
      case (#err(_)) {};
    };
    result;
  };

  public shared ({ caller }) func convertLeadToStudent(leadId : Nat, paymentType : Types.PaymentType, emiMonths : ?Nat) : async Types.Result<Types.Student, Text> {
    LeadsLib.convertToStudent(leads, students, courses, emis, users, logs, caller, leadId, paymentType, emiMonths, state);
  };
}
