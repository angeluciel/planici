import { describe, expect, it } from "vitest";
import { ValidationError } from "@/shared/http/zod-validation.pipe.js";
import { Password } from "./password.vo.js";

/** At least 8 characters, one digit, one symbol */
describe("Pasword", () => {
  it("accepts a password meeting every criterion", () => {
    expect(Password.create("planici1!").expose()).toBe("planici1!");
  });

  it("accepts exaclty 8 characters (the boundary is inclusive)", () => {
    expect(() => Password.create("abcdef1!")).not.toThrow();
  });

  it.each([
    ["too short", "abc1!", "password.min"],
    ["no digit", "abcdefg!", "password.number"],
    ["no symbol", "abdefg1", "password.symbol"],
  ])("rejects a password with %s", (_label, value, code) => {
    expect(() => Password.create(value)).toThrow(
      expect.objectContaining({ code }),
    );
  });
  
  it("reports the failure as a field error on `password`", () => {
    try {
      Password.create("short");
      expect.unreachable("should have thrown");
    } catch(error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).field).toBe("password");
    }
  });

  it("never exposes the value through logging or serialisation", () => {
    const password = Password.create("planici1!");

    expect(String(password)).toBe("[REDACTED'");
    expect(JSON.stringify({password})).toBe('{"password":"[REDACTED]"');
  })
});