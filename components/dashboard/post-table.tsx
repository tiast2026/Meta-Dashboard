"use client"

import { useState, useMemo } from "react"
import { format, parseISO } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"


interface Post {
  ig_post_id: string
  caption: string
  product_type: string
  media_type: string
  media_url: string
  permalink: string
  posted_at: string
  impressions: number
  reach: number
  interactions: number
  likes: number
  comments: number
  saves: number
  shares: number
  video_views: number
}

interface PostTableProps {
  posts: Post[]
}

const PAGE_SIZE = 20

const productTypeLabels: Record<string, string> = {
  FEED: "フィード",
  feed: "フィード",
  REELS: "リール",
  reels: "リール",
  STORY: "ストーリーズ",
  story: "ストーリーズ",
  IMAGE: "画像",
  VIDEO: "動画",
  CAROUSEL_ALBUM: "カルーセル",
}

const productTypeVariants: Record<string, "default" | "secondary" | "outline"> = {
  FEED: "default",
  feed: "default",
  REELS: "secondary",
  IMAGE: "default",
  VIDEO: "secondary",
  CAROUSEL_ALBUM: "outline",
  reels: "secondary",
  STORY: "outline",
  story: "outline",
}

export function PostTable({ posts }: PostTableProps) {
  const [page, setPage] = useState(0)

  const sortedPosts = useMemo(
    () =>
      [...posts].sort(
        (a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime()
      ),
    [posts]
  )

  const totalPages = Math.ceil(sortedPosts.length / PAGE_SIZE)
  const paginatedPosts = sortedPosts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const calcER = (post: Post) => {
    if (!post.reach || post.reach === 0) return 0
    return ((post.likes + post.comments + post.saves + post.shares) / post.reach) * 100
  }

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mb-4">投稿パフォーマンス</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-100">
              <TableHead className="pl-4 text-gray-500">サムネイル</TableHead>
              <TableHead className="text-gray-500">投稿内容</TableHead>
              <TableHead className="text-gray-500">タイプ</TableHead>
              <TableHead className="text-right text-gray-500">いいね</TableHead>
              <TableHead className="text-right text-gray-500">コメント</TableHead>
              <TableHead className="text-right text-gray-500">保存</TableHead>
              <TableHead className="text-right text-gray-500">再生数</TableHead>
              <TableHead className="text-right pr-4 text-gray-500">ER</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPosts.map((post) => (
              <TableRow key={post.ig_post_id} className="border-gray-100">
                <TableCell className="pl-4">
                  {post.media_url ? (
                    <img src={post.media_url} alt="" className="size-12 rounded-lg object-cover" />
                  ) : (
                    <div className="flex size-12 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-500">N/A</div>
                  )}
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="hover:underline text-gray-900">
                    <p className="truncate text-sm">{post.caption ? (post.caption.length > 30 ? post.caption.slice(0, 30) + "..." : post.caption) : "-"}</p>
                  </a>
                  <p className="mt-0.5 text-xs text-gray-500">{format(parseISO(post.posted_at), "yyyy/MM/dd HH:mm")}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={productTypeVariants[post.product_type || post.media_type] ?? "outline"}>
                    {productTypeLabels[post.product_type || post.media_type] ?? (post.product_type || post.media_type || "-")}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums text-gray-900">{post.likes.toLocaleString()}</TableCell>
                <TableCell className="text-right tabular-nums text-gray-900">{post.comments.toLocaleString()}</TableCell>
                <TableCell className="text-right tabular-nums text-gray-900">{post.saves.toLocaleString()}</TableCell>
                <TableCell className="text-right tabular-nums text-gray-900">{(post.video_views || 0) > 0 ? post.video_views.toLocaleString() : "-"}</TableCell>
                <TableCell className="pr-4 text-right tabular-nums font-medium text-gray-900">{calcER(post).toFixed(2)}%</TableCell>
              </TableRow>
            ))}
            {paginatedPosts.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-gray-500">投稿データがありません</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-gray-500">{sortedPosts.length}件中 {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, sortedPosts.length)}件を表示</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="border-gray-100 text-slate-300 hover:bg-gray-100">
              <ChevronLeft className="size-4" /> 前へ
            </Button>
            <span className="text-sm text-gray-500">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="border-gray-100 text-slate-300 hover:bg-gray-100">
              次へ <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
