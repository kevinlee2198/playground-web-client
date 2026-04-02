"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AnyFieldApi } from "@tanstack/form-core";
import { CalendarIcon } from "lucide-react";
import { useFormatter } from "next-intl";
import type { ReactNode } from "react";

export function toFieldErrors(errors: ReadonlyArray<unknown>) {
  return errors.map((e) => {
    if (e && typeof e === "object" && "message" in e) {
      return { message: String((e as { message: unknown }).message) };
    }
    return { message: String(e) };
  });
}

interface FormTextFieldProps {
  field: AnyFieldApi;
  label: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  type?: string;
}

export function FormTextField({
  field,
  label,
  required,
  disabled,
  placeholder,
  type,
}: FormTextFieldProps) {
  return (
    <Field
      data-invalid={
        field.state.meta.isTouched && field.state.meta.errors.length > 0
          ? true
          : undefined
      }
    >
      <FieldLabel htmlFor={field.name}>
        {label}
        {required && <><span className="ml-1 text-destructive" aria-hidden="true">*</span><span className="sr-only"> (required)</span></>}
      </FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        type={type}
        value={field.state.value ?? ""}
        onBlur={field.handleBlur}
        onChange={(e) => {
          if (type === "number") {
            field.handleChange(
              e.target.value === "" ? undefined : Number(e.target.value),
            );
          } else {
            field.handleChange(e.target.value);
          }
        }}
        disabled={disabled}
        placeholder={placeholder}
      />
      {field.state.meta.isTouched && (
        <FieldError errors={toFieldErrors(field.state.meta.errors)} />
      )}
    </Field>
  );
}

interface FormTextareaFieldProps {
  field: AnyFieldApi;
  label: string;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
  footer?: ReactNode;
}

export function FormTextareaField({
  field,
  label,
  disabled,
  placeholder,
  rows,
  footer,
}: FormTextareaFieldProps) {
  return (
    <Field
      data-invalid={
        field.state.meta.isTouched && field.state.meta.errors.length > 0
          ? true
          : undefined
      }
    >
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Textarea
        id={field.name}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        rows={rows}
      />
      {footer}
      {field.state.meta.isTouched && (
        <FieldError errors={toFieldErrors(field.state.meta.errors)} />
      )}
    </Field>
  );
}

interface FormSelectFieldProps {
  field: AnyFieldApi;
  label: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  options: { value: string; label: string }[];
}

export function FormSelectField({
  field,
  label,
  required,
  disabled,
  placeholder,
  options,
}: FormSelectFieldProps) {
  return (
    <Field
      data-invalid={
        field.state.meta.isTouched && field.state.meta.errors.length > 0
          ? true
          : undefined
      }
    >
      <FieldLabel htmlFor={field.name}>
        {label}
        {required && <><span className="ml-1 text-destructive" aria-hidden="true">*</span><span className="sr-only"> (required)</span></>}
      </FieldLabel>
      <Select
        value={field.state.value ?? null}
        onValueChange={(val) => {
          field.handleChange(val);
          field.handleBlur();
        }}
        disabled={disabled}
        items={options}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {field.state.meta.isTouched && (
        <FieldError errors={toFieldErrors(field.state.meta.errors)} />
      )}
    </Field>
  );
}

interface FormComboboxFieldProps {
  field: AnyFieldApi;
  label: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  options: { value: string; label: string }[];
  emptyMessage?: string;
}

export function FormComboboxField({
  field,
  label,
  required,
  disabled,
  placeholder,
  options,
  emptyMessage = "No results found.",
}: FormComboboxFieldProps) {
  const selectedOption =
    options.find((opt) => opt.value === field.state.value) ?? null;

  return (
    <Field
      data-invalid={
        field.state.meta.isTouched && field.state.meta.errors.length > 0
          ? true
          : undefined
      }
    >
      <FieldLabel htmlFor={field.name}>
        {label}
        {required && <><span className="ml-1 text-destructive" aria-hidden="true">*</span><span className="sr-only"> (required)</span></>}
      </FieldLabel>
      <Combobox
        value={selectedOption}
        onValueChange={(val) => {
          field.handleChange(val?.value ?? null);
          field.handleBlur();
        }}
        disabled={disabled}
        items={options}
      >
        <ComboboxInput placeholder={placeholder} showClear showTrigger />
        <ComboboxContent>
          <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
          <ComboboxList>
            {options.map((opt) => (
              <ComboboxItem key={opt.value} value={opt}>
                {opt.label}
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {field.state.meta.isTouched && (
        <FieldError errors={toFieldErrors(field.state.meta.errors)} />
      )}
    </Field>
  );
}

interface FormSwitchFieldProps {
  field: AnyFieldApi;
  label: string;
  description?: string;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}

export function FormSwitchField({
  field,
  label,
  description,
  disabled,
  onChange,
}: FormSwitchFieldProps) {
  const descriptionId = description ? `${field.name}-description` : undefined;
  return (
    <Field orientation="horizontal">
      <Switch
        id={field.name}
        checked={field.state.value ?? false}
        onCheckedChange={(checked) => {
          field.handleChange(checked);
          onChange?.(checked);
        }}
        disabled={disabled}
        aria-describedby={descriptionId}
      />
      <div>
        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
        {description && (
          <FieldDescription id={descriptionId}>
            {description}
          </FieldDescription>
        )}
      </div>
    </Field>
  );
}

interface FormDateTimeFieldProps {
  field: AnyFieldApi;
  label: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function FormDateTimeField({
  field,
  label,
  required,
  disabled,
  placeholder,
}: FormDateTimeFieldProps) {
  const format = useFormatter();
  const value: Date | undefined = field.state.value;

  const timeValue = value
    ? `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`
    : "";

  return (
    <Field
      data-invalid={
        field.state.meta.isTouched && field.state.meta.errors.length > 0
          ? true
          : undefined
      }
    >
      <FieldLabel htmlFor={field.name}>
        {label}
        {required && <><span className="ml-1 text-destructive" aria-hidden="true">*</span><span className="sr-only"> (required)</span></>}
      </FieldLabel>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-full justify-start text-left font-normal",
                !value && "text-muted-foreground",
              )}
            />
          }
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value
            ? format.dateTime(value, {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : placeholder}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => {
              if (!date) return;
              const current = value ?? new Date();
              date.setHours(current.getHours(), current.getMinutes());
              field.handleChange(date);
            }}
            disabled={disabled}
          />
          <div className="border-t p-3">
            <Input
              type="time"
              disabled={disabled}
              value={timeValue}
              onChange={(e) => {
                const [hours, minutes] = e.target.value.split(":").map(Number);
                const updated = new Date(value ?? new Date());
                updated.setHours(hours, minutes);
                field.handleChange(updated);
              }}
            />
          </div>
        </PopoverContent>
      </Popover>
      {field.state.meta.isTouched && (
        <FieldError errors={toFieldErrors(field.state.meta.errors)} />
      )}
    </Field>
  );
}
