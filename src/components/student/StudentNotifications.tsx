'use client'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiGet, apiPut, formatDateTime } from '@/lib/api'
import { StudentLayout } from './StudentLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState, CardSkeleton } from '@/components/common/States'
import { Bell, BellRing, CheckCircle2, Info, Target, Award, Clock } from 'lucide-react'
import { toast } from 'sonner'
import type { Notification } from '@/lib/types'

const TYPE_ICON: Record<string, any> = {
  INFO: Info,
  DRIVE: Target,
  ROUND: Clock,
  SELECTION: Award,
  DEADLINE: Clock,
}

const TYPE_COLOR: Record<string, string> = {
  INFO: 'text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-900/30',
  DRIVE: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30',
  ROUND: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30',
  SELECTION: 'text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-900/30',
  DEADLINE: 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/30',
}

export function StudentNotifications() {
  const user = useAppStore((s) => s.user)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    apiGet<{ notifications: Notification[] }>(`/api/notifications?studentId=${user.id}`).then((r) => setNotifications(r.notifications)).finally(() => setLoading(false))
  }, [user?.id])

  const handleMarkAllRead = async () => {
    try {
      const unread = notifications.filter(n => !n.isRead)
      for (const n of unread) {
        await apiPut('/api/notifications', { id: n.id, isRead: true })
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      toast.success('All notifications marked as read')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleClick = async (n: Notification) => {
    if (!n.isRead) {
      try {
        await apiPut('/api/notifications', { id: n.id, isRead: true })
        setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, isRead: true } : x))
      } catch {}
    }
  }

  if (loading) return <StudentLayout><div className="p-6 space-y-4">{Array.from({length:4}).map((_,i)=><CardSkeleton key={i} className="h-20" />)}</div></StudentLayout>

  const unread = notifications.filter(n => !n.isRead)
  const read = notifications.filter(n => n.isRead)

  return (
    <StudentLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-sm text-muted-foreground">{unread.length} unread notifications</p>
          </div>
          {unread.length > 0 && (
            <Button variant="outline" onClick={handleMarkAllRead}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Mark All Read
            </Button>
          )}
        </div>

        <Tabs defaultValue="unread">
          <TabsList>
            <TabsTrigger value="unread">
              Unread
              {unread.length > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {unread.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value="unread" className="space-y-3 animate-fade-in-up">
            {unread.length === 0 ? (
              <EmptyState icon={<Bell className="h-6 w-6" />} title="All caught up!" description="You have no unread notifications." />
            ) : (
              unread.map((n) => <NotificationCard key={n.id} notification={n} onClick={() => handleClick(n)} />)
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-3 animate-fade-in-up">
            {notifications.length === 0 ? (
              <EmptyState icon={<BellRing className="h-6 w-6" />} title="No notifications" description="You'll see drive updates and results here." />
            ) : (
              notifications.map((n) => <NotificationCard key={n.id} notification={n} onClick={() => handleClick(n)} />)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </StudentLayout>
  )
}

function NotificationCard({ notification: n, onClick }: { notification: Notification; onClick: () => void }) {
  const Icon = TYPE_ICON[n.type] || Info
  return (
    <Card
      onClick={onClick}
      className={`cursor-pointer transition-all hover:shadow-soft ${
        !n.isRead ? 'border-emerald-300 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-900/10' : 'border-border'
      }`}
    >
      <CardContent className="flex items-start gap-3 p-4">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TYPE_COLOR[n.type] || TYPE_COLOR.INFO}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold">{n.title}</p>
            {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500 animate-pulse-soft" />}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
          <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</p>
        </div>
      </CardContent>
    </Card>
  )
}
