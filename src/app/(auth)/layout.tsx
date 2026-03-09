export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left - Form */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>

      {/* Right - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img
          src="/pexels-artjazz-4113084.jpg"
          alt="Healthcare"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-green-900/60 to-emerald-800/40" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <h2 className="text-3xl font-bold leading-tight">Empowering Doctors with AI-Driven Healthcare</h2>
          <p className="mt-3 text-green-100/80 text-base">Manage your patients, appointments, and practice from one powerful platform.</p>
        </div>
      </div>
    </div>
  )
}
