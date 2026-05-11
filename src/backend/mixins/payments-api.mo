import Types "../types/common";
import PaymentsLib "../lib/payments";
import Map "mo:core/Map";

mixin (
  payments : Map.Map<Nat, Types.Payment>,
  students : Map.Map<Nat, Types.Student>,
  receipts : Map.Map<Nat, Types.Receipt>,
  users : Map.Map<Principal, Types.UserProfile>,
  settingsStore : Map.Map<Text, Types.AppSettings>,
  state : Types.AppState,
) {
  public shared ({ caller }) func addPayment(
    studentId : Nat,
    amount : Nat,
    method : Types.PaymentMethod,
    transactionId : ?Text,
  ) : async Types.Result<Types.Payment, Text> {
    PaymentsLib.addPayment(payments, students, users, settingsStore, caller, studentId, amount, method, transactionId, state);
  };

  public shared query ({ caller }) func getPayments(studentId : ?Nat) : async [Types.Payment] {
    PaymentsLib.getPayments(payments, users, caller, studentId);
  };

  public shared query ({ caller }) func getPayment(id : Nat) : async ?Types.Payment {
    PaymentsLib.getPayment(payments, id);
  };

  public shared ({ caller }) func confirmPayment(paymentId : Nat) : async Types.Result<Types.Payment, Text> {
    PaymentsLib.confirmPayment(payments, students, receipts, users, settingsStore, caller, paymentId, state);
  };

  public shared ({ caller }) func generatePaymentLink(studentId : Nat, amount : Nat) : async Types.Result<Text, Text> {
    PaymentsLib.generatePaymentLink(payments, students, users, settingsStore, caller, studentId, amount, state);
  };

  public shared ({ caller }) func deletePayment(id : Nat) : async Types.Result<Bool, Text> {
    PaymentsLib.deletePayment(payments, users, caller, id);
  };
}
