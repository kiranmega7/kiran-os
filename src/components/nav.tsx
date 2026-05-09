"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Target, Briefcase, Heart, ListTodo, TrendingUp, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/", label: "Today", icon: LayoutDashboard },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/businesses", label: "Businesses", icon: Briefcase },
  { href: "/finance", label: "Finance", icon: TrendingUp },
  { href: "/health", label: "Health", icon: Heart },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
];

export function Nav() {
  const pathname = usePathname();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 min-h-screen bg-white border-r px-3 py-6">
        <div className="mb-8 px-3">
          <h1 className="text-xl font-bold">Kiran OS</h1>
          <p className="text-xs text-gray-400 mt-0.5">Command center</p>
        </div>
        <nav className="flex-1 space-y-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50 flex justify-around py-2">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-1 px-2 py-1 rounded-lg text-xs",
              pathname === href ? "text-gray-900 font-semibold" : "text-gray-400"
            )}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
