"use client";

import { usePathname, useParams } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Heart,
  LayoutGrid,
  Tag,
  Megaphone,
  ChevronLeft,
  BarChart3,
} from "lucide-react";

const navItems = [
  { href: "", label: "アカウント概要", icon: LayoutGrid },
  { href: "/followers", label: "フォロワー分析", icon: Users },
  { href: "/engagement", label: "エンゲージメント分析", icon: Heart },
  { href: "/posts", label: "投稿一覧", icon: BarChart3 },
  { href: "/tagged", label: "タグ付け分析", icon: Tag },
  { href: "/ads", label: "Meta広告", icon: Megaphone },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const token = params.token as string;
  const basePath = `/dashboard/${token}`;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="hidden md:flex w-56 flex-col bg-[#3b5998] text-white fixed inset-y-0 left-0 z-20 overflow-y-auto">
        <div className="px-4 py-5 border-b border-white/20">
          <Link href={basePath} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold">Meta Dashboard</p>
              <p className="text-[10px] text-white/60">Analytics Platform</p>
            </div>
          </Link>
        </div>

        <div className="px-3 pt-4 pb-2">
          <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-white/50">
            Instagram分析
          </p>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map((item) => {
            const fullPath = basePath + item.href;
            const isActive =
              item.href === ""
                ? pathname === basePath
                : pathname.startsWith(fullPath);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={fullPath}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/20">
          <Link
            href="/admin"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            管理画面に戻る
          </Link>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 bg-[#3b5998] text-white">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href={basePath} className="font-bold text-sm">Meta Dashboard</Link>
        </div>
        <div className="flex overflow-x-auto px-2 pb-2 gap-1 scrollbar-hide">
          {navItems.map((item) => {
            const fullPath = basePath + item.href;
            const isActive =
              item.href === ""
                ? pathname === basePath
                : pathname.startsWith(fullPath);
            return (
              <Link
                key={item.href}
                href={fullPath}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isActive ? "bg-white/25 text-white" : "text-white/60 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main content. min-w-0 prevents flex children from overflowing
          when their content is wider than the parent (e.g. wide tables).
          We avoid overflow-x-hidden on <main> because it creates a clipping
          context that hides popovers (like the date picker dropdown). */}
      <main className="flex-1 min-w-0 md:ml-56 mt-[88px] md:mt-0 max-w-full">
        {children}
      </main>
    </div>
  );
}
