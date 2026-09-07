import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-amber-400">404</h1>
        <h2 className="text-xl font-bold">Page Not Found</h2>
        <p className="text-sm text-zinc-400">The requested page does not exist.</p>
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-semibold transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
