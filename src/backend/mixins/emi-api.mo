import Types "../types/common";
import EmiLib "../lib/emi";
import SettingsLib "../lib/settings";
import Map "mo:core/Map";

mixin (
  emis : Map.Map<Nat, Types.EmiInstallment>,
  students : Map.Map<Nat, Types.Student>,
  users : Map.Map<Principal, Types.UserProfile>,
  settingsStore : Map.Map<Text, Types.AppSettings>,
  state : Types.AppState,
) {
  public shared query ({ caller }) func getEmiInstallments(studentId : ?Nat) : async [Types.EmiInstallment] {
    EmiLib.getInstallments(emis, users, caller, studentId);
  };

  public shared ({ caller }) func markEmiPaid(installmentId : Nat, paymentId : ?Nat) : async Types.Result<Types.EmiInstallment, Text> {
    EmiLib.markPaid(emis, students, users, caller, installmentId, paymentId);
  };

  public shared ({ caller }) func sendEmiReminder(installmentId : Nat) : async Types.Result<Bool, Text> {
    let settings = SettingsLib.getSettings(settingsStore);
    EmiLib.sendReminder(emis, students, settings, caller, installmentId);
  };
}
