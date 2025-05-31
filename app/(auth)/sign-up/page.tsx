import { SignUp } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md">
        <SignUp 
          appearance={{
            elements: {
              formButtonPrimary: "bg-purple-600 hover:bg-purple-700 text-white",
              card: "bg-white shadow-lg border border-gray-100",
              headerTitle: "text-gray-900",
              headerSubtitle: "text-gray-600"
            }
          }}
        />
      </div>
    </div>
  )
}
