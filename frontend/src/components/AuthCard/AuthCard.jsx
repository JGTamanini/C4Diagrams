function AuthCard({ children }) {
  return (
    <div className="flex items-center justify-center px-8 py-16 md:px-16">
      <div className="w-full max-w-lg rounded-xl border border-line bg-surface/90 p-10 shadow-2xl shadow-black/50">
        {children}
      </div>
    </div>
  );
}

export default AuthCard;