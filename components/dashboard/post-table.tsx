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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
}

const productTypeVariants: Record<string, "default" | "secondary" | "outline"> = {
  FEED: "default",
  feed: "default",
  REELS: "secondary",
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
    <Card>
      <CardHeader>
        <CardTitle>投稿パフォーマンス</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">サムネイル</TableHead>
              <TableHead>投稿内容</TableHead>
              <TableHead>タイプ</TableHead>
              <TableHead className="text-right">閲覧数</TableHead>
              <TableHead className="text-right">リーチ</TableHead>
              <TableHead className="text-right">いいね</TableHead>
              <TableHead className="text-right">コメント</TableHead>
              <TableHead className="text-right">保存</TableHead>
              <TableHead className="text-right">シェア</TableHead>
              <TableHead className="text-right pr-4">ER</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPosts.map((post) => (
              <TableRow key={post.ig_post_id}>
                <TableCell className="pl-4">
                  {post.media_url ? (
                    <img
                      src={post.media_url}
                      alt=""
                      className="size-16 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex size-16 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                      N/A
                    </div>
                  )}
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <a
                    href={post.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    <p className="truncate text-sm">
                      {post.caption
                        ? post.caption.length > 30
                          ? post.caption.slice(0, 30) + "..."
                          : post.caption
                        : "-"}
                    </p>
                  </a>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {format(parseISO(post.posted_at), "yyyy/MM/dd HH:mm")}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      productTypeVariants[post.product_type] ?? "outline"
                    }
                  >
                    {productTypeLabels[post.product_type] ?? post.product_type}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {post.impressions.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {post.reach.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {post.likes.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {post.comments.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {post.saves.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {post.shares.toLocaleString()}
                </TableCell>
                <TableCell className="pr-4 text-right tabular-nums font-medium">
                  {calcER(post).toFixed(2)}%
                </TableCell>
              </TableRow>
            ))}
            {paginatedPosts.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                  投稿データがありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 pt-4">
            <p className="text-sm text-muted-foreground">
              {sortedPosts.length}件中 {page * PAGE_SIZE + 1}-
              {Math.min((page + 1) * PAGE_SIZE, sortedPosts.length)}件を表示
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="size-4" />
                前へ
              </Button>
              <span className="text-sm text-muted-foreground">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                次へ
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
