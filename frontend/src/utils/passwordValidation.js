export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

export const PASSWORD_POLICY_DESCRIPTION =
  "Password must include uppercase, lowercase, number, special character (@$!%*?&) and be at least 8 characters long";

export const PASSWORD_HELPER_TEXT =
  "Password must be 8+ characters, include uppercase, lowercase, number, and special character (@$!%*?&)";

export function isStrongPassword(password) {
  return typeof password === "string" && PASSWORD_REGEX.test(password);
}
