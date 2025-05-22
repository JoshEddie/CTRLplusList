import React, { forwardRef } from 'react';
import '../../styles/form.css';

// Form
interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
}

export function Form({ className, children, ...props }: FormProps) {
  return (
    <form className={`form ${className || ''}`} {...props}>
      {children}
    </form>
  );
}

// Form Group
interface FormGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function FormGroup({ className, children, ...props }: FormGroupProps) {
  return (
    <div className={`form-group ${className || ''}`} {...props}>
      {children}
    </div>
  );
}

// Form Label
interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
}

export function FormLabel({ className, children, ...props }: FormLabelProps) {
  return (
    <label className={`form-label ${className || ''}`} {...props}>
      {children}
    </label>
  );
}

// Form Input
type FormInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input ref={ref} className={`form-input ${className || ''}`} {...props} />
    );
  }
);
FormInput.displayName = 'FormInput';

// Form Textarea
type FormTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`form-textarea ${className || ''}`}
        {...props}
      />
    );
  }
);
FormTextarea.displayName = 'FormTextarea';

// Form Error
interface FormErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export function FormError({ className, children, ...props }: FormErrorProps) {
  return (
    <p className={`form-error ${className || ''}`} {...props}>
      {children}
    </p>
  );
}

// Form Description
interface FormDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export function FormDescription({
  className,
  children,
  ...props
}: FormDescriptionProps) {
  return (
    <p className={`form-description ${className || ''}`} {...props}>
      {children}
    </p>
  );
}
