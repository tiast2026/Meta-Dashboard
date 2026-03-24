"use client"

import { format, parseISO } from "date-fns"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface TaggedPost {
  account_name: string
  caption: string
  media_url: string
  permalink: string
  posted_at: string
  likes: number
  comments: number
}

interface TaggedPostsTableProps {
  posts: TaggedPost[]
}

export function TaggedPostsTable({ posts }: TaggedPostsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>タグ付き投稿</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">サムネイル</TableHead>
              <TableHead>アカウント</TableHead>
              <TableHead>投稿内容</TableHead>
              <TableHead className="text-right">いいね</TableHead>
              <TableHead className="text-right">コメント</TableHead>
              <TableHead className="text-right pr-4">日時</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((post, i) => (
              <TableRow key={`${post.permalink}-${i}`}>
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
                <TableCell className="font-medium">
                  {post.account_name}
                </TableCell>
                <TableCell className="max-w-[240px]">
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
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {post.likes.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {post.comments.toLocaleString()}
                </TableCell>
                <TableCell className="pr-4 text-right text-sm text-muted-foreground">
                  {format(parseISO(post.posted_at), "yyyy/MM/dd HH:mm")}
                </TableCell>
              </TableRow>
            ))}
            {posts.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  タグ付き投稿がありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
