function Loading({ label = 'Loading...', size = 'md', className = '' }) {
  const sizes = { sm: 'h-6 w-6', md: 'h-10 w-10', lg: 'h-14 w-14' }

  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-8 ${className}`}>
      <div
        className={`${sizes[size] || sizes.md} border-4 border-green-200 border-t-green-600 rounded-full animate-spin`}
        role="status"
        aria-label={label}
      />
      {label && <p className="text-gray-500 text-sm text-center px-4">{label}</p>}
    </div>
  )
}

export default Loading
