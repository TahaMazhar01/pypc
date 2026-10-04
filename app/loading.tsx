export default function Loading() {
  return (
    <div className="container py-20">
      <div className="skeleton h-10 w-64 rounded-lg" />
      <div className="skeleton mt-5 h-6 max-w-xl rounded-lg" />
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <div className="skeleton h-64 rounded-2xl" />
        <div className="skeleton h-64 rounded-2xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    </div>
  )
}
