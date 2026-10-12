export function AuthField({ id, label, error, hint, required, children }: { id: string; label: string; error?: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return <div className="auth-field">
    <label htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>
    {children}
    {error ? <p id={id + '-error'} role="alert" className="auth-field-error">{error}</p> : hint ? <p id={id + '-hint'} className="auth-field-hint">{hint}</p> : null}
  </div>
}
