import Types "../types/common";
import Map "mo:core/Map";

module {
  let defaultSettings : Types.AppSettings = {
    companyName = "FMS";
    companyEmail = "";
    companyPhone = "";
    logoUrl = "";
    paymentBaseUrl = "https://pay.example.com";
    smtpHost = "";
    smtpPort = 587;
    smtpUser = "";
    whatsappApiKey = "";
    smsApiKey = "";
  };

  public func getSettings(
    settingsStore : Map.Map<Text, Types.AppSettings>,
  ) : Types.AppSettings {
    switch (settingsStore.get("main")) {
      case (?(s)) { s };
      case null { defaultSettings };
    };
  };

  public func updateSettings(
    settingsStore : Map.Map<Text, Types.AppSettings>,
    users : Map.Map<Principal, Types.UserProfile>,
    caller : Principal,
    settings : Types.AppSettings,
  ) : Types.Result<Types.AppSettings, Text> {
    switch (users.get(caller)) {
      case (?(u)) { if (u.role != #admin) { return #err("Unauthorized") } };
      case null { return #err("User not found") };
    };
    settingsStore.add("main", settings);
    #ok(settings);
  };
}
