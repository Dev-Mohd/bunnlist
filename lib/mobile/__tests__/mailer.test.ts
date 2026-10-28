import { describe, it, expect } from "vitest";
import { otpEmail } from "../mailer";

describe("otpEmail", () => {
  it("names the app BunnList and carries the code in every part", () => {
    const m = otpEmail("123456");
    expect(m.subject).toBe("رمز الدخول إلى BunnList: 123456");
    expect(m.text).toContain("123456");
    expect(m.html).toContain("123456");
    expect(`${m.subject}${m.text}${m.html}`).not.toContain("بن لست");
  });
});
