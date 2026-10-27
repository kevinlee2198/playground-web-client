import type { AnyFormApi } from "@tanstack/react-form";

/**
 * Shows a server-reported error on the form field it names.
 * Returns false (and does nothing) when `field` is not a field of the form.
 * The `onServer` error is cleared by form-core when the field value changes.
 */
export function setServerFieldError(
  form: AnyFormApi,
  field: string | null | undefined,
  message: string,
): boolean {
  if (!field || !Object.hasOwn(form.state.values, field)) return false;
  form.setFieldMeta(field, (prev) => ({
    ...prev,
    isTouched: true,
    errorMap: { ...prev?.errorMap, onServer: message },
  }));
  return true;
}
