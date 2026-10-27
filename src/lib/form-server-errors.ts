import type { AnyFormApi } from "@tanstack/react-form";

/**
 * Shows a server-reported error on the form field it names.
 * Returns false (and does nothing) unless `field` is a form field mounted with a
 * `validators` option: form-core only clears `onServer` for such fields, so an
 * error on any other field could never be cleared.
 */
export function setServerFieldError(
  form: AnyFormApi,
  field: string | null | undefined,
  message: string,
): boolean {
  if (!field || !Object.hasOwn(form.state.values, field)) return false;
  if (!form.getFieldInfo(field)?.instance?.options.validators) return false;
  form.setFieldMeta(field, (prev) => ({
    ...prev,
    isTouched: true,
    errorMap: { ...prev?.errorMap, onServer: message },
  }));
  return true;
}
