import Types "../types/common";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Nat "mo:core/Nat";
import Int "mo:core/Int";

module {
  public func getReceipts(
    receipts : Map.Map<Nat, Types.Receipt>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    studentId : ?Nat,
  ) : [Types.Receipt] {
    switch (users.get(caller)) {
      case null { return [] };
      case (?(u)) { ignore u };
    };
    receipts.values()
      |> _.filter(func(r : Types.Receipt) : Bool {
          switch (studentId) {
            case (?(sid)) { r.studentId == sid };
            case null { true };
          };
        })
      |> _.toArray();
  };

  public func getReceipt(
    receipts : Map.Map<Nat, Types.Receipt>,
    id : Nat,
  ) : ?Types.Receipt {
    receipts.get(id);
  };

  public func generateReceipt(
    receipts : Map.Map<Nat, Types.Receipt>,
    paymentId : Nat,
    studentId : Nat,
    amount : Nat,
    generatedBy : Principal,
    now : Types.Timestamp,
    _settings : Types.AppSettings,
    state : Types.AppState,
  ) : Types.Receipt {
    state.nextReceiptId += 1;
    let id = state.nextReceiptId;
    // Receipt number format: RCP-<year>-<id>
    // Time.now() returns nanoseconds since epoch; approximate year
    let secondsSinceEpoch : Int = now / 1_000_000_000;
    let yearsSinceEpoch : Int = secondsSinceEpoch / (365 * 24 * 3600);
    let year : Nat = Int.abs(1970 + yearsSinceEpoch);
    let receiptNumber = "RCP-" # year.toText() # "-" # id.toText();
    let receipt : Types.Receipt = {
      id;
      paymentId;
      studentId;
      receiptNumber;
      amount;
      generatedAt = now;
      generatedBy;
    };
    receipts.add(id, receipt);
    // TODO: send email via extension \u2014 subject: "Payment Receipt " # receiptNumber, to: student.email, body: "Dear student, please find your payment receipt attached. Receipt No: " # receiptNumber # ", Amount: " # Nat.toText(amount);
    receipt;
  };
}
