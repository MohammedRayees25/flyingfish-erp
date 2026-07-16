import type { ZodError } from "zod";

// Shared by every src/actions/*.ts Server Action to turn a failed Zod
// safeParse into the { fieldName: message } shape each form's
// form.setError(field, { message }) loop expects.
export function fieldErrorsFrom(error: ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    fieldErrors[String(issue.path[0])] = issue.message;
  }
  return fieldErrors;
}
