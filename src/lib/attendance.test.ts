import { describe, expect, it } from "vitest";
import { extractRegistrationIdFromQr, parseQrPayload } from "./attendance";

describe("extractRegistrationIdFromQr", () => {
  it("returns a plain registration id from a string payload", () => {
    expect(extractRegistrationIdFromQr("reg-123")).toBe("reg-123");
  });

  it("extracts the registration id from a JSON payload", () => {
    expect(extractRegistrationIdFromQr('{"registrationId":"reg-456","eventId":"event-1"}')).toBe("reg-456");
  });

  it("returns null for invalid payloads", () => {
    expect(extractRegistrationIdFromQr("not-a-valid-id")).toBeNull();
  });
});

describe("parseQrPayload", () => {
  it("parses registrationId and eventId from a JSON payload", () => {
    expect(parseQrPayload('{"registrationId":"reg-789","eventId":"event-2"}')).toEqual({
      registrationId: "reg-789",
      eventId: "event-2",
    });
  });
});
