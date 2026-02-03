import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { makeId, useAuth, useNefera } from './state'
import { Badge, Button, Card, CardBody, CardHeader, ChartLegend, Chip, Divider, DonutChart, LineSpark, MiniBar, Page, TextArea } from './ui'

function formatShort(value: string | number) {
  const d = new Date(value)
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function useFirstVisitHint(key: string) {
  const [dismissed, setDismissed] = useState(false)
  const seen = useMemo(() => {
    try {
      return !!window.localStorage.getItem(key)
    } catch {
      return true
    }
  }, [key])
  const show = !dismissed && !seen
  const dismiss = () => {
    try {
      window.localStorage.setItem(key, '1')
    } catch {
      void 0
    }
    setDismissed(true)
  }
  return { show, dismiss }
}

export function StudentReports() {
  const { state } = useNefera()
  const hasReportData = state.student.checkIns.length > 0
  const weekly = [
    { label: 'Happy', value: 9, color: 'rgb(var(--nefera-feeling-happy))' },
    { label: 'Neutral', value: 6, color: 'rgb(var(--nefera-feeling-neutral))' },
    { label: 'Flat', value: 5, color: 'rgb(var(--nefera-feeling-flat))' },
    { label: 'Worried', value: 4, color: 'rgb(var(--nefera-feeling-worried))' },
    { label: 'Sad', value: 3, color: 'rgb(var(--nefera-feeling-sad))' },
  ]
  const trend = [2.3, 2.6, 2.8, 2.4, 2.9, 3.1, 2.7, 3.0, 3.2, 3.1, 3.3, 3.5]
  const stressors = [
    { label: 'Homework', value: 12 },
    { label: 'Friends', value: 9 },
    { label: 'Sleep', value: 8 },
    { label: 'Family', value: 6 },
    { label: 'Social media', value: 5 },
  ]
  const max = Math.max(...stressors.map((s) => s.value))
  return (
    <Page emoji="📊" title="Activity reports" subtitle="A calm view of patterns — not judgement.">
      {!hasReportData ? (
        <Card className="mb-4">
          <CardHeader emoji="🌱" title="No report data yet" subtitle="Start with a quick check-in. We’ll build patterns over time." />
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm leading-6 text-[rgb(var(--nefera-muted))]">
              Once you do a few check-ins, you’ll see trends here. One minute a day is enough.
            </div>
            <Link to="/student/check-in">
              <Button>Do a check-in</Button>
            </Link>
          </CardBody>
        </Card>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0">
          <CardHeader emoji="🍩" title="Weekly feeling distribution" subtitle="Last 7 days." />
          <CardBody>
            {!hasReportData ? (
              <div className="animate-pulse space-y-4">
                <div className="h-48 rounded-2xl border border-white/70 bg-white/55" />
                <div className="h-4 w-44 rounded-full bg-black/10" />
                <div className="h-4 w-64 rounded-full bg-black/10" />
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 md:items-center">
                <div className="grid place-items-center rounded-2xl border border-white/70 bg-white/55 p-6 shadow-lg shadow-black/5">
                  <DonutChart size={176} stroke={18} segments={weekly} />
                </div>
                <div className="space-y-4">
                  <ChartLegend segments={weekly} />
                  <div className="grid gap-3">
                    {weekly.map((s) => (
                      <div key={s.label} className="space-y-2">
                        <div className="flex items-center justify-between text-sm font-semibold text-[rgb(var(--nefera-muted))]">
                          <span className="flex items-center gap-2 text-[rgb(var(--nefera-ink))]">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                            {s.label}
                          </span>
                          <span>{s.value}</span>
                        </div>
                        <MiniBar value={s.value} max={Math.max(...weekly.map((x) => x.value))} color={s.color} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
        <Card className="transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0">
          <CardHeader emoji="📈" title="Monthly feeling trends" subtitle="How your days have been trending." />
          <CardBody>
            {!hasReportData ? (
              <div className="animate-pulse space-y-4">
                <div className="h-40 w-full rounded-2xl border border-white/70 bg-white/55" />
                <div className="h-4 w-64 rounded-full bg-black/10" />
              </div>
            ) : (
              <>
                <LineSpark values={trend} width={520} height={160} className="w-full" />
                <div className="mt-4 rounded-2xl border border-white/70 bg-white/55 p-4 text-sm leading-6 text-[rgb(var(--nefera-muted))] shadow-lg shadow-black/5">
                  Higher line = more energy and ease.
                </div>
              </>
            )}
          </CardBody>
        </Card>
        <Card className="md:col-span-2 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0">
          <CardHeader emoji="🧠" title="Top stressors" subtitle="What shows up most often." />
          <CardBody className="grid gap-3 md:grid-cols-2">
            {!hasReportData ? (
              <>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-white/70 bg-white/55 p-6 shadow-lg shadow-black/5">
                    <div className="h-4 w-40 rounded-full bg-black/10" />
                    <div className="mt-3 h-2 w-full rounded-full bg-black/10" />
                  </div>
                ))}
              </>
            ) : (
              stressors.map((s) => (
                <div key={s.label} className="rounded-2xl border border-white/70 bg-white/55 p-6 shadow-lg shadow-black/5">
                  <div className="flex items-center justify-between text-base font-extrabold tracking-tight text-[rgb(var(--nefera-ink))]">
                    <span>{s.label}</span>
                    <span className="text-[rgb(var(--nefera-muted))]">{s.value}</span>
                  </div>
                  <div className="mt-3">
                    <MiniBar value={s.value} max={max} />
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </Page>
  )
}

export function StudentOpenCircle() {
  const { state, dispatch } = useNefera()
  const { user } = useAuth()
  const [body, setBody] = useState('')
  const [anon, setAnon] = useState(true)
  const [comment, setComment] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 320)
    return () => window.clearTimeout(t)
  }, [])

  const openCircleHint = useFirstVisitHint('nefera_hint_open_circle_v1')

  return (
    <Page emoji="🫶" title="Open Circle" subtitle="A friendly feed. Post anonymously or with your name.">
      {openCircleHint.show ? (
        <Card className="mb-4">
          <CardHeader emoji="💡" title="First time here?" subtitle="Try a small share. Keep it kind. Anonymous is always okay." />
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm leading-6 text-[rgb(var(--nefera-muted))]">If you’re not ready to post, you can scroll and just read.</div>
            <Button size="sm" variant="secondary" onClick={openCircleHint.dismiss}>
              Okay
            </Button>
          </CardBody>
        </Card>
      ) : null}
      <Card>
        <CardHeader emoji="💬" title="Create post" subtitle="Keep it kind. Be gentle with yourself and others." />
        <CardBody className="space-y-3">
          <TextArea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            hint="A small check-in counts. If you’re sharing something sensitive, consider talking to a trusted adult too."
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Chip selected={anon} onClick={() => setAnon(true)}>
                Anonymous
              </Chip>
              <Chip selected={!anon} onClick={() => setAnon(false)}>
                Named
              </Chip>
            </div>
            <Button
              disabled={!body.trim()}
              onClick={() => {
                dispatch({
                  type: 'student/addPost',
                  post: {
                    id: makeId('post'),
                    createdAt: new Date().toISOString(),
                    authorName: user?.name ?? 'Student',
                    anonymous: anon,
                    body: body.trim(),
                    likes: [],
                    comments: [],
                  },
                })
                setBody('')
              }}
            >
              Post
            </Button>
          </div>
        </CardBody>
      </Card>
      <div className="mt-4 grid gap-3">
        {loading ? (
          <>
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={`sk_${i}`}>
                <CardBody className="animate-pulse space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="h-4 w-40 rounded-full bg-black/10" />
                    <div className="h-6 w-20 rounded-full bg-black/10" />
                  </div>
                  <div className="h-4 w-full rounded-full bg-black/10" />
                  <div className="h-4 w-5/6 rounded-full bg-black/10" />
                  <div className="h-9 w-32 rounded-2xl bg-black/10" />
                </CardBody>
              </Card>
            ))}
          </>
        ) : null}
        {!loading && state.student.openCircle.length === 0 ? (
          <Card>
            <CardHeader emoji="🌈" title="No posts yet" subtitle="Start the circle with something small and kind." />
            <CardBody className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm leading-6 text-[rgb(var(--nefera-muted))]">
                Share a win, ask for tips, or write what you’re feeling. You can post anonymously.
              </div>
              <Button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              >
                Write the first post
              </Button>
            </CardBody>
          </Card>
        ) : null}
        {state.student.openCircle.map((p) => (
          <Card key={p.id}>
            <CardBody className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-[rgb(var(--nefera-ink))]">
                    {p.anonymous ? 'Anonymous' : p.authorName}{' '}
                    <span className="ml-2 text-xs font-semibold text-[rgb(var(--nefera-muted))]">{formatShort(p.createdAt)}</span>
                  </div>
                </div>
                <Badge>{p.anonymous ? '🫥 Anonymous' : '🙂 Named'}</Badge>
              </div>
              <div className="text-sm text-[rgb(var(--nefera-ink))] whitespace-pre-wrap">{p.body}</div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => dispatch({ type: 'student/toggleLikePost', postId: p.id, userId: user?.id ?? 'like_1' })}>
                  ❤️ {p.likes.length}
                </Button>
                <Badge>{p.comments.length} comments</Badge>
              </div>
              <Divider />
              <div className="space-y-2">
                {p.comments.map((c) => (
                  <div key={c.id} className="rounded-3xl border border-[rgb(var(--nefera-border))] bg-white p-3">
                    <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">
                      {c.authorName} • {formatShort(c.createdAt)}
                    </div>
                    <div className="mt-1 text-sm text-[rgb(var(--nefera-ink))]">{c.body}</div>
                  </div>
                ))}
                <div className="flex items-end gap-2">
                  <textarea
                    value={comment[p.id] ?? ''}
                    onChange={(e) => setComment((m) => ({ ...m, [p.id]: e.target.value }))}
                    className="min-h-11 flex-1 resize-none rounded-2xl border border-[rgb(var(--nefera-border))] bg-white px-4 py-3 text-sm outline-none ring-[rgba(98,110,255,0.22)] focus:ring-4"
                  />
                  <Button
                    size="sm"
                    disabled={!comment[p.id]?.trim()}
                    onClick={() => {
                      const text = (comment[p.id] ?? '').trim()
                      if (!text) return
                      dispatch({
                        type: 'student/addComment',
                        postId: p.id,
                        comment: { id: makeId('c'), createdAt: new Date().toISOString(), authorName: user?.name ?? 'Student', body: text },
                      })
                      setComment((m) => ({ ...m, [p.id]: '' }))
                    }}
                  >
                    Comment
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </Page>
  )
}
