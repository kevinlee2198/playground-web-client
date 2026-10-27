import { describe, it, expect } from "vitest";
import type { AnyFormApi } from "@tanstack/react-form";
import { FieldApi, FormApi } from "@tanstack/react-form";
import { setServerFieldError } from "@/lib/form-server-errors";

function setup() {
  const form = new FormApi({
    defaultValues: { measurementUnit: "METRIC", preferredSports: [] as string[] },
  });
  form.mount();
  const field = new FieldApi({ form, name: "measurementUnit", validators: {} });
  field.mount();
  return { form: form as unknown as AnyFormApi, field, typed: form };
}

describe("setServerFieldError", () => {
  it("sets an onServer error on a known field", () => {
    const { form, typed } = setup();

    expect(setServerFieldError(form, "measurementUnit", "x")).toBe(true);

    expect(typed.getFieldMeta("measurementUnit")?.errorMap.onServer).toBe("x");
    expect(typed.getFieldMeta("measurementUnit")?.isTouched).toBe(true);
  });

  it("ignores a null field", () => {
    const { form, typed } = setup();

    expect(setServerFieldError(form, null, "x")).toBe(false);

    expect(typed.getFieldMeta("measurementUnit")?.errorMap.onServer).toBeUndefined();
  });

  it("ignores a field the form does not have", () => {
    const { form, typed } = setup();

    expect(setServerFieldError(form, "bogus", "x")).toBe(false);
    expect(typed.getFieldMeta("bogus" as never)).toBeUndefined();
  });

  it("is cleared when the field value changes", () => {
    const { form, field, typed } = setup();
    setServerFieldError(form, "measurementUnit", "x");

    field.handleChange("IMPERIAL");

    expect(typed.getFieldMeta("measurementUnit")?.errorMap.onServer).toBeUndefined();
  });
});
