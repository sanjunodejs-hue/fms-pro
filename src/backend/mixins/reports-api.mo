import Types "../types/common";
import ReportsLib "../lib/reports";
import Map "mo:core/Map";

mixin (
  leads : Map.Map<Nat, Types.Lead>,
  students : Map.Map<Nat, Types.Student>,
  payments : Map.Map<Nat, Types.Payment>,
  emis : Map.Map<Nat, Types.EmiInstallment>,
  followUps : Map.Map<Nat, Types.FollowUp>,
  logs : Map.Map<Nat, Types.ActivityLog>,
  users : Map.Map<Principal, Types.UserProfile>,
) {
  public shared query ({ caller }) func getRevenueReport(fromDate : Types.Timestamp, toDate : Types.Timestamp) : async ReportsLib.RevenueReport {
    ReportsLib.getRevenueReport(payments, students, caller, fromDate, toDate);
  };

  public shared query ({ caller }) func getLeadReport(fromDate : Types.Timestamp, toDate : Types.Timestamp) : async ReportsLib.LeadReport {
    ReportsLib.getLeadReport(leads, caller, fromDate, toDate);
  };

  public shared query ({ caller }) func getEmiReport(fromDate : Types.Timestamp, toDate : Types.Timestamp) : async ReportsLib.EmiReport {
    ReportsLib.getEmiReport(emis, caller, fromDate, toDate);
  };

  public shared query ({ caller }) func getDashboardStats() : async ReportsLib.DashboardStats {
    ReportsLib.getDashboardStats(leads, students, payments, emis, followUps, logs, caller);
  };
}
