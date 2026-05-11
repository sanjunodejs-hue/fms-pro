import Types "../types/common";
import ReceiptsLib "../lib/receipts";
import Map "mo:core/Map";

mixin (
  receipts : Map.Map<Nat, Types.Receipt>,
  users : Map.Map<Principal, Types.UserProfile>,
) {
  public shared query ({ caller }) func getReceipts(studentId : ?Nat) : async [Types.Receipt] {
    ReceiptsLib.getReceipts(receipts, users, caller, studentId);
  };

  public shared query ({ caller }) func getReceipt(id : Nat) : async ?Types.Receipt {
    ReceiptsLib.getReceipt(receipts, id);
  };
}
