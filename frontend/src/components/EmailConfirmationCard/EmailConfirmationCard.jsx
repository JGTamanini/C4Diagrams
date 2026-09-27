import Brand from '../Brand/Brand';

function EmailConfirmationCard({ message }) {
  return (
    <>
      <Brand />
      <div className="mb-6 flex h-13 w-13 items-center justify-center rounded-lg border border-success bg-success/10">
        <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h1 className="mb-2 text-2xl font-medium text-text-primary">Verifique seu e-mail</h1>
      <output className="max-w-sm text-sm leading-relaxed text-text-secondary">{message}</output>
    </>
  );
}

export default EmailConfirmationCard;