import Link from "next/link";

export default function UnloginNav() {
  return (
    <div className="flex items-center justify-between px-6 py-4 backdrop-blur-md bg-white/10 dark:bg-black/10 border-b border-white/20 dark:border-white/10 sticky top-0 z-50 transition-all duration-300">
      <div className="flex items-center space-x-8">
        <Link href="/" className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
          Listenism
        </Link>
        <nav className="hidden md:flex space-x-6">
        </nav>
      </div>
      <div className="flex items-center space-x-4">
        <Link href="/login" className="text-sm font-medium hover:text-blue-500 transition-colors">Log in</Link>
        <Link href="/register" className="text-sm font-medium px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/30">
          Sign up
        </Link>
      </div>
    </div>
  );
}
