import React, { Suspense, useEffect, useMemo, useState } from 'react'
import {
  loginWithSupabase,
  resolveLoginIdentifier,
  submitCheckin,
  syncSupabaseUser,
  getStudentInbox,
  getStudentJournals,
  submitIncidentReport,
  getPrincipalDashboard,
  getPrincipalReports,
  sendPrincipalBroadcast,
  getCounselorDashboard,
  getCounselorClasses,
  getCounselorStudents,
  getCounselorRiskyStudents,
  getTeacherDashboard,
  getTeacherStudents,
  getParentDashboard,
} from "../api";
import { supabase } from "../lib/supabase";
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { type Feeling, type Role, feelingEmoji, feelingLabel, getTodayISO, makeId, useAuth, useNefera } from './state'
import logo from '@/assets/nefera-logo.png'
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  ChartLegend,
  ChartCard,
  ChecklistGroup,
  Divider,
  DonutChart,
  IconButton,
  Input,
  LineSpark,
  FeelingButton,
  MiniBar,
  Modal,
  Page,
  ProgressBar,
  Section,
  Select,
  Segmented,
  StatPill,
  StepperHeader,
  Stars,
  Tabs,
  TextArea,
  TileCard,
  Toast,
  cx,
  useCountdown,
} from './ui'

const APP_NAME = 'Nefera'
const TAGLINE = 'Smart care for aspiring mind'

const feelingPalette = {
  happy: { color: 'rgb(var(--nefera-feeling-happy))', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.22)', ring: 'rgba(34,197,94,0.14)' },
  neutral: { color: 'rgb(var(--nefera-feeling-neutral))', bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.20)', ring: 'rgba(59,130,246,0.12)' },
  flat: { color: 'rgb(var(--nefera-feeling-flat))', bg: 'rgba(156,163,175,0.10)', border: 'rgba(156,163,175,0.22)', ring: 'rgba(156,163,175,0.12)' },
  worried: { color: 'rgb(var(--nefera-feeling-worried))', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.22)', ring: 'rgba(245,158,11,0.12)' },
  sad: { color: 'rgb(var(--nefera-feeling-sad))', bg: 'rgba(244,63,94,0.12)', border: 'rgba(244,63,94,0.22)', ring: 'rgba(244,63,94,0.12)' },
} satisfies Record<Feeling, { color: string; bg: string; border: string; ring: string }>

const roles: Array<{ role: Role; label: string; emoji: string; blurb: string }> = [
  { role: 'student', label: 'Student', emoji: '🎒', blurb: 'Daily check-ins, journals, habits, and support.' },
  { role: 'teacher', label: 'Teacher', emoji: '🧑‍🏫', blurb: 'Class feeling overview, broadcasts, and observations.' },
  { role: 'parent', label: 'Parent', emoji: '👪', blurb: 'Child wellbeing overview and gentle check-ins.' },
  { role: 'counselor', label: 'Counselor', emoji: '🧠', blurb: 'Flagged students, questionnaires, and crisis actions.' },
  { role: 'principal', label: 'Principal', emoji: '🏫', blurb: 'School-wide insights and reports.' },
]

type NavItem = { to: string; label: string; emoji: string }

function navForRole(role: Role): NavItem[] {
  switch (role) {
    case 'student':
      return [
        { to: '/student/dashboard', label: 'Home', emoji: '🏡' },
        { to: '/student/check-in', label: 'Check-in', emoji: '💛' },
        { to: '/student/journal/write', label: 'Journal', emoji: '📝' },
        { to: '/student/inbox', label: 'Inbox', emoji: '💬' },
        { to: '/student/profile', label: 'Profile', emoji: '🙋' },
      ]
    case 'teacher':
      return [
        { to: '/teacher/dashboard', label: 'Home', emoji: '🏡' },
        { to: '/teacher/broadcast', label: 'Broadcast', emoji: '📣' },
        { to: '/teacher/students', label: 'Students', emoji: '🧑‍🎓' },
        { to: '/teacher/profile', label: 'Profile', emoji: '🙋' },
      ]
    case 'parent':
      return [
        { to: '/parent/dashboard', label: 'Home', emoji: '🏡' },
        { to: '/parent/message', label: 'Message', emoji: '💌' },
        { to: '/parent/checklist', label: 'Checklist', emoji: '✅' },
        { to: '/parent/profile', label: 'Profile', emoji: '🙋' },
      ]
    case 'counselor':
      return [
        { to: '/counselor/dashboard', label: 'Home', emoji: '🏡' },
        { to: '/counselor/flags', label: 'Flags', emoji: '🚩' },
        { to: '/counselor/broadcast', label: 'Broadcast', emoji: '📣' },
        { to: '/counselor/profile', label: 'Profile', emoji: '🙋' },
      ]
    case 'principal':
      return [
        { to: '/principal/dashboard', label: 'Home', emoji: '🏡' },
        { to: '/principal/reports', label: 'Reports', emoji: '🧾' },
        { to: '/principal/broadcast', label: 'Broadcast', emoji: '📣' },
        { to: '/principal/profile', label: 'Profile', emoji: '🙋' },
      ]
  }
}

function roleHome(role: Role) {
  return `/${role}/dashboard`
}

function isActivePath(pathname: string, target: string) {
  if (pathname === target) return true
  return pathname.startsWith(target + '/')
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

function AppShell() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const nav = navForRole(user?.role ?? 'student')
  const active = nav.find((n) => isActivePath(location.pathname, n.to))?.to

  useEffect(() => {
    document.documentElement.dataset.role = user?.role ?? 'guest'
  }, [user?.role])

  return (
    <div className="min-h-screen">
      <div className="hidden md:flex">
        <aside className="fixed left-0 top-0 h-screen w-72 border-r border-white/60 bg-[radial-gradient(900px_520px_at_20%_0%,rgba(98,110,255,0.14),transparent_55%),radial-gradient(900px_520px_at_80%_30%,rgba(62,197,200,0.12),transparent_55%),rgba(255,255,255,0.70)] backdrop-blur">
          <div className="px-6 pt-6">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Nefera Logo" className="h-12 w-auto object-contain" />
              <div className="min-w-0">
                <div className="truncate text-lg font-extrabold tracking-tight text-[rgb(var(--nefera-ink))]">{APP_NAME}</div>
                <div className="mt-0.5 truncate text-xs font-semibold text-[rgb(var(--nefera-muted))]">{TAGLINE}</div>
              </div>
            </div>
          </div>
          <div className="mt-6 px-4">
            <div className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-lg shadow-black/5">
              <div className="flex items-center gap-3">
                <Avatar name={user?.name ?? 'Guest'} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-extrabold text-[rgb(var(--nefera-ink))]">{user?.name ?? 'Guest'}</div>
                  <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">{user?.role.toUpperCase()}</div>
                </div>
                <IconButton label="Logout" onClick={logout} className="ml-auto">
                  <span className="text-lg">🚪</span>
                </IconButton>
              </div>
            </div>
          </div>
          <nav className="mt-4 px-3">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cx(
                  'mt-1 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-lg shadow-transparent transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-black/5 active:translate-y-0 active:scale-[0.99]',
                  active === item.to
                    ? 'border-white/70 bg-white/75 text-[rgb(var(--nefera-ink))]'
                    : 'border-transparent text-[rgb(var(--nefera-muted))] hover:border-white/60 hover:bg-white/55',
                )}
              >
                <span className="text-lg">{item.emoji}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>
        <main className="ml-72 w-full">
          <Outlet />
        </main>
      </div>

      <div className="md:hidden">
        <div className="sticky top-0 z-30 border-b border-white/60 bg-[rgba(255,255,255,0.74)] px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <img src={logo} alt="Nefera Logo" className="h-10 w-auto object-contain" />
              <div className="min-w-0">
                <div className="truncate text-base font-extrabold text-[rgb(var(--nefera-ink))]">{APP_NAME}</div>
                <div className="truncate text-xs font-semibold text-[rgb(var(--nefera-muted))]">{user?.role.toUpperCase()}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={roleHome(user?.role ?? 'student')}
                className="grid h-10 w-10 place-items-center rounded-2xl border border-white/70 bg-white/70 shadow-lg shadow-black/5"
              >
                🏡
              </Link>
              <IconButton label="Logout" onClick={logout}>
                <span className="text-lg">🚪</span>
              </IconButton>
            </div>
          </div>
        </div>
        <main className="pb-24">
          <Outlet />
        </main>
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/60 bg-[rgba(255,255,255,0.82)] px-2 py-2 backdrop-blur">
          <div className="mx-auto grid max-w-xl grid-cols-4 gap-2">
            {nav.slice(0, 4).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cx(
                  'flex flex-col items-center justify-center rounded-2xl border px-2 py-2 text-xs font-semibold transition-all duration-200 ease-out active:translate-y-px',
                  active === item.to
                    ? 'border-white/70 bg-white/75 text-[rgb(var(--nefera-ink))] shadow-lg shadow-black/5'
                    : 'border-transparent text-[rgb(var(--nefera-muted))] hover:border-white/60 hover:bg-white/55',
                )}
              >
                <div className="text-lg leading-none">{item.emoji}</div>
                <div className="mt-1">{item.label}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function RequireAuth({ children, role }: { children: React.ReactNode; role?: Role }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to={`/welcome?from=${encodeURIComponent(location.pathname)}`} replace />
  if (role && user.role !== role) return <Navigate to={roleHome(user.role)} replace />
  return <>{children}</>
}

function WelcomePage() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-16">
        <div className="mb-10 flex justify-center">
          <img src={logo} alt="Nefera Logo" className="h-24 w-auto object-contain" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/55 px-3 py-1 text-xs font-semibold text-[rgb(var(--nefera-ink))] shadow-lg shadow-black/5">
              <img src={logo} alt="Nefera Logo" className="h-5 w-auto object-contain" />
              <span>Calm, supportive, school-ready</span>
            </div>
            <div className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight text-[rgb(var(--nefera-ink))] md:text-5xl">
              {APP_NAME}
            </div>
            <div className="mt-3 text-lg font-semibold text-[rgb(var(--nefera-muted))]">{TAGLINE}</div>
            <div className="mt-5 max-w-xl text-sm leading-6 text-[rgb(var(--nefera-muted))]">
              A multi-role mental wellbeing platform for real school life: quick check-ins, gentle journaling, clear insights, and safer support.
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-2">
              <Link to="/role">
                <Button>Get started</Button>
              </Link>
              <Link to="/role">
                <Button variant="ghost">Explore roles</Button>
              </Link>
            </div>
          </div>
          <Card className="overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-extrabold text-[rgb(var(--nefera-ink))]">Today’s overview</div>
                  <div className="mt-1 text-xs text-[rgb(var(--nefera-muted))]">A calm snapshot of what matters today.</div>
                </div>
                <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/70 bg-white/70 text-2xl shadow-lg shadow-black/5">
                  🌊
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Card className="border-[rgba(98,110,255,0.18)]">
                  <CardBody className="space-y-2">
                      <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">Weekly feeling distribution</div>
                    <div className="flex items-center gap-4">
                      {(() => {
                        const segments = [
                          { label: 'Happy', value: 28, color: 'rgb(var(--nefera-feeling-happy))' },
                          { label: 'Neutral', value: 22, color: 'rgb(var(--nefera-feeling-neutral))' },
                          { label: 'Flat', value: 14, color: 'rgb(var(--nefera-feeling-flat))' },
                          { label: 'Worried', value: 16, color: 'rgb(var(--nefera-feeling-worried))' },
                          { label: 'Sad', value: 10, color: 'rgb(var(--nefera-feeling-sad))' },
                        ]
                        return (
                          <>
                            <DonutChart size={92} stroke={12} segments={segments} />
                            <div className="space-y-1.5 text-xs font-semibold text-[rgb(var(--nefera-muted))]">
                              {segments.slice(0, 3).map((s) => (
                                <div key={s.label} className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                                  <span>{s.label}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </CardBody>
                </Card>
                <Card className="border-[rgba(62,197,200,0.18)]">
                  <CardBody className="space-y-2">
                    <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">Monthly trend</div>
                    <LineSpark values={[2, 3, 3.2, 2.9, 3.3, 3.7, 3.4, 3.9, 3.6, 3.8]} width={240} height={86} />
                  </CardBody>
                </Card>
              </div>
              <Divider className="my-5" />
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-[rgb(var(--nefera-muted))]">Pick a role, then explore dashboards and flows.</div>
                <Link to="/role">
                  <Button size="sm">Choose role</Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function RoleSelectPage() {
  const { selectedRole, selectRole, user } = useAuth()
  if (user) return <Navigate to={roleHome(user.role)} replace />
  return (
    <Page>
      <div className="mb-8 text-center">
        <img src={logo} alt="Nefera Logo" className="mx-auto h-24 w-auto object-contain" />
        <div className="mt-4 text-3xl font-extrabold tracking-tight text-[rgb(var(--nefera-ink))] md:text-4xl">Choose your role</div>
        <div className="mt-2 text-sm font-semibold text-[rgb(var(--nefera-muted))]">{APP_NAME} adapts the experience for each role.</div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {roles.map((r) => (
          <button
            key={r.role}
            type="button"
            onClick={() => selectRole(r.role)}
            className={cx(
              'rounded-2xl border bg-white/55 p-6 text-left shadow-lg shadow-black/5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-xl active:translate-y-0 active:scale-[0.99]',
              selectedRole === r.role ? 'border-white/70 ring-4 ring-[rgba(98,110,255,0.14)]' : 'border-white/70',
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-base font-extrabold text-[rgb(var(--nefera-ink))]">
                  <span className="text-xl">{r.emoji}</span>
                  <span>{r.label}</span>
                </div>
                <div className="mt-2 text-sm leading-6 text-[rgb(var(--nefera-muted))]">{r.blurb}</div>
              </div>
              {selectedRole === r.role ? <Badge tone="ok">Selected</Badge> : <Badge>Tap</Badge>}
            </div>
          </button>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link to="/login">
          <Button disabled={!selectedRole}>Continue</Button>
        </Link>
        <Link to="/welcome">
          <Button variant="ghost">Back</Button>
        </Link>
      </div>
    </Page>
  )
}

function LoginPage() {
  const { selectedRole, login, user, selectRole } = useAuth();
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const navigate = useNavigate();
  const [search] = useSearchParams();

  if (user) return <Navigate to={roleHome(user.role)} replace />;

  return (
    <Page>
      <div className="mb-8 text-center">
        <img src={logo} alt="Nefera Logo" className="mx-auto h-24 w-auto object-contain" />
        <div className="mt-4 text-3xl font-extrabold tracking-tight text-[rgb(var(--nefera-ink))] md:text-4xl">
          Login
        </div>
        <div className="mt-2 text-sm font-semibold text-[rgb(var(--nefera-muted))]">
          Sign in to continue.
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader
            title="Sign in"
            subtitle={selectedRole ? `Role: ${selectedRole.toUpperCase()}` : "Pick a role to continue."}
            right={
              <Link to="/role" className="text-sm font-semibold text-[rgb(var(--nefera-brand))]">
                Change
              </Link>
            }
          />

          <CardBody className="space-y-3">
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="School ID / Email" value={id} onChange={(e) => setId(e.target.value)} />
            <Input label="Password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />

            <div className="pt-2">
              <Button
                className="w-full"
                disabled={!selectedRole}
                onClick={async () => {
                  try {
                    const identifier = id.trim()
                    if (!identifier) {
                      alert("Please enter School ID or Email")
                      return
                    }
                    const email =
                      identifier.includes("@")
                        ? identifier
                        : (await resolveLoginIdentifier(identifier))?.email

                    if (!email) {
                      alert("Invalid School ID / Email")
                      return
                    }

                    // 1) Supabase login
                    await loginWithSupabase(email, pw);

                    // 2) Backend handshake (JWT verify + local profile + role)
                    const backendUser = await syncSupabaseUser();
                    const backendRole =
                      typeof backendUser?.role === "string"
                        ? backendUser.role.toLowerCase()
                        : undefined;
                    const isRole =
                      backendRole === "student" ||
                      backendRole === "teacher" ||
                      backendRole === "parent" ||
                      backendRole === "counselor" ||
                      backendRole === "principal";

                    const finalRole = isRole
                      ? (backendRole as Role)
                      : selectedRole ?? "student";

                    if (selectedRole && isRole && backendRole !== selectedRole) {
                      await supabase.auth.signOut();
                      localStorage.removeItem("token");
                      alert(
                        "This login is not for the selected role. Please use the correct portal."
                      );
                      return;
                    }

                    if (!selectedRole && isRole) {
                      selectRole(finalRole);
                    }

                    const roleName = finalRole[0].toUpperCase() + finalRole.slice(1);
                    const displayName = name || backendUser?.name || roleName;
                    login(displayName, finalRole);

                    const from = search.get("from");
                    navigate(from || roleHome(finalRole), { replace: true });
                  } catch (e) {
                    alert("Login failed");
                  }
                }}
              >
                Continue
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="What you can do"
            subtitle="Core tools for students, families, and staff."
          />

          <CardBody className="space-y-3 text-sm text-[rgb(var(--nefera-muted))]">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-black/5 text-lg">🧠</div>
              <div>
                <div className="font-extrabold text-[rgb(var(--nefera-ink))]">
                  Daily check-ins
                </div>
                <div>Age-based questionnaires with gentle guidance.</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-black/5 text-lg">📊</div>
              <div>
                <div className="font-extrabold text-[rgb(var(--nefera-ink))]">
                  Charts & patterns
                </div>
                <div>Weekly distribution, trends, and top stressors.</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-black/5 text-lg">🫶</div>
              <div>
                <div className="font-extrabold text-[rgb(var(--nefera-ink))]">
                  Support workflows
                </div>
                <div>Broadcasts, inbox messages, and safety reporting.</div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}

function RoleEntry() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/welcome" replace />
  return <Navigate to={roleHome(user.role)} replace />
}

function StudentDashboard() {
  const { user } = useAuth()
  const { state } = useNefera()
  const [journals, setJournals] = useState<any[]>([])
  const feelingHint = useFirstVisitHint('nefera_hint_feeling_checkin_v1')

  useEffect(() => {
    getStudentJournals(30)
      .then(setJournals)
      .catch(console.error)
  }, [])

  const journalDates = useMemo(() => {
    return journals.map((j) => new Date(j.date).toISOString().slice(0, 10))
  }, [journals])

  const dayStreak = streakFromISODateList(journalDates)
  const journalStreak = dayStreak
  const totalActiveDays = useMemo(() => new Set(journalDates).size, [journalDates])

  const { segments, topStressors } = useMemo(() => {
    const counts: Record<string, number> = {
      HAPPY: 0,
      NEUTRAL: 0,
      FLAT: 0,
      WORRIED: 0,
      SAD: 0,
    }

    const stressorCounts: Record<string, number> = {}
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)

    for (const j of journals) {
      const date = new Date(j.date)
      if (date < cutoff) continue
      const mood = String(j.mood || "").toUpperCase()
      if (mood in counts) counts[mood] += 1
      const triggers = j.triggers
      if (Array.isArray(triggers)) {
        for (const t of triggers) {
          const key = String(t)
          stressorCounts[key] = (stressorCounts[key] || 0) + 1
        }
      }
    }

    const seg = [
      { label: 'Happy', value: counts.HAPPY, color: 'rgb(var(--nefera-feeling-happy))' },
      { label: 'Neutral', value: counts.NEUTRAL, color: 'rgb(var(--nefera-feeling-neutral))' },
      { label: 'Flat', value: counts.FLAT, color: 'rgb(var(--nefera-feeling-flat))' },
      { label: 'Worried', value: counts.WORRIED, color: 'rgb(var(--nefera-feeling-worried))' },
      { label: 'Sad', value: counts.SAD, color: 'rgb(var(--nefera-feeling-sad))' },
    ]

    const top = Object.entries(stressorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => ({ k, v }))

    return { segments: seg, topStressors: top }
  }, [journals])
  return (
    <Page title={`Hi ${user?.name ?? 'there'}`} subtitle="Start with a one-minute check-in.">
      <Card className="mb-4">
        <CardBody className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link to="/student/profile">
              <Avatar name={user?.name ?? 'Guest'} />
            </Link>
            <div className="min-w-0">
              <div className="truncate text-sm font-extrabold text-[rgb(var(--nefera-ink))]">{user?.name ?? 'Guest'}</div>
              <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">Student</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-white/70 bg-white/70 p-3 text-center shadow-lg shadow-black/5">
              <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">Day streak</div>
              <div className="mt-1 text-lg font-extrabold text-[rgb(var(--nefera-ink))]">{dayStreak}</div>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/70 p-3 text-center shadow-lg shadow-black/5">
              <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">Active days</div>
              <div className="mt-1 text-lg font-extrabold text-[rgb(var(--nefera-ink))]">{totalActiveDays}</div>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/70 p-3 text-center shadow-lg shadow-black/5">
              <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">Journal streak</div>
              <div className="mt-1 text-lg font-extrabold text-[rgb(var(--nefera-ink))]">{journalStreak}</div>
            </div>
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardBody className="space-y-4">
          {feelingHint.show ? (
            <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/70 bg-white/70 p-4 shadow-lg shadow-black/5">
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-[rgb(var(--nefera-ink))]">Tip</div>
                <div className="mt-1 text-sm leading-6 text-[rgb(var(--nefera-muted))]">
                  Tap a face to start. There’s no “right” answer — we’re just noticing patterns.
                </div>
              </div>
              <button type="button" onClick={feelingHint.dismiss} className="shrink-0 text-sm font-semibold text-[rgb(var(--nefera-muted))]">
                Got it
              </button>
            </div>
          ) : null}
          <Section title="Daily check-in" subtitle="How are you feeling today?" />
          <div className="grid grid-cols-5 gap-3">
            {(['happy', 'neutral', 'flat', 'worried', 'sad'] as Feeling[]).map((f) => (
              <div key={f} className="text-center">
                <FeelingButton
                  to={`/student/check-in/${f}`}
                  emoji={feelingEmoji(f)}
                  label={feelingLabel(f)}
                  color={feelingPalette[f].color}
                  background={feelingPalette[f].bg}
                  borderColor={feelingPalette[f].border}
                  ringColor={feelingPalette[f].ring}
                  className="mx-auto h-16 w-16"
                />
                <div className="mt-3 text-xs font-extrabold tracking-tight text-[rgb(var(--nefera-ink))]">{feelingLabel(f)}</div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Card>
          <CardBody className="space-y-4">
            <Section title="Your space" subtitle="Gentle tools designed for real school days." />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { to: '/student/journal/write', title: 'Journal', icon: '📝', desc: 'Write it out, softly.' },
                { to: '/student/reports', title: 'Reports', icon: '📊', desc: 'Patterns over time.' },
                { to: '/student/habits', title: 'Habits', icon: '🔥', desc: 'Tiny routines, big wins.' },
                { to: '/student/soul-space', title: 'Soul Space', icon: '🌿', desc: 'Calm tools on demand.' },
                { to: '/student/open-circle', title: 'Open Circle', icon: '🌍', desc: 'A kind community feed.' },
                { to: '/student/report-incident', title: 'Report', icon: '🛡️', desc: 'Speak up safely.' },
              ].map((x) => (
                <TileCard key={x.to} to={x.to} icon={x.icon} title={x.title} description={x.desc} />
              ))}
            </div>
          </CardBody>
        </Card>
        <div className="grid gap-4">
          <>
            <ChartCard title="Weekly feeling distribution" subtitle="Last 7 days">
              <div className="grid place-items-center rounded-2xl border border-white/70 bg-white/55 p-6 shadow-lg shadow-black/5">
                <DonutChart size={168} stroke={18} segments={segments} />
              </div>
              <ChartLegend segments={segments} />
            </ChartCard>
            <ChartCard title="Top stressors" subtitle="This week">
              <div className="space-y-3">
                {topStressors.length ? (
                  topStressors.map((x) => (
                    <div key={x.k} className="space-y-2">
                      <div className="flex items-center justify-between text-sm font-semibold text-[rgb(var(--nefera-muted))]">
                        <span className="text-[rgb(var(--nefera-ink))]">{x.k}</span>
                        <span>{x.v}</span>
                      </div>
                      <MiniBar value={x.v} max={Math.max(3, topStressors[0]?.v ?? 1)} />
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/70 bg-white/60 p-4 text-sm text-[rgb(var(--nefera-muted))]">
                    No stressors logged yet.
                  </div>
                )}
              </div>
            </ChartCard>
          </>
        </div>
      </div>
    </Page>
  )
}

function StudentCheckInEntry() {
  return (
    <Page emoji="💛" title="Daily check-in" subtitle="How are you feeling today?">
      <Card>
        <CardBody className="space-y-4">
          <Section title="Pick a feeling" subtitle="There’s no right answer — just be honest." />
          <div className="grid grid-cols-5 gap-3">
            {(['happy', 'neutral', 'flat', 'worried', 'sad'] as Feeling[]).map((f) => (
              <div key={f} className="text-center">
                <FeelingButton
                  to={`/student/check-in/${f}`}
                  emoji={feelingEmoji(f)}
                  label={feelingLabel(f)}
                  color={feelingPalette[f].color}
                  background={feelingPalette[f].bg}
                  borderColor={feelingPalette[f].border}
                  ringColor={feelingPalette[f].ring}
                  className="mx-auto h-16 w-16"
                />
                <div className="mt-3 text-xs font-extrabold tracking-tight text-[rgb(var(--nefera-ink))]">{feelingLabel(f)}</div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </Page>
  )
}

function StudentCheckInFlow() {
  const { state, dispatch } = useNefera()
  const params = useParams()
  const navigate = useNavigate()
  const feeling = (params.feeling as Feeling | undefined) ?? 'neutral'
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [journalPrompt, setJournalPrompt] = useState(false)

  const steps = useMemo(() => {
    const base = [
      { key: 'q1', prompt: 'Tell us a little more.' },
      { key: 'q2', prompt: 'What would help tomorrow?' },
    ]
    if (feeling === 'happy') base.unshift({ key: 'q0', prompt: 'What made you happy?' })
    if (feeling === 'worried') base.unshift({ key: 'q0', prompt: 'What worried you?' })
    if (feeling === 'sad') base.unshift({ key: 'q0', prompt: 'What made you sad?' })
    return base
  }, [feeling])

  const current = steps[step]
  const canContinue = !!answers[current.key]?.trim()

  return (
    <Page emoji={feelingEmoji(feeling)} title={`${feelingLabel(feeling)} check-in`} subtitle="Small steps. Honest answers. No judgement.">
      <div className="space-y-4">
        <StepperHeader
          title={`Question ${step + 1}`}
          subtitle={current.prompt}
          step={step + 1}
          total={steps.length}
          left={
            <FeelingButton
              disabled
              selected
              emoji={feelingEmoji(feeling)}
              label={feelingLabel(feeling)}
              color={feelingPalette[feeling].color}
              background={feelingPalette[feeling].bg}
              borderColor={feelingPalette[feeling].border}
              ringColor={feelingPalette[feeling].ring}
              className="h-12 w-12"
            />
          }
        />

        <Card key={current.key} className="animate-[nefera-fade-up_220ms_ease-out]">
          <CardBody className="space-y-4">
            <Section title={current.prompt} subtitle="Type a few words. It’s enough." />
            <TextArea
              value={answers[current.key] ?? ''}
              onChange={(e) => setAnswers((a) => ({ ...a, [current.key]: e.target.value }))}
              inputClassName="min-h-[34vh] text-base leading-7"
            />
            <Divider />
            <div className="hidden items-center justify-between gap-2 md:flex">
              <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
                Back
              </Button>
              {step < steps.length - 1 ? (
                <Button disabled={!canContinue} onClick={() => setStep((s) => s + 1)}>
                  Next
                </Button>
              ) : (
                <Button
                  disabled={!canContinue}
                  onClick={async () => {
                        await submitCheckin({
                          mood: feeling.toUpperCase(),
                          sleep_hours: 0,
                          journal_text: Object.values(answers).join("\n"),
                          triggers: [],
                          checkin_data: answers,
                        });

                        dispatch({
                        type: 'student/addCheckIn',
                        checkIn: {
                           id: makeId('chk'),
                           createdAt: new Date().toISOString(),
                           feeling,
                           ageGroup: state.student.ageGroup ?? '11-17',
                          answers,
                       },
                    });

                  setJournalPrompt(true);
                }}
                >
                  Submit
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-[88px] z-40 md:hidden">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-lg shadow-black/10 backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
                Back
              </Button>
              {step < steps.length - 1 ? (
                <Button className="min-w-28" disabled={!canContinue} onClick={() => setStep((s) => s + 1)}>
                  Next
                </Button>
              ) : (
                <Button
                  className="min-w-28"
                  disabled={!canContinue}
                  onClick={async () => {
                    await submitCheckin({
                      mood: feeling.toUpperCase(),
                      sleep_hours: 0,
                      journal_text: Object.values(answers).join("\n"),
                      triggers: [],
                      checkin_data: answers,
                    });

                    dispatch({
                      type: 'student/addCheckIn',
                      checkIn: {
                        id: makeId('chk'),
                        createdAt: new Date().toISOString(),
                        feeling,
                        ageGroup: state.student.ageGroup ?? '11-17',
                        answers,
                      },
                    });

                    setJournalPrompt(true);
                  }}
                >
                  Submit
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={journalPrompt}
        onClose={() => {
          setJournalPrompt(false)
          navigate('/student/sleep', { replace: true })
        }}
        title="Journal this down?"
        description="A quick note helps you remember what mattered."
        footer={
          <>
            <Button variant="ghost" onClick={() => navigate('/student/sleep', { replace: true })}>
              Not now
            </Button>
            <Button onClick={() => navigate(`/student/journal/write?title=${encodeURIComponent(`${feelingEmoji(feeling)} ${feelingLabel(feeling)}`)}&feeling=${feeling}`, { replace: true })}>
              Write journal
            </Button>
          </>
        }
      >
        <div className="rounded-2xl border border-white/70 bg-white/70 p-5 text-sm leading-6 text-[rgb(var(--nefera-muted))]">
          Tip: Write what happened, what you felt in your body, and what you want tomorrow.
        </div>
      </Modal>
    </Page>
  )
}

function StudentSleepTracker() {
  const { dispatch } = useNefera()
  const navigate = useNavigate()
  const [bedtime, setBedtime] = useState('22:30')
  const [wake, setWake] = useState('06:30')
  const [quality, setQuality] = useState(3)
  const [notes, setNotes] = useState('')
  const [toast, setToast] = useState(false)

  function calcHours() {
    const [bh, bm] = bedtime.split(':').map(Number)
    const [wh, wm] = wake.split(':').map(Number)
    const b = bh * 60 + bm
    const w = wh * 60 + wm
    const mins = w >= b ? w - b : 24 * 60 - b + w
    return Math.round((mins / 60) * 10) / 10
  }

  function onSave() {
    dispatch({ type: 'student/addSleepLog', log: { id: makeId('sleep'), createdAt: new Date().toISOString(), hours: calcHours(), quality, notes: notes.trim() } })
    setToast(true)
    window.setTimeout(() => navigate('/student/dashboard', { replace: true }), 250)
  }

  return (
    <Page emoji="🌙" title="Sleep tracker" subtitle="A quick log for today.">
      <Card>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <Input label="Bedtime" type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} />
            <Input label="Wake time" type="time" value={wake} onChange={(e) => setWake(e.target.value)} />
            <div className="rounded-3xl border border-[rgb(var(--nefera-border))] bg-white p-4">
              <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">Estimated hours</div>
              <div className="mt-1 text-3xl font-extrabold text-[rgb(var(--nefera-ink))]">{calcHours()}h</div>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <div className="mb-1.5 text-sm font-semibold text-[rgb(var(--nefera-ink))]">Sleep quality</div>
              <Stars value={quality} onChange={setQuality} max={5} />
            </div>
            <TextArea label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="md:col-span-2 hidden flex-wrap items-center justify-end gap-2 pt-1 md:flex">
            <Button variant="ghost" onClick={() => navigate('/student/dashboard', { replace: true })}>
              Skip
            </Button>
            <Button onClick={onSave}>
              Save
            </Button>
          </div>
        </CardBody>
      </Card>
      <div className="fixed inset-x-0 bottom-[88px] z-40 md:hidden">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-lg shadow-black/10 backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={() => navigate('/student/dashboard', { replace: true })}>
                Skip
              </Button>
              <Button className="min-w-28" onClick={onSave}>
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Toast open={toast} message="Sleep logged." onClose={() => setToast(false)} />
    </Page>
  )
}

function formatShort(value: string | number) {
  const d = new Date(value)
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function uniqueDates(isoList: string[]) {
  return Array.from(new Set(isoList)).sort().reverse()
}

function streakFromISODateList(isoDates: string[]) {
  const uniq = uniqueDates(isoDates)
  if (uniq.length === 0) return 0
  let streak = 0
  const start = new Date(getTodayISO())
  for (let i = 0; i < 366; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    if (uniq.includes(key)) streak++
    else break
  }
  return streak
}

function StudentJournalWrite() {
  const { state, dispatch } = useNefera()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const todayKey = new Date().toISOString().split('T')[0]
  const todaysEntry = state.student.journal.find((j) => j.dateKey === todayKey)
  const isEdit = Boolean(todaysEntry)
  const [now] = useState(() => Date.now())

  const [title, setTitle] = useState(todaysEntry?.title ?? search.get('title') ?? '')
  const [content, setContent] = useState(todaysEntry?.content ?? '')
  const [showReflection, setShowReflection] = useState(false)
  const [feeling, setFeeling] = useState<Feeling | ''>(((search.get('feeling') as Feeling | null) ?? '') as Feeling | '')
  const [toast, setToast] = useState<{ open: boolean; message: string; tone?: 'ok' | 'warn' }>({ open: false, message: '' })

  const locked = Boolean(todaysEntry && now - todaysEntry.createdAt > 24 * 60 * 60 * 1000)
  const canSave = !locked && !!title.trim() && !!content.trim()

  const promptCards = useMemo(() => {
    const base = [
      {
        title: 'What happened today?',
        body: 'Name the moment. Keep it simple and honest.',
        template: 'What happened today?\n',
      },
      {
        title: 'What did you feel in your body?',
        body: 'Tight chest, heavy eyes, buzzing energy — describe it.',
        template: 'What did you feel in your body?\n',
      },
      {
        title: 'What do you need tomorrow?',
        body: 'One small thing that would make it 5% easier.',
        template: 'What do you need tomorrow?\n',
      },
      {
        title: 'One kind sentence to yourself',
        body: 'Talk to you like you would talk to a friend.',
        template: 'One kind sentence to myself:\n',
      },
    ] as const

    if (!feeling) return base

    const first =
      feeling === 'happy'
        ? { title: 'What made you feel happy?', body: 'Name the details so your brain can find them again.', template: 'What made me feel happy?\n' }
        : feeling === 'worried'
          ? { title: 'What worried you?', body: 'Name it clearly. Then name what you can control.', template: 'What worried me?\n' }
          : feeling === 'sad'
            ? { title: 'What made you feel sad?', body: 'Name the loss or the letdown without judging yourself.', template: 'What made me feel sad?\n' }
            : feeling === 'flat'
              ? { title: 'What felt hard to start today?', body: 'Flat often means tired, overloaded, or numb.', template: 'What felt hard to start today?\n' }
              : { title: 'What felt neutral today?', body: 'Sometimes neutral is okay. Name what was steady.', template: 'What felt steady today?\n' }

    return [first, ...base]
  }, [feeling])

  function onSave() {
    const now = Date.now()
    if (todaysEntry) {
      if (now - todaysEntry.createdAt > 24 * 60 * 60 * 1000) {
        setToast({ open: true, message: 'This entry is locked after 24 hours.', tone: 'warn' })
        return
      }
      dispatch({
        type: 'student/updateJournal',
        payload: { id: todaysEntry.id, title: title.trim(), content: content.trim(), updatedAt: now },
      })
    } else {
      dispatch({
        type: 'student/addJournal',
        payload: { id: makeId('jrnl'), title: title.trim(), content: content.trim(), createdAt: now, dateKey: todayKey },
      })
    }
    setToast({ open: true, message: isEdit ? 'Updated. You took care of your story.' : 'Saved. You showed up for yourself.' })
    setShowReflection(true)
  }

  return (
    <Page
      emoji="📝"
      title="Journal"
      subtitle={
        locked
          ? 'This entry is locked after 24 hours. You can always write a new one tomorrow.'
          : isEdit
            ? 'You can edit today’s entry. Gentle is still real.'
            : 'A quiet space to reflect. One honest paragraph counts.'
      }
    >
      <Card className="overflow-hidden">
        <CardBody className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                inputClassName="h-14 text-base font-extrabold tracking-tight"
                disabled={locked}
                hint={locked ? 'Locked after 24 hours.' : isEdit ? 'Editing today’s entry.' : 'A few words is enough. You can always change it later.'}
              />
            </div>
            {locked ? (
              <div className="pt-2">
                <Badge tone="warn">Locked</Badge>
              </div>
            ) : isEdit ? (
              <div className="pt-2">
                <Badge>Editing</Badge>
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/student/journal/past">
              <Button variant="secondary">View past entries</Button>
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/55 p-4 shadow-lg shadow-black/5">
            <div className="text-sm font-extrabold text-[rgb(var(--nefera-ink))]">Feeling</div>
            <Segmented
              value={feeling}
              onChange={locked ? () => void 0 : (v) => setFeeling(v as Feeling)}
              className={cx('flex-wrap', locked ? 'opacity-60' : undefined)}
              options={[
                { value: '', label: '—' },
                { value: 'happy', label: 'Happy' },
                { value: 'neutral', label: 'Neutral' },
                { value: 'flat', label: 'Flat' },
                { value: 'worried', label: 'Worried' },
                { value: 'sad', label: 'Sad' },
              ]}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {promptCards.slice(0, 4).map((p) => (
              <Card key={p.title} className="hover:translate-y-0">
                <CardBody className="space-y-3">
                  <Section title={p.title} subtitle={p.body} />
                  <Button
                    variant="secondary"
                    disabled={locked}
                    onClick={() =>
                      setContent((prev) => {
                        const next = prev.trimEnd()
                        const spacer = next ? '\n\n' : ''
                        return `${next}${spacer}${p.template}`
                      })
                    }
                  >
                    Add prompt
                  </Button>
                </CardBody>
              </Card>
            ))}
          </div>
          <TextArea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={locked}
            inputClassName="min-h-[54vh] text-base leading-7"
            hint="Write for you. Start messy. Keep it kind."
          />
          <div className="hidden flex-wrap items-center justify-end gap-2 pt-1 md:flex">
            <Button variant="ghost" onClick={() => navigate('/student/dashboard')}>
              Cancel
            </Button>
            <Button disabled={!canSave} onClick={onSave}>
              {isEdit ? 'Update entry' : 'Save entry'}
            </Button>
          </div>
        </CardBody>
      </Card>
      <div className="fixed inset-x-0 bottom-[88px] z-40 md:hidden">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-lg shadow-black/10 backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={() => navigate('/student/dashboard')}>
                Cancel
              </Button>
              <Button className="min-w-32" disabled={!canSave} onClick={onSave}>
                {isEdit ? 'Update' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Modal
        open={showReflection}
        onClose={() => {
          setShowReflection(false)
          navigate('/student/journal/history', { replace: true })
        }}
        title="You did something important"
        description="A small reflection is a real skill. You can keep it simple."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowReflection(false)}>
              Keep writing
            </Button>
            <Button
              onClick={() => {
                setShowReflection(false)
                navigate('/student/journal/history', { replace: true })
              }}
            >
              View history
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/70 bg-white/70 p-4 text-sm leading-6 text-[rgb(var(--nefera-muted))]">
            If today felt heavy, you’re allowed to take it one small step at a time. If today felt good, you’re allowed to enjoy that too.
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/70 p-4 text-sm leading-6 text-[rgb(var(--nefera-muted))]">
            Try one tiny anchor: water, fresh air, 60 seconds of breathing, or one message to someone safe.
          </div>
        </div>
      </Modal>
      <Toast open={toast.open} tone={toast.tone} message={toast.message} onClose={() => setToast({ open: false, message: '' })} />
    </Page>
  )
}

function StudentJournalPast() {
  const [journals, setJournals] = useState<any[]>([])

  useEffect(() => {
    getStudentJournals(60)
      .then(setJournals)
      .catch(console.error)
  }, [])

  return (
    <Page emoji="🗓️" title="Past entries" subtitle="A gentle timeline of thoughts and growth.">
      <div className="grid gap-3">
        {journals.length === 0 ? (
          <Card>
            <CardHeader emoji="📝" title="No entries yet" subtitle="Start with one honest sentence. It counts." />
            <CardBody className="space-y-4">
              <div className="text-sm leading-6 text-[rgb(var(--nefera-muted))]">
                Your journal is for you. Write messy. Write small. You can always come back.
              </div>
              <Link to="/student/journal/write">
                <Button>Write your first entry</Button>
              </Link>
            </CardBody>
          </Card>
        ) : null}
        {journals.map((e) => (
          <Card key={e.id}>
            <CardBody className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-base font-extrabold tracking-tight text-[rgb(var(--nefera-ink))]">{e.mood ?? 'Entry'}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-[rgb(var(--nefera-muted))]">
                    <span>{formatShort(e.date)}</span>
                  </div>
                </div>
              </div>
              <div className="text-sm leading-7 text-[rgb(var(--nefera-muted))] whitespace-pre-wrap">{e.journal_text}</div>
            </CardBody>
          </Card>
        ))}
      </div>
    </Page>
  )
}

function StudentGratitude() {
  const { state, dispatch } = useNefera()
  const navigate = useNavigate()
  const [items, setItems] = useState(Array.from({ length: 5 }, () => ''))
  const [toast, setToast] = useState(false)

  const canSave = !items.every((x) => !x.trim())

  function onSave() {
    const content = items
      .filter((x) => x.trim())
      .map((x) => `• ${x.trim()}`)
      .join('\n')
    const todayKey = new Date().toISOString().split('T')[0]
    const todaysEntry = state.student.journal.find((j) => j.dateKey === todayKey)
    const now = Date.now()
    const nextTitle = todaysEntry?.title || 'Gratitude'
    const nextContent = todaysEntry?.content
      ? `${todaysEntry.content.trimEnd()}\n\nGratitude\n${content}`
      : `Gratitude\n${content}`

    if (todaysEntry) {
      dispatch({
        type: 'student/updateJournal',
        payload: { id: todaysEntry.id, title: nextTitle, content: nextContent, updatedAt: now },
      })
    } else {
      dispatch({
        type: 'student/addJournal',
        payload: { id: makeId('jrnl'), title: nextTitle, content: nextContent, createdAt: now, dateKey: todayKey },
      })
    }
    setToast(true)
  }

  return (
    <Page title="Gratitude journal" subtitle="Five small things count. Even tiny ones.">
      <Card>
        <CardBody className="space-y-3">
          {items.map((v, i) => (
            <Input
              key={i}
              label={`Grateful for #${i + 1}`}
              value={v}
              onChange={(e) => setItems((arr) => arr.map((x, idx) => (idx === i ? e.target.value : x)))}
            />
          ))}
          <div className="hidden justify-end pt-2 md:flex">
            <Button disabled={!canSave} onClick={onSave}>
              Save gratitude
            </Button>
          </div>
        </CardBody>
      </Card>
      <div className="fixed inset-x-0 bottom-[88px] z-40 md:hidden">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-lg shadow-black/10 backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={() => navigate('/student/dashboard', { replace: true })}>
                Close
              </Button>
              <Button className="min-w-32" disabled={!canSave} onClick={onSave}>
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Toast open={toast} message="Saved. Your brain loves this." onClose={() => setToast(false)} />
    </Page>
  )
}

function StudentHabits() {
  const { state, dispatch } = useNefera()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🌿')
  const [toast, setToast] = useState(false)
  const [celebrate, setCelebrate] = useState(false)
  const today = getTodayISO()
  const habitCount = state.student.habits.length
  const doneToday = state.student.habits.filter((h) => h.completedDates.includes(today)).length
  const bestStreak = state.student.habits.length ? Math.max(...state.student.habits.map((h) => streakFromISODateList(h.completedDates))) : 0
  return (
    <Page emoji="🔥" title="Habit planner" subtitle="Build tiny routines. Track streaks without pressure.">
      <div className="grid gap-3 md:grid-cols-3">
        <StatPill emoji="📌" label="Habits" value={`${habitCount}`} />
        <StatPill emoji="✅" label="Done today" value={habitCount ? `${doneToday}/${habitCount}` : '0'} />
        <StatPill emoji="🔥" label="Best streak" value={`${bestStreak} days`} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader emoji="✅" title="Your habits" subtitle="Tap to mark done today." />
          <CardBody className="space-y-3">
            {state.student.habits.length === 0 ? (
              <div className="rounded-2xl border border-white/70 bg-white/60 p-6 text-center shadow-lg shadow-black/5">
                <div className="text-3xl">🌿</div>
                <div className="mt-2 text-sm font-extrabold text-[rgb(var(--nefera-ink))]">No habits yet</div>
                <div className="mt-1 text-sm leading-6 text-[rgb(var(--nefera-muted))]">
                  Pick one tiny routine you can do on a busy day.
                </div>
                <div className="mt-4 flex justify-center">
                  <Button
                    onClick={() => {
                      document.getElementById('add-habit')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }}
                  >
                    Add your first habit
                  </Button>
                </div>
              </div>
            ) : null}
            {state.student.habits.map((h) => {
              const done = h.completedDates.includes(today)
              const streak = streakFromISODateList(h.completedDates)
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => dispatch({ type: 'student/toggleHabitToday', habitId: h.id, isoDate: today })}
                  className={cx(
                    'w-full rounded-3xl border border-white/70 bg-white/55 p-5 text-left shadow-lg shadow-black/5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-xl active:translate-y-0 active:scale-[0.99]',
                    done ? 'ring-4 ring-[rgba(34,197,94,0.10)]' : '',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-3xl bg-black/5 text-2xl">{h.emoji}</div>
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-[rgb(var(--nefera-ink))]">{h.name}</div>
                      <div className="mt-1 text-xs font-semibold text-[rgb(var(--nefera-muted))]">Streak: {streak} 🔥</div>
                    </div>
                    <div className="ml-auto text-xl">{done ? '✅' : '⬜'}</div>
                  </div>
                </button>
              )
            })}
          </CardBody>
        </Card>
        <Card id="add-habit">
          <CardHeader emoji="➕" title="Add a habit" subtitle="Keep it small and kind." />
          <CardBody className="space-y-3">
            <Input
              label="Habit name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              hint="Make it so easy you can do it on a hard day."
            />
            <Input label="Emoji" value={emoji} onChange={(e) => setEmoji(e.target.value)} hint="Pick a tiny symbol that feels good to see." />
            <div className="pt-1 flex justify-end">
              <Button
                className={cx('relative overflow-visible', celebrate ? 'animate-[nefera-pop_240ms_ease-out]' : '')}
                disabled={!name.trim()}
                onClick={() => {
                  dispatch({
                    type: 'student/addHabit',
                    habit: { id: makeId('hab'), name: name.trim(), emoji: (emoji.trim() || '🌿').slice(0, 2), createdAt: new Date().toISOString(), completedDates: [] },
                  })
                  setName('')
                  setEmoji('🌿')
                  setToast(true)
                  setCelebrate(true)
                  window.setTimeout(() => setCelebrate(false), 700)
                }}
              >
                <span>Add</span>
                {celebrate ? (
                  <span className="pointer-events-none absolute -right-1.5 -top-1.5 grid h-7 w-7 place-items-center rounded-full border border-white/70 bg-white/90 shadow-lg shadow-black/10 animate-[nefera-sparkle_700ms_ease-out]">
                    <img src={logo} alt="Nefera Logo" className="h-4 w-auto object-contain" />
                  </span>
                ) : null}
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
      <Toast open={toast} message="Habit added. Tiny wins count." onClose={() => setToast(false)} />
    </Page>
  )
}

function StudentSoulSpace() {
  const [search, setSearch] = useSearchParams()
  const initial = (search.get('tab') ?? 'meditation') as 'meditation' | 'breathing' | 'yoga' | 'grounding'
  const [active, setActive] = useState(initial)
  const [open, setOpen] = useState<null | { title: string; emoji: string; seconds: number; description: string }>(null)
  const { reset, running, secondsLeft, setRunning } = useCountdown(open?.seconds ?? 60)

  const list = useMemo(() => {
    if (active === 'meditation')
      return [
        { title: 'Soft landing', emoji: '🫧', seconds: 120, description: 'Notice your breath. Let your shoulders drop.' },
        { title: 'Body scan', emoji: '🧘', seconds: 180, description: 'Scan from head to toes, without judgement.' },
        { title: 'Gratitude pause', emoji: '🌿', seconds: 90, description: 'Think of one small thing that helped today.' },
      ]
    if (active === 'breathing')
      return [
        { title: 'Box breathing', emoji: '⬛', seconds: 120, description: 'In 4, hold 4, out 4, hold 4.' },
        { title: '4-7-8', emoji: '🌬️', seconds: 120, description: 'In 4, hold 7, out 8. Slow and gentle.' },
        { title: 'Sigh reset', emoji: '😮‍💨', seconds: 60, description: 'Two small inhales, long exhale. Repeat.' },
      ]
    if (active === 'yoga')
      return [
        { title: 'Stretch & reach', emoji: '🧎', seconds: 180, description: 'Gentle neck, shoulders, and spine.' },
        { title: 'Calm flow', emoji: '🧘‍♀️', seconds: 240, description: 'Cat-cow + child pose + forward fold.' },
        { title: 'Reset posture', emoji: '🪑', seconds: 120, description: 'Sit tall, open chest, relax jaw.' },
      ]
    return [
      { title: '5-4-3-2-1 senses', emoji: '🖐️', seconds: 120, description: 'Name 5 things you see... 1 thing you feel.' },
      { title: 'Walk check', emoji: '🚶', seconds: 180, description: 'Slow walk. Notice feet, sounds, and air.' },
      { title: 'Water break', emoji: '💧', seconds: 60, description: 'Sip water slowly. Feel it cool your body.' },
    ]
  }, [active])

  useEffect(() => {
    setSearch((p) => {
      p.set('tab', active)
      return p
    })
  }, [active, setSearch])

  useEffect(() => {
    if (!open) return
    reset(open.seconds)
    setRunning(true)
  }, [open, reset, setRunning])

  return (
    <Page emoji="🌿" title="Soul Space" subtitle="A calm menu for your nervous system.">
      <Tabs
        value={active}
        onChange={(v) => setActive(v as typeof active)}
        tabs={[
          { value: 'meditation', label: 'Meditation', emoji: '🫧' },
          { value: 'breathing', label: 'Breathing', emoji: '🌬️' },
          { value: 'yoga', label: 'Yoga', emoji: '🧘' },
          { value: 'grounding', label: 'Grounding', emoji: '🖐️' },
        ]}
      />
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {list.map((x) => {
          const mins = Math.max(1, Math.round(x.seconds / 60))
          return (
            <Card
              key={x.title}
              className="transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-xl active:translate-y-0 active:scale-[0.99]"
            >
              <CardBody className="flex items-start gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-3xl bg-[rgba(62,197,200,0.14)] text-2xl">{x.emoji}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-extrabold text-[rgb(var(--nefera-ink))]">{x.title}</div>
                    <Badge>{mins} min</Badge>
                  </div>
                  <div className="mt-1 text-sm text-[rgb(var(--nefera-muted))]">{x.description}</div>
                  <div className="mt-3">
                    <Button size="sm" variant="secondary" onClick={() => setOpen(x)}>
                      Start
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>

      <Modal
        open={!!open}
        onClose={() => {
          setOpen(null)
          setRunning(false)
        }}
        title={open ? `${open.emoji} ${open.title}` : 'Exercise'}
        description="Follow along gently. If your body says stop, stop."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(null)
                setRunning(false)
              }}
            >
              Close
            </Button>
            <Button variant="secondary" onClick={() => setRunning(!running)}>
              {running ? 'Pause' : 'Resume'}
            </Button>
          </>
        }
      >
        {open ? (
          <div className="space-y-3">
            <div className="rounded-3xl border border-[rgb(var(--nefera-border))] bg-white p-4 text-sm text-[rgb(var(--nefera-muted))]">{open.description}</div>
            <div className="rounded-3xl border border-[rgb(var(--nefera-border))] bg-white p-4">
              <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">Timer</div>
              <div className="mt-1 text-3xl font-extrabold text-[rgb(var(--nefera-ink))]">
                {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}
              </div>
              <div className="mt-2">
                <ProgressBar value={open.seconds > 0 ? (1 - secondsLeft / open.seconds) * 100 : 0} />
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </Page>
  )
}

function StudentAICompanion() {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [messages, setMessages] = useState<Array<{ id: string; from: 'me' | 'ai'; body: string }>>([
    { id: 'a1', from: 'ai', body: `Hi ${user?.name ?? 'there'} 👋 Want to talk about your day?` },
    { id: 'a2', from: 'ai', body: 'You can share one small thing that felt hard — or one tiny win.' },
  ])
  function reply() {
    const hints = [
      'That makes sense. Where do you feel it in your body?',
      'If your best friend felt this way, what would you tell them?',
      'What’s one small step that could make tomorrow 1% easier?',
      'Do you want a quick breathing tool or a journaling prompt?',
    ]
    return hints[Math.floor(Math.random() * hints.length)]
  }
  return (
    <Page
      emoji="🤖"
      title="AI Companion"
      subtitle="A private, guided chat with supportive prompts to help you reflect."
    >
      <Card className="overflow-hidden">
        <div className="max-h-[56vh] overflow-auto p-5">
          <div className="space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={cx('flex', m.from === 'me' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cx(
                    'max-w-[85%] rounded-3xl px-4 py-3 text-sm',
                    m.from === 'me'
                      ? 'bg-[rgb(var(--nefera-brand))] text-white'
                      : 'border border-[rgb(var(--nefera-border))] bg-white text-[rgb(var(--nefera-ink))]',
                  )}
                >
                  {m.body}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-[rgb(var(--nefera-border))] bg-[rgba(255,255,255,0.7)] p-3 backdrop-blur">
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-11 flex-1 resize-none rounded-2xl border border-[rgb(var(--nefera-border))] bg-white px-4 py-3 text-sm outline-none ring-[rgba(98,110,255,0.22)] focus:ring-4"
            />
            <Button
              disabled={!text.trim()}
              onClick={() => {
                const input = text.trim()
                setText('')
                setMessages((m) => [...m, { id: makeId('me'), from: 'me', body: input }, { id: makeId('ai'), from: 'ai', body: reply() }])
              }}
            >
              Send
            </Button>
          </div>
        </div>
      </Card>
    </Page>
  )
}

function StudentGroups() {
  const { state, dispatch } = useNefera()
  return (
    <Page emoji="🤝" title="Support groups" subtitle="Join a circle. Leave anytime. No judgement.">
      <div className="grid gap-3 md:grid-cols-2">
        {state.student.groups.map((g) => (
          <Card key={g.id} className="transition hover:bg-black/5">
            <CardBody className="flex items-start gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-3xl bg-black/5 text-2xl">{g.emoji}</div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-[rgb(var(--nefera-ink))]">{g.name}</div>
                <div className="mt-1 text-sm text-[rgb(var(--nefera-muted))]">Safe prompts, gentle peer support, and optional activities.</div>
                <div className="mt-3">
                  <Button size="sm" variant={g.joined ? 'ghost' : 'secondary'} onClick={() => dispatch({ type: 'student/toggleGroup', groupId: g.id })}>
                    {g.joined ? 'Leave' : 'Join'}
                  </Button>
                </div>
              </div>
              {g.joined ? <Badge tone="ok">Joined</Badge> : <Badge>Open</Badge>}
            </CardBody>
          </Card>
        ))}
      </div>
    </Page>
  )
}

function StudentInbox() {
  const { state, dispatch } = useNefera()
  const [openId, setOpenId] = useState<string | null>(null)
  useEffect(() => {
    getStudentInbox()
      .then((items) => {
        const inbox = (items ?? []).map((m: any) => {
          const role = String(m.sender_role || "school").toLowerCase()
          const fromName = role[0]?.toUpperCase() + role.slice(1)
          return {
            id: String(m.id),
            createdAt: m.created_at,
            fromRole: role as Role,
            fromName,
            toRole: "student" as Role,
            subject: `${fromName} Broadcast`,
            body: m.content,
          }
        })
        dispatch({ type: 'student/setInbox', inbox })
      })
      .catch((err) => {
        console.error(err)
        dispatch({ type: 'student/setInbox', inbox: [] })
      })
  }, [dispatch])
  const msg = state.student.inbox.find((m) => m.id === openId) ?? null
  const unread = state.student.inbox.filter((m) => !m.readAt).length
  return (
    <Page emoji="📥" title="Inbox" subtitle={`${unread} unread message${unread === 1 ? '' : 's'}.`}>
      <div className="grid gap-3">
        {state.student.inbox.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setOpenId(m.id)
              dispatch({ type: 'student/markMessageRead', messageId: m.id })
            }}
            className="text-left"
          >
            <Card className={cx('transition hover:bg-black/5', m.readAt ? 'opacity-90' : '')}>
              <CardBody className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 truncate text-sm font-extrabold text-[rgb(var(--nefera-ink))]">{m.subject}</div>
                  {!m.readAt ? <Badge tone="ok">New</Badge> : <Badge>Read</Badge>}
                </div>
                <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">
                  {m.fromName} • {formatShort(m.createdAt)}
                </div>
                <div className="text-sm text-[rgb(var(--nefera-muted))]">{m.body}</div>
              </CardBody>
            </Card>
          </button>
        ))}
      </div>
      <Modal
        open={!!msg}
        onClose={() => setOpenId(null)}
        title={msg?.subject ?? 'Message'}
        description={msg ? `${msg.fromName} • ${formatShort(msg.createdAt)}` : undefined}
        footer={
          <Button variant="ghost" onClick={() => setOpenId(null)}>
            Close
          </Button>
        }
      >
        <div className="rounded-3xl border border-[rgb(var(--nefera-border))] bg-white p-4 text-sm text-[rgb(var(--nefera-ink))] whitespace-pre-wrap">
          {msg?.body}
        </div>
      </Modal>
    </Page>
  )
}

function StudentReportIncident() {
  const { dispatch } = useNefera()
  const [type, setType] = useState('Bullying / Harassment')
  const [desc, setDesc] = useState('')
  const [anon, setAnon] = useState(true)
  const [confirm, setConfirm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [toast, setToast] = useState(false)
  const canSubmit = !!desc.trim()
  const reportHint = useFirstVisitHint('nefera_hint_report_incident_v1')
  return (
    <Page emoji="🛡️" title="Report incident" subtitle="You can report anonymously. Your safety matters.">
      {submitted ? (
        <Card className="mb-4">
          <CardHeader emoji="✅" title="Report received" subtitle="Thank you for speaking up. You did the right thing." />
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm leading-6 text-[rgb(var(--nefera-muted))]">
              If you’re feeling unsafe right now, reach out to a trusted adult or emergency services.
            </div>
            <Button size="sm" variant="secondary" onClick={() => setSubmitted(false)}>
              Okay
            </Button>
          </CardBody>
        </Card>
      ) : null}
      {reportHint.show ? (
        <Card className="mb-4">
          <CardHeader emoji="💡" title="Quick tip" subtitle="Share what you remember. Short notes are enough." />
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm leading-6 text-[rgb(var(--nefera-muted))]">Include where/when it happened if you can. Names are optional.</div>
            <Button size="sm" variant="secondary" onClick={reportHint.dismiss}>
              Got it
            </Button>
          </CardBody>
        </Card>
      ) : null}
      <Card>
        <CardHeader emoji="📝" title="Tell us what happened" subtitle="Share only what you’re comfortable sharing." />
        <CardBody className="space-y-3">
          <Select
            label="Incident type"
            value={type}
            onChange={setType}
            options={['Bullying / Harassment', 'Unsafe behavior', 'Self-harm concern', 'Teacher concern', 'Online issue', 'Other'].map((t) => ({
              value: t,
              label: t,
            }))}
          />
          <TextArea
            value={desc}
            onChange={(e) => {
              setDesc(e.target.value)
              if (submitted) setSubmitted(false)
            }}
            label="Description"
            hint="If someone is in immediate danger, contact a trusted adult or emergency services."
          />
          <div className="flex items-center gap-2">
            <Chip selected={anon} onClick={() => setAnon(true)}>
              Anonymous
            </Chip>
            <Chip selected={!anon} onClick={() => setAnon(false)}>
              Named
            </Chip>
          </div>
          <div className="hidden justify-end pt-2 md:flex">
            <Button disabled={!canSubmit} onClick={() => setConfirm(true)}>
              Submit report
            </Button>
          </div>
        </CardBody>
      </Card>
      <div className="fixed inset-x-0 bottom-[88px] z-40 md:hidden">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-lg shadow-black/10 backdrop-blur">
            <div className="flex items-center justify-end gap-2">
              <Button className="min-w-40" disabled={!canSubmit} onClick={() => setConfirm(true)}>
                Submit report
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Confirm submission"
        description={`${APP_NAME} will mark this as received and share it with school staff.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const createdAt = new Date().toISOString()
                const normalized =
                  type.toLowerCase().includes('bullying') ? 'BULLYING' :
                  type.toLowerCase().includes('harassment') ? 'HARASSMENT' :
                  type.toLowerCase().includes('ragging') ? 'RAGGING' :
                  'OTHER'

                try {
                  await submitIncidentReport({
                    incident_type: normalized as "BULLYING" | "HARASSMENT" | "RAGGING" | "OTHER",
                    description: desc.trim(),
                    anonymous: anon,
                  })
                  dispatch({
                    type: 'student/addIncident',
                    incident: { id: makeId('inc'), createdAt, type, description: desc.trim(), anonymous: anon, status: 'received' },
                  })
                  setConfirm(false)
                  setDesc('')
                  setToast(true)
                  setSubmitted(true)
                } catch (err) {
                  console.error(err)
                }
              }}
            >
              Confirm
            </Button>
          </>
        }
      >
        <div className="rounded-3xl border border-[rgba(245,158,11,0.22)] bg-[rgba(245,158,11,0.10)] p-4 text-sm text-[rgb(var(--nefera-muted))]">
          If anyone is in immediate danger, contact a trusted adult or emergency services.
        </div>
      </Modal>
      <Toast open={toast} tone="ok" message="Report submitted. Thank you for speaking up." onClose={() => setToast(false)} />
    </Page>
  )
}

function StudentHelpBatchmates() {
  const [anxiety, setAnxiety] = useState<Record<string, boolean>>({})
  const [depression, setDepression] = useState<Record<string, boolean>>({})
  const [risk, setRisk] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState(false)

  const sections = [
    {
      title: 'Anxiety signs',
      emoji: '😰',
      state: anxiety,
      setState: setAnxiety,
      items: ['Avoiding school', 'Very restless', 'Stomach aches', 'Can’t focus', 'Always worrying', 'Trouble sleeping'],
    },
    {
      title: 'Depression signs',
      emoji: '🌧️',
      state: depression,
      setState: setDepression,
      items: ['No interest in fun', 'Always tired', 'Feeling hopeless', 'Irritable', 'Eating changes', 'Withdrawing'],
    },
    {
      title: 'Suicidal risk signs',
      emoji: '🆘',
      state: risk,
      setState: setRisk,
      items: ['Talking about death', 'Giving things away', 'Sudden calm after sadness', 'Self-harm marks', 'Saying goodbye', 'Feeling trapped'],
    },
  ] as const

  const totalChecked = Object.values({ ...anxiety, ...depression, ...risk }).filter(Boolean).length

  return (
    <Page emoji="🫂" title="Help batchmates" subtitle="A quick checklist to notice when a friend might need extra support.">
      <div className="grid gap-3 md:grid-cols-3">
        {sections.map((s) => (
          <ChecklistGroup
            key={s.title}
            title={`${s.emoji} ${s.title}`}
            subtitle="Select what you notice."
            items={[...s.items]}
            values={s.state}
            onToggle={(item, checked) => s.setState((m) => ({ ...m, [item]: checked }))}
          />
        ))}
      </div>
      <Card className="mt-4">
        <CardBody className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-extrabold text-[rgb(var(--nefera-ink))]">What next</div>
            <div className="mt-1 text-sm text-[rgb(var(--nefera-muted))]">
              Checked {totalChecked} sign{totalChecked === 1 ? '' : 's'}. If risk signs are present, tell a trusted adult immediately.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/student/inbox">
              <Button variant="secondary" size="sm">
                Message staff 💬
              </Button>
            </Link>
            <Button size="sm" onClick={() => setToast(true)}>
              Save checklist
            </Button>
          </div>
        </CardBody>
      </Card>
      <Toast open={toast} message="Saved. You’re a good friend." onClose={() => setToast(false)} />
    </Page>
  )
}

function TeacherObservationChecklist() {
  const params = useParams()
  const [values, setValues] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState(false)

  const items = [
    'Frequent absenteeism',
    'Noticeable changes in feelings',
    'Withdrawing from friends',
    'Trouble focusing in class',
    'Sudden drop in performance',
    'Conflict with peers',
    'Physical complaints (headache/stomach)',
    'Signs of self-harm concern',
  ]

  const checked = Object.values(values).filter(Boolean).length
  const studentLabel = params.id ? `Student ${params.id}` : 'Student'

  return (
    <Page emoji="🧑‍🏫" title="Teacher observation" subtitle={`A quick checklist for ${studentLabel}.`}>
      <div className="space-y-3">
        <ChecklistGroup
          title="🧾 Observation checklist"
          subtitle="Select what you noticed today."
          items={items}
          values={values}
          onToggle={(item, checked) => setValues((m) => ({ ...m, [item]: checked }))}
        />
        <Card>
          <CardBody className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <Section title="Summary" subtitle={`Checked ${checked} item${checked === 1 ? '' : 's'}.`} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setValues({})}>
                Clear
              </Button>
              <Button size="sm" onClick={() => setToast(true)}>
                Save observation
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
      <Toast open={toast} message="Saved. Thank you for noticing." onClose={() => setToast(false)} />
    </Page>
  )
}

function ParentObservationChecklist() {
  const [feelings, setFeelings] = useState<Record<string, boolean>>({})
  const [habits, setHabits] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState(false)

  const totalChecked = Object.values({ ...feelings, ...habits }).filter(Boolean).length

  return (
    <Page emoji="👪" title="Home checklist" subtitle="A gentle way to notice patterns at home.">
      <div className="grid gap-3 md:grid-cols-2">
        <ChecklistGroup
          title="💛 Feelings & connection"
          subtitle="What feels different lately?"
          items={['Withdrawn from family', 'More irritable', 'Sad or tearful', 'Anxious or worried', 'Less interest in hobbies', 'Avoiding school talk']}
          values={feelings}
          onToggle={(item, checked) => setFeelings((m) => ({ ...m, [item]: checked }))}
        />
        <ChecklistGroup
          title="🌙 Sleep & habits"
          subtitle="Small shifts can be meaningful."
          items={['Trouble falling asleep', 'Sleeping too much', 'Eating changes', 'Low energy', 'Headache or stomach aches', 'Too much screen time']}
          values={habits}
          onToggle={(item, checked) => setHabits((m) => ({ ...m, [item]: checked }))}
        />
      </div>
      <Card className="mt-4">
        <CardBody className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <Section title="Next step" subtitle={`Checked ${totalChecked} item${totalChecked === 1 ? '' : 's'}. Consider a calm chat, then message the school if needed.`} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/parent/message">
              <Button variant="secondary" size="sm">
                Message school 💌
              </Button>
            </Link>
            <Button size="sm" onClick={() => setToast(true)}>
              Save checklist
            </Button>
          </div>
        </CardBody>
      </Card>
      <Toast open={toast} message="Saved. Thank you for checking in." onClose={() => setToast(false)} />
    </Page>
  )
}

function StudentProfile() {
  const { user } = useAuth()
  const [journals, setJournals] = useState<any[]>([])

  useEffect(() => {
    getStudentJournals(90)
      .then(setJournals)
      .catch(console.error)
  }, [])

  const journalDates = useMemo(() => journals.map((j) => new Date(j.date).toISOString().slice(0, 10)), [journals])
  const checkIns = journals.length
  const sleep = 0
  const dayStreak = streakFromISODateList(journalDates)
  const journalStreak = dayStreak
  return (
    <Page emoji="🙋" title="Profile" subtitle="Manage your information and view your activity.">
      <Card>
        <CardBody className="flex flex-col gap-4 md:flex-row md:items-center">
          <Avatar name={user?.name ?? 'Guest'} size={56} />
          <div className="min-w-0">
            <div className="text-lg font-extrabold text-[rgb(var(--nefera-ink))]">{user?.name ?? 'Guest'}</div>
            <div className="text-sm font-semibold text-[rgb(var(--nefera-muted))]">{user?.role.toUpperCase()}</div>
          </div>
          <div className="ml-auto grid w-full grid-cols-3 gap-2 md:w-auto">
            <div className="rounded-3xl border border-[rgb(var(--nefera-border))] bg-white p-3 text-center">
              <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">Check-ins</div>
              <div className="mt-1 text-xl font-extrabold text-[rgb(var(--nefera-ink))]">{checkIns}</div>
            </div>
            <div className="rounded-3xl border border-[rgb(var(--nefera-border))] bg-white p-3 text-center">
              <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">Journals</div>
              <div className="mt-1 text-xl font-extrabold text-[rgb(var(--nefera-ink))]">{journals.length}</div>
            </div>
            <div className="rounded-3xl border border-[rgb(var(--nefera-border))] bg-white p-3 text-center">
              <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">Sleep</div>
              <div className="mt-1 text-xl font-extrabold text-[rgb(var(--nefera-ink))]">{sleep}</div>
            </div>
          </div>
        </CardBody>
      </Card>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader title="Streaks" subtitle="Consistency over perfection." />
          <CardBody className="grid gap-2 md:grid-cols-2">
            <div className="rounded-3xl border border-[rgb(var(--nefera-border))] bg-white p-4">
              <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">Check-in streak</div>
              <div className="mt-1 text-2xl font-extrabold text-[rgb(var(--nefera-ink))]">{dayStreak} 🔥</div>
            </div>
            <div className="rounded-3xl border border-[rgb(var(--nefera-border))] bg-white p-4">
              <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">Journal streak</div>
              <div className="mt-1 text-2xl font-extrabold text-[rgb(var(--nefera-ink))]">{journalStreak} 📝</div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Privacy" subtitle="Your information is protected." />
          <CardBody className="space-y-3">
            <div className="rounded-3xl border border-[rgb(var(--nefera-border))] bg-white p-4 text-sm text-[rgb(var(--nefera-muted))]">Your responses are private.</div>
            <Link to="/student/soul-space">
              <Button variant="secondary">Open Soul Space 🌿</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    </Page>
  )
}

function flagTone(flag: 'orange' | 'red' | 'crisis' | 'none') {
  if (flag === 'orange') return 'warn'
  if (flag === 'red' || flag === 'crisis') return 'danger'
  return 'neutral'
}

function flagLabel(flag: 'orange' | 'red' | 'crisis' | 'none') {
  if (flag === 'orange') return 'Watch'
  if (flag === 'red') return 'High'
  if (flag === 'crisis') return 'Crisis'
  return 'None'
}

function riskToFlag(risk?: string): 'orange' | 'red' | 'crisis' | 'none' {
  if (!risk) return 'none'
  const upper = risk.toUpperCase()
  if (upper === 'ORANGE') return 'orange'
  if (upper === 'RED') return 'red'
  if (upper === 'CRISIS') return 'crisis'
  return 'none'
}

type TeacherStudentItem = {
  id: number
  name: string
  roll_number?: string | null
  class_name?: string | null
  risk_status?: string | null
  flags: 'orange' | 'red' | 'crisis' | 'none'
}

function TeacherDashboard() {
  const { user } = useAuth()
  const [riskZones, setRiskZones] = useState<{ green: number; orange: number; red: number; crisis: number } | null>(null)
  const [students, setStudents] = useState<TeacherStudentItem[]>([])

  useEffect(() => {
    getTeacherDashboard()
      .then((data) => setRiskZones(data?.risk_zones ?? null))
      .catch(console.error)
  }, [])

  useEffect(() => {
    getTeacherStudents()
      .then((data) => {
        const list = (data?.students ?? []).map((s: any) => ({
          ...s,
          flags: riskToFlag(s?.risk_status),
        }))
        setStudents(list)
      })
      .catch(console.error)
  }, [])

  const flagged = riskZones ? (riskZones.orange + riskZones.red + riskZones.crisis) : students.filter((s) => s.flags !== 'none').length
  const crisis = riskZones ? riskZones.crisis : students.filter((s) => s.flags === 'crisis').length
  const high = riskZones ? riskZones.red : students.filter((s) => s.flags === 'red').length

  return (
    <Page emoji="🧑‍🏫" title={`Welcome, ${user?.name ?? 'Teacher'}`} subtitle="Class overview and quick actions.">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader emoji="📚" title="Today" subtitle="A quick snapshot to guide support." />
          <CardBody className="grid gap-3 md:grid-cols-2">
            <StatPill emoji="🧑‍🎓" label="Students" value={`${riskZones ? (riskZones.green + riskZones.orange + riskZones.red + riskZones.crisis) : students.length}`} />
            <StatPill emoji="🚩" label="Flagged" value={`${flagged}`} />
            <StatPill emoji="🟠" label="Watch" value={`${riskZones ? riskZones.orange : students.filter((s) => s.flags === 'orange').length}`} />
            <StatPill emoji="🛟" label="High/Crisis" value={`${high + crisis}`} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader emoji="⚡" title="Quick actions" subtitle="Keep communication simple and timely." />
          <CardBody className="flex flex-wrap items-center gap-2">
            <Link to="/teacher/broadcast">
              <Button>Broadcast 📣</Button>
            </Link>
            <Link to="/teacher/students">
              <Button variant="secondary">View students</Button>
            </Link>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          emoji="🚩"
          title="Students needing attention"
          subtitle="Flags help route support to the right team."
          right={
            <Link to="/teacher/students" className="text-sm font-semibold text-[rgb(var(--nefera-brand))]">
              View all
            </Link>
          }
        />
        <CardBody className="grid gap-2">
          {students.filter((s) => s.flags !== 'none').slice(0, 6).map((s) => (
            <Link key={s.id} to={`/teacher/students/${s.id}`} className="rounded-2xl border border-white/70 bg-white/60 p-4 shadow-lg shadow-black/5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-extrabold text-[rgb(var(--nefera-ink))]">{s.name}</div>
                  <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">{s.class_name ?? ''}</div>
                </div>
                <Badge tone={flagTone(s.flags)}>{flagLabel(s.flags)}</Badge>
              </div>
            </Link>
          ))}
          {students.every((s) => s.flags === 'none') ? (
            <div className="rounded-2xl border border-white/70 bg-white/60 p-4 text-sm text-[rgb(var(--nefera-muted))]">
              No flags right now. Use observations to note changes and follow up early.
            </div>
          ) : null}
        </CardBody>
      </Card>
    </Page>
  )
}

function TeacherBroadcast() {
  const { dispatch } = useNefera()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [toast, setToast] = useState(false)

  const canSend = !!title.trim() && !!body.trim()

  function onSend() {
    const createdAt = new Date().toISOString()
    dispatch({ type: 'teacher/addBroadcast', item: { id: makeId('t_brd'), createdAt, title: title.trim(), body: body.trim() } })
    setToast(true)
    window.setTimeout(() => navigate('/teacher/dashboard', { replace: true }), 250)
  }

  return (
    <Page emoji="📣" title="Broadcast" subtitle="Send a supportive message to students.">
      <Card>
        <CardBody className="space-y-3">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextArea label="Message" value={body} onChange={(e) => setBody(e.target.value)} inputClassName="min-h-40" />
          <Divider />
          <div className="hidden justify-end gap-2 md:flex">
            <Button variant="ghost" onClick={() => navigate('/teacher/dashboard')}>
              Cancel
            </Button>
            <Button disabled={!canSend} onClick={onSend}>
              Send
            </Button>
          </div>
        </CardBody>
      </Card>
      <div className="fixed inset-x-0 bottom-[88px] z-40 md:hidden">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-lg shadow-black/10 backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={() => navigate('/teacher/dashboard')}>
                Cancel
              </Button>
              <Button className="min-w-28" disabled={!canSend} onClick={onSend}>
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Toast open={toast} message="Broadcast sent." onClose={() => setToast(false)} />
    </Page>
  )
}

function TeacherStudents() {
  const [students, setStudents] = useState<TeacherStudentItem[]>([])

  useEffect(() => {
    getTeacherStudents()
      .then((data) => {
        const list = (data?.students ?? []).map((s: any) => ({
          ...s,
          flags: riskToFlag(s?.risk_status),
        }))
        setStudents(list)
      })
      .catch(console.error)
  }, [])

  return (
    <Page emoji="🧑‍🎓" title="Students" subtitle="View students and log observations.">
      <div className="grid gap-3">
        {students.map((s) => (
          <Card key={s.id}>
            <CardBody className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="text-base font-extrabold tracking-tight text-[rgb(var(--nefera-ink))]">{s.name}</div>
                <div className="mt-1 text-xs font-semibold text-[rgb(var(--nefera-muted))]">{s.class_name ?? ''}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={flagTone(s.flags)}>{flagLabel(s.flags)}</Badge>
                <Select
                  value={s.flags}
                  onChange={(v) =>
                    setStudents((prev) =>
                      prev.map((item) =>
                        item.id === s.id ? { ...item, flags: v as TeacherStudentItem['flags'] } : item
                      )
                    )
                  }
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'orange', label: 'Watch' },
                    { value: 'red', label: 'High' },
                    { value: 'crisis', label: 'Crisis' },
                  ]}
                />
                <Link to={`/teacher/students/${s.id}`}>
                  <Button size="sm">Observation</Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </Page>
  )
}

function TeacherProfile() {
  const { user } = useAuth()
  return (
    <Page emoji="🙋" title="Profile" subtitle="Your account details.">
      <Card>
        <CardBody className="space-y-2">
          <div className="text-sm font-semibold text-[rgb(var(--nefera-muted))]">Name</div>
          <div className="text-lg font-extrabold text-[rgb(var(--nefera-ink))]">{user?.name ?? ''}</div>
          <Divider className="my-3" />
          <div className="text-sm font-semibold text-[rgb(var(--nefera-muted))]">Role</div>
          <div className="text-sm font-extrabold text-[rgb(var(--nefera-ink))]">{user?.role.toUpperCase()}</div>
        </CardBody>
      </Card>
    </Page>
  )
}

function ParentDashboard() {
  const { state } = useNefera()
  const { user } = useAuth()
  const child = state.parent.children[0]
  const [snapshot, setSnapshot] = useState<{
    student_name?: string
    class_name?: string
    risk_status?: string
    streak_count?: number
  } | null>(null)

  useEffect(() => {
    getParentDashboard()
      .then(setSnapshot)
      .catch(console.error)
  }, [])
  return (
    <Page emoji="👪" title={`Welcome, ${user?.name ?? 'Parent'}`} subtitle="A calm overview and simple next steps.">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader emoji="🧒" title="Child" subtitle="Overview for your child." />
          <CardBody className="space-y-2">
            <div className="text-base font-extrabold tracking-tight text-[rgb(var(--nefera-ink))]">{snapshot?.student_name ?? child?.name ?? '—'}</div>
            <div className="text-sm font-semibold text-[rgb(var(--nefera-muted))]">{snapshot?.class_name ?? child?.grade ?? ''}</div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader emoji="⚡" title="Quick actions" subtitle="Small steps at home and school." />
          <CardBody className="flex flex-wrap items-center gap-2">
            <Link to="/parent/checklist">
              <Button>Home checklist ✅</Button>
            </Link>
            <Link to="/parent/message">
              <Button variant="secondary">Message school 💌</Button>
            </Link>
            <Link to="/parent/report-incident">
              <Button variant="secondary">Report incident 🛡️</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
      <Card className="mt-4">
        <CardHeader emoji="📨" title="Recent messages" subtitle="Messages you’ve sent to school." />
        <CardBody className="grid gap-2">
          {state.parent.sent.slice(0, 4).map((m) => (
            <div key={m.id} className="rounded-2xl border border-white/70 bg-white/60 p-4 shadow-lg shadow-black/5">
              <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">{formatShort(m.createdAt)}</div>
              <div className="mt-1 text-sm text-[rgb(var(--nefera-ink))] whitespace-pre-wrap">{m.body}</div>
            </div>
          ))}
          {state.parent.sent.length === 0 ? (
            <div className="rounded-2xl border border-white/70 bg-white/60 p-4 text-sm text-[rgb(var(--nefera-muted))]">
              No messages yet. If you notice changes at home, a short note can help the school respond early.
            </div>
          ) : null}
        </CardBody>
      </Card>
    </Page>
  )
}

function ParentMessage() {
  const { dispatch } = useNefera()
  const navigate = useNavigate()
  const [body, setBody] = useState('')
  const [toast, setToast] = useState(false)
  const canSend = !!body.trim()

  function onSend() {
    const createdAt = new Date().toISOString()
    dispatch({ type: 'parent/sendMessage', item: { id: makeId('p_msg'), createdAt, toChildId: 'child_1', body: body.trim() } })
    setToast(true)
    window.setTimeout(() => navigate('/parent/dashboard', { replace: true }), 250)
  }

  return (
    <Page emoji="💌" title="Message school" subtitle="Share what you’re noticing at home.">
      <Card>
        <CardBody className="space-y-3">
          <TextArea label="Message" value={body} onChange={(e) => setBody(e.target.value)} inputClassName="min-h-48" />
          <Divider />
          <div className="hidden justify-end gap-2 md:flex">
            <Button variant="ghost" onClick={() => navigate('/parent/dashboard')}>
              Cancel
            </Button>
            <Button disabled={!canSend} onClick={onSend}>
              Send
            </Button>
          </div>
        </CardBody>
      </Card>
      <div className="fixed inset-x-0 bottom-[88px] z-40 md:hidden">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-lg shadow-black/10 backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={() => navigate('/parent/dashboard')}>
                Cancel
              </Button>
              <Button className="min-w-28" disabled={!canSend} onClick={onSend}>
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Toast open={toast} message="Message sent." onClose={() => setToast(false)} />
    </Page>
  )
}

function ParentReportIncident() {
  const { dispatch } = useNefera()
  const [type, setType] = useState('Bullying / Harassment')
  const [desc, setDesc] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [toast, setToast] = useState(false)
  const canSubmit = !!desc.trim()
  const reportHint = useFirstVisitHint('nefera_hint_parent_report_incident_v1')
  return (
    <Page emoji="🛡️" title="Report incident" subtitle="Share what you noticed. This will be sent to school staff.">
      {submitted ? (
        <Card className="mb-4">
          <CardHeader emoji="✅" title="Report received" subtitle="Thank you. Your report helps the school respond early." />
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm leading-6 text-[rgb(var(--nefera-muted))]">If someone is in immediate danger, contact a trusted adult or emergency services.</div>
            <Button size="sm" variant="secondary" onClick={() => setSubmitted(false)}>
              Okay
            </Button>
          </CardBody>
        </Card>
      ) : null}
      {reportHint.show ? (
        <Card className="mb-4">
          <CardHeader emoji="💡" title="Quick tip" subtitle="Short notes are enough." />
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm leading-6 text-[rgb(var(--nefera-muted))]">Include where/when it happened if you can. Names are optional.</div>
            <Button size="sm" variant="secondary" onClick={reportHint.dismiss}>
              Got it
            </Button>
          </CardBody>
        </Card>
      ) : null}
      <Card>
        <CardHeader emoji="📝" title="Tell us what happened" subtitle="Share only what you’re comfortable sharing." />
        <CardBody className="space-y-3">
          <Select
            label="Incident type"
            value={type}
            onChange={setType}
            options={['Bullying / Harassment', 'Unsafe behavior', 'Self-harm concern', 'Teacher concern', 'Online issue', 'Other'].map((t) => ({
              value: t,
              label: t,
            }))}
          />
          <TextArea
            value={desc}
            onChange={(e) => {
              setDesc(e.target.value)
              if (submitted) setSubmitted(false)
            }}
            label="Description"
            hint="If someone is in immediate danger, contact a trusted adult or emergency services."
          />
          <div className="hidden justify-end pt-2 md:flex">
            <Button disabled={!canSubmit} onClick={() => setConfirm(true)}>
              Submit report
            </Button>
          </div>
        </CardBody>
      </Card>
      <div className="fixed inset-x-0 bottom-[88px] z-40 md:hidden">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-lg shadow-black/10 backdrop-blur">
            <div className="flex items-center justify-end gap-2">
              <Button className="min-w-40" disabled={!canSubmit} onClick={() => setConfirm(true)}>
                Submit report
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Confirm submission"
        description={`${APP_NAME} will mark this as received and share it with school staff.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const createdAt = new Date().toISOString()
                dispatch({ type: 'parent/addReport', item: { id: makeId('p_rep'), createdAt, type, body: desc.trim() } })
                setConfirm(false)
                setDesc('')
                setToast(true)
                setSubmitted(true)
              }}
            >
              Confirm
            </Button>
          </>
        }
      >
        <div className="rounded-3xl border border-[rgba(245,158,11,0.22)] bg-[rgba(245,158,11,0.10)] p-4 text-sm text-[rgb(var(--nefera-muted))]">
          If anyone is in immediate danger, contact a trusted adult or emergency services.
        </div>
      </Modal>
      <Toast open={toast} tone="ok" message="Report submitted. Thank you for sharing." onClose={() => setToast(false)} />
    </Page>
  )
}

function ParentProfile() {
  const { user } = useAuth()
  return (
    <Page emoji="🙋" title="Profile" subtitle="Your account details.">
      <Card>
        <CardBody className="space-y-2">
          <div className="text-sm font-semibold text-[rgb(var(--nefera-muted))]">Name</div>
          <div className="text-lg font-extrabold text-[rgb(var(--nefera-ink))]">{user?.name ?? ''}</div>
          <Divider className="my-3" />
          <div className="text-sm font-semibold text-[rgb(var(--nefera-muted))]">Role</div>
          <div className="text-sm font-extrabold text-[rgb(var(--nefera-ink))]">{user?.role.toUpperCase()}</div>
        </CardBody>
      </Card>
    </Page>
  )
}

function CounselorDashboard() {
  const { state, dispatch } = useNefera()
  const { user } = useAuth()
  const [riskZones, setRiskZones] = useState<{ green: number; orange: number; red: number; crisis: number } | null>(null)

  useEffect(() => {
    getCounselorDashboard()
      .then(setRiskZones)
      .catch(console.error)
  }, [])

  const students = state.counselor.students
  const total = riskZones ? (riskZones.green + riskZones.orange + riskZones.red + riskZones.crisis) : students.length
  const flagged = riskZones ? (riskZones.orange + riskZones.red + riskZones.crisis) : students.filter((s) => s.flags !== 'none').length
  const crisis = riskZones ? riskZones.crisis : students.filter((s) => s.flags === 'crisis').length

  return (
    <Page emoji="🧠" title={`Welcome, ${user?.name ?? 'Counselor'}`} subtitle="Prioritize support, follow up, and document care.">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader emoji="🚩" title="Flags" subtitle="Students needing follow-up." />
          <CardBody className="grid gap-3 md:grid-cols-2">
            <StatPill emoji="🧑‍🎓" label="Students" value={`${total}`} />
            <StatPill emoji="🚩" label="Flagged" value={`${flagged}`} />
            <StatPill emoji="🛟" label="Crisis" value={`${crisis}`} />
            <StatPill emoji="🗂️" label="Crisis actions" value={`${state.counselor.crisisActions.filter((a) => !a.done).length}`} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader emoji="⚡" title="Quick actions" subtitle="Keep communication clear and calm." />
          <CardBody className="flex flex-wrap items-center gap-2">
            <Link to="/counselor/flags">
              <Button>View flags 🚩</Button>
            </Link>
            <Link to="/counselor/students">
              <Button variant="secondary">All students 🧑‍🎓</Button>
            </Link>
            <Link to="/counselor/assessments/phq9">
              <Button variant="secondary">PHQ-9 📋</Button>
            </Link>
            <Link to="/counselor/assessments/gad7">
              <Button variant="secondary">GAD-7 🧭</Button>
            </Link>
            <Link to="/counselor/assessments/cssrs">
              <Button variant="secondary">C-SSRS 🛟</Button>
            </Link>
            <Link to="/counselor/crisis-actions">
              <Button variant="secondary">Crisis actions 🧾</Button>
            </Link>
            <Link to="/counselor/broadcast">
              <Button variant="secondary">Broadcast 📣</Button>
            </Link>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader emoji="🧾" title="Crisis actions" subtitle="Track the steps you’ve taken." />
        <CardBody className="grid gap-2">
          {state.counselor.crisisActions.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => dispatch({ type: 'counselor/toggleCrisisAction', id: a.id })}
              className={cx(
                'flex items-start gap-3 rounded-2xl border border-white/70 bg-white/60 p-4 text-left shadow-lg shadow-black/5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-xl active:translate-y-0',
                a.done ? 'opacity-70' : '',
              )}
            >
              <div className={cx('mt-0.5 grid h-6 w-6 place-items-center rounded-full border bg-white text-xs font-extrabold', a.done ? 'border-[rgba(34,197,94,0.30)]' : 'border-white/70')}>
                {a.done ? '✓' : ''}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[rgb(var(--nefera-ink))]">{a.body}</div>
                <div className="mt-1 text-xs font-semibold text-[rgb(var(--nefera-muted))]">{formatShort(a.createdAt)}</div>
              </div>
            </button>
          ))}
        </CardBody>
      </Card>
    </Page>
  )
}

function CounselorFlags() {
  const { state } = useNefera()
  const [flagged, setFlagged] = useState(state.counselor.students.filter((s) => s.flags !== 'none'))

  useEffect(() => {
    getCounselorRiskyStudents()
      .then((rows) => {
        const mapped = (rows ?? []).map((s: any) => {
          const status = String(s.risk_status || "ORANGE").toLowerCase()
          const flag =
            status === "crisis" ? "crisis" :
            status === "red" ? "red" :
            status === "orange" ? "orange" :
            "none"

          return {
            id: String(s.id),
            name: s.name || s.email || "Student",
            grade: s.class_name || "Class",
            flags: flag as "orange" | "red" | "crisis" | "none",
          }
        })
        setFlagged(mapped)
      })
      .catch(console.error)
  }, [])
  return (
    <Page emoji="🚩" title="Flagged students" subtitle="Open a student to review questionnaires and plan follow-up.">
      <div className="grid gap-3">
        {flagged.map((s) => (
          <Link key={s.id} to={`/counselor/students/${s.id}`} className="rounded-2xl border border-white/70 bg-white/60 p-5 shadow-lg shadow-black/5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-base font-extrabold tracking-tight text-[rgb(var(--nefera-ink))]">{s.name}</div>
                <div className="mt-1 text-xs font-semibold text-[rgb(var(--nefera-muted))]">{s.grade}</div>
              </div>
              <Badge tone={flagTone(s.flags)}>{flagLabel(s.flags)}</Badge>
            </div>
          </Link>
        ))}
        {flagged.length === 0 ? (
          <Card>
            <CardHeader emoji="🌿" title="No flags right now" subtitle="Keep an eye on trends and follow up early." />
            <CardBody className="text-sm text-[rgb(var(--nefera-muted))]">
              When a student is flagged, this list helps you prioritize outreach and document actions.
            </CardBody>
          </Card>
        ) : null}
      </div>
    </Page>
  )
}

function CounselorStudents() {
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([])
  const [classId, setClassId] = useState<number | null>(null)
  const [students, setStudents] = useState<{ id: string; name: string; grade: string; flags: 'orange' | 'red' | 'crisis' | 'none' }[]>([])

  useEffect(() => {
    getCounselorClasses()
      .then((rows) => {
        const list = rows ?? []
        setClasses(list)
        if (list.length > 0) {
          setClassId((prev) => (prev == null ? Number(list[0].id) : prev))
        }
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (classId == null) {
      setStudents([])
      return
    }
    getCounselorStudents(classId)
      .then((rows) => {
        const mapped = (rows ?? []).map((s: any) => {
          const status = String(s.risk_status || "GREEN").toLowerCase()
          const flag =
            status === "crisis" ? "crisis" :
            status === "red" ? "red" :
            status === "orange" ? "orange" :
            "none"

          return {
            id: String(s.id),
            name: s.name || s.email || "Student",
            grade: s.class_name || "Class",
            flags: flag as "orange" | "red" | "crisis" | "none",
          }
        })
        setStudents(mapped)
      })
      .catch(console.error)
  }, [classId])
  return (
    <Page emoji="🧑‍🎓" title="Students" subtitle="Open a student to review questionnaires and plan follow-up.">
      <Card className="mb-4">
        <CardBody className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">Class</div>
            <div className="mt-1">
              <Select
                value={classId != null ? String(classId) : ''}
                onChange={(v) => setClassId(Number(v))}
                options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
              />
            </div>
          </div>
        </CardBody>
      </Card>
      <div className="grid gap-3">
        {students.map((s) => (
          <Link key={s.id} to={`/counselor/students/${s.id}`} className="rounded-2xl border border-white/70 bg-white/60 p-5 shadow-lg shadow-black/5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-base font-extrabold tracking-tight text-[rgb(var(--nefera-ink))]">{s.name}</div>
                <div className="mt-1 text-xs font-semibold text-[rgb(var(--nefera-muted))]">{s.grade}</div>
              </div>
              <Badge tone={flagTone(s.flags)}>{flagLabel(s.flags)}</Badge>
            </div>
          </Link>
        ))}
        {students.length === 0 ? (
          <Card>
            <CardHeader emoji="🌿" title="No students found" subtitle="Pick a class to see students." />
          </Card>
        ) : null}
      </div>
    </Page>
  )
}

function CounselorCrisisActions() {
  const { state, dispatch } = useNefera()
  const navigate = useNavigate()
  const openCount = state.counselor.crisisActions.filter((a) => !a.done).length
  return (
    <Page emoji="🧾" title="Crisis actions" subtitle="Track the steps you’ve taken.">
      <Card>
        <CardBody className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">Open actions</div>
            <div className="text-sm font-extrabold text-[rgb(var(--nefera-ink))]">{openCount}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => navigate('/counselor/dashboard')}>
              Back
            </Button>
          </div>
        </CardBody>
      </Card>
      <Card className="mt-4">
        <CardHeader emoji="🗂️" title="Action list" subtitle="Tap to mark an action as done." />
        <CardBody className="grid gap-2">
          {state.counselor.crisisActions.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => dispatch({ type: 'counselor/toggleCrisisAction', id: a.id })}
              className={cx(
                'flex items-start gap-3 rounded-2xl border border-white/70 bg-white/60 p-4 text-left shadow-lg shadow-black/5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-xl active:translate-y-0',
                a.done ? 'opacity-70' : '',
              )}
            >
              <div className={cx('mt-0.5 grid h-6 w-6 place-items-center rounded-full border bg-white text-xs font-extrabold', a.done ? 'border-[rgba(34,197,94,0.30)]' : 'border-white/70')}>
                {a.done ? '✓' : ''}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[rgb(var(--nefera-ink))]">{a.body}</div>
                <div className="mt-1 text-xs font-semibold text-[rgb(var(--nefera-muted))]">{formatShort(a.createdAt)}</div>
              </div>
            </button>
          ))}
        </CardBody>
      </Card>
    </Page>
  )
}

function CounselorBroadcast() {
  const { dispatch } = useNefera()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [toast, setToast] = useState(false)
  const canSend = !!title.trim() && !!body.trim()

  function onSend() {
    const createdAt = new Date().toISOString()
    dispatch({ type: 'counselor/addBroadcast', item: { id: makeId('c_brd'), createdAt, title: title.trim(), body: body.trim() } })
    setToast(true)
    window.setTimeout(() => navigate('/counselor/dashboard', { replace: true }), 250)
  }

  return (
    <Page emoji="📣" title="Broadcast" subtitle="Send a supportive message to students.">
      <Card>
        <CardBody className="space-y-3">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextArea label="Message" value={body} onChange={(e) => setBody(e.target.value)} inputClassName="min-h-40" />
          <Divider />
          <div className="hidden justify-end gap-2 md:flex">
            <Button variant="ghost" onClick={() => navigate('/counselor/dashboard')}>
              Cancel
            </Button>
            <Button disabled={!canSend} onClick={onSend}>
              Send
            </Button>
          </div>
        </CardBody>
      </Card>
      <div className="fixed inset-x-0 bottom-[88px] z-40 md:hidden">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-lg shadow-black/10 backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={() => navigate('/counselor/dashboard')}>
                Cancel
              </Button>
              <Button className="min-w-28" disabled={!canSend} onClick={onSend}>
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Toast open={toast} message="Broadcast sent." onClose={() => setToast(false)} />
    </Page>
  )
}

function CounselorProfile() {
  const { user } = useAuth()
  return (
    <Page emoji="🙋" title="Profile" subtitle="Your account details.">
      <Card>
        <CardBody className="space-y-2">
          <div className="text-sm font-semibold text-[rgb(var(--nefera-muted))]">Name</div>
          <div className="text-lg font-extrabold text-[rgb(var(--nefera-ink))]">{user?.name ?? ''}</div>
          <Divider className="my-3" />
          <div className="text-sm font-semibold text-[rgb(var(--nefera-muted))]">Role</div>
          <div className="text-sm font-extrabold text-[rgb(var(--nefera-ink))]">{user?.role.toUpperCase()}</div>
        </CardBody>
      </Card>
    </Page>
  )
}

function PrincipalDashboard() {
  const { state } = useNefera()
  const { user } = useAuth()
  const [reports, setReports] = useState<any[]>([])
  const [riskZones, setRiskZones] = useState<{ green: number; orange: number; red: number; crisis: number } | null>(null)

  useEffect(() => {
    getPrincipalDashboard()
      .then((data) => setRiskZones(data?.risk_zones ?? null))
      .catch(console.error)
    getPrincipalReports()
      .then(setReports)
      .catch(console.error)
  }, [])

  const fallbackReports = state.principal.reports
  const safeReports = reports.length ? reports : fallbackReports
  const fallbackFlagged = state.teacher.students.filter((s) => s.flags !== 'none').length
  const flagged = riskZones ? (riskZones.orange + riskZones.red + riskZones.crisis) : fallbackFlagged

  return (
    <Page emoji="🏫" title={`Welcome, ${user?.name ?? 'Principal'}`} subtitle="School-wide insight and reporting.">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader emoji="📈" title="Overview" subtitle="High-level signals for the week." />
          <CardBody className="grid gap-3 md:grid-cols-2">
            <StatPill emoji="🚩" label="Flagged" value={`${flagged}`} />
            <StatPill emoji="🛡️" label="Reports" value={`${safeReports.length}`} />
            <StatPill emoji="🟢" label="Resolved" value={`${safeReports.filter((r) => r.status === 'resolved').length}`} />
            <StatPill emoji="🟡" label="In review" value={`${safeReports.filter((r) => r.status !== 'resolved').length}`} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader emoji="⚡" title="Quick actions" subtitle="Communicate and review reports." />
          <CardBody className="flex flex-wrap items-center gap-2">
            <Link to="/principal/reports">
              <Button>View reports 🧾</Button>
            </Link>
            <Link to="/principal/broadcast">
              <Button variant="secondary">Broadcast 📣</Button>
            </Link>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader emoji="🛡️" title="Latest reports" subtitle="Newest items first." />
        <CardBody className="grid gap-2">
          {safeReports.slice(0, 6).map((r) => (
            <div key={r.id} className="rounded-2xl border border-white/70 bg-white/60 p-4 shadow-lg shadow-black/5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-extrabold text-[rgb(var(--nefera-ink))]">{r.type ?? r.incident_type}</div>
                <Badge tone={r.status === 'resolved' ? 'ok' : r.status === 'reviewing' ? 'warn' : 'neutral'}>{r.status}</Badge>
              </div>
              <div className="mt-1 text-xs font-semibold text-[rgb(var(--nefera-muted))]">{formatShort(r.createdAt ?? r.created_at)}</div>
              <div className="mt-2 text-sm text-[rgb(var(--nefera-muted))] whitespace-pre-wrap">{r.description}</div>
            </div>
          ))}
          {safeReports.length === 0 ? (
            <div className="rounded-2xl border border-white/70 bg-white/60 p-4 text-sm text-[rgb(var(--nefera-muted))]">
              No reports yet.
            </div>
          ) : null}
        </CardBody>
      </Card>
    </Page>
  )
}

function PrincipalBroadcast() {
  const { dispatch } = useNefera()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [toast, setToast] = useState(false)
  const canSend = !!title.trim() && !!body.trim()

  async function onSend() {
    const createdAt = new Date().toISOString()
    const content = `${title.trim()}\n\n${body.trim()}`
    try {
      await sendPrincipalBroadcast(content)
      dispatch({ type: 'principal/addBroadcast', item: { id: makeId('pr_brd'), createdAt, title: title.trim(), body: body.trim() } })
      setToast(true)
      window.setTimeout(() => navigate('/principal/dashboard', { replace: true }), 250)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <Page emoji="📣" title="Broadcast" subtitle="Send a school-wide message.">
      <Card>
        <CardBody className="space-y-3">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextArea label="Message" value={body} onChange={(e) => setBody(e.target.value)} inputClassName="min-h-40" />
          <Divider />
          <div className="hidden justify-end gap-2 md:flex">
            <Button variant="ghost" onClick={() => navigate('/principal/dashboard')}>
              Cancel
            </Button>
            <Button disabled={!canSend} onClick={onSend}>
              Send
            </Button>
          </div>
        </CardBody>
      </Card>
      <div className="fixed inset-x-0 bottom-[88px] z-40 md:hidden">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-lg shadow-black/10 backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={() => navigate('/principal/dashboard')}>
                Cancel
              </Button>
              <Button className="min-w-28" disabled={!canSend} onClick={onSend}>
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Toast open={toast} message="Broadcast sent." onClose={() => setToast(false)} />
    </Page>
  )
}

function PrincipalProfile() {
  const { user } = useAuth()
  return (
    <Page emoji="🙋" title="Profile" subtitle="Your account details.">
      <Card>
        <CardBody className="space-y-2">
          <div className="text-sm font-semibold text-[rgb(var(--nefera-muted))]">Name</div>
          <div className="text-lg font-extrabold text-[rgb(var(--nefera-ink))]">{user?.name ?? ''}</div>
          <Divider className="my-3" />
          <div className="text-sm font-semibold text-[rgb(var(--nefera-muted))]">Role</div>
          <div className="text-sm font-extrabold text-[rgb(var(--nefera-ink))]">{user?.role.toUpperCase()}</div>
        </CardBody>
      </Card>
    </Page>
  )
}

const LazyStudentReports = React.lazy(() => import('./student.lazy').then((m) => ({ default: m.StudentReports })))
const LazyStudentOpenCircle = React.lazy(() => import('./student.lazy').then((m) => ({ default: m.StudentOpenCircle })))
const LazyCounselorStudentDetail = React.lazy(() => import('./counselor.lazy').then((m) => ({ default: m.CounselorStudentDetail })))
const LazyCounselorAssessmentPhq9 = React.lazy(() => import('./counselor.lazy').then((m) => ({ default: m.CounselorAssessmentPhq9 })))
const LazyCounselorAssessmentGad7 = React.lazy(() => import('./counselor.lazy').then((m) => ({ default: m.CounselorAssessmentGad7 })))
const LazyCounselorAssessmentCssrs = React.lazy(() => import('./counselor.lazy').then((m) => ({ default: m.CounselorAssessmentCssrs })))
const LazyPrincipalReports = React.lazy(() => import('./principal.lazy').then((m) => ({ default: m.PrincipalReports })))

function LazyBoundary({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="p-4 md:p-6">
          <Card>
            <CardBody className="animate-pulse space-y-3">
              <div className="h-5 w-44 rounded-full bg-black/10" />
              <div className="h-4 w-72 rounded-full bg-black/10" />
              <div className="h-32 w-full rounded-2xl border border-white/70 bg-white/55" />
            </CardBody>
          </Card>
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

export function NeferaRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RoleEntry />} />
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/role" element={<RoleSelectPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/student" element={<RequireAuth role="student"><Navigate to="/student/dashboard" replace /></RequireAuth>} />
        <Route path="/student/dashboard" element={<RequireAuth role="student"><StudentDashboard /></RequireAuth>} />
        <Route path="/student/check-in" element={<RequireAuth role="student"><StudentCheckInEntry /></RequireAuth>} />
        <Route path="/student/check-in/:feeling" element={<RequireAuth role="student"><StudentCheckInFlow /></RequireAuth>} />
        <Route path="/student/sleep" element={<RequireAuth role="student"><StudentSleepTracker /></RequireAuth>} />

        <Route path="/student/journal/write" element={<RequireAuth role="student"><StudentJournalWrite /></RequireAuth>} />
        <Route path="/student/journal/past" element={<RequireAuth role="student"><StudentJournalPast /></RequireAuth>} />
        <Route path="/student/journal/history" element={<RequireAuth role="student"><StudentJournalPast /></RequireAuth>} />
        <Route path="/student/journal/gratitude" element={<RequireAuth role="student"><StudentGratitude /></RequireAuth>} />
        <Route path="/student/reports" element={<RequireAuth role="student"><LazyBoundary><LazyStudentReports /></LazyBoundary></RequireAuth>} />
        <Route path="/student/habits" element={<RequireAuth role="student"><StudentHabits /></RequireAuth>} />
        <Route path="/student/soul-space" element={<RequireAuth role="student"><StudentSoulSpace /></RequireAuth>} />
        <Route path="/student/ai" element={<RequireAuth role="student"><StudentAICompanion /></RequireAuth>} />
        <Route path="/student/groups" element={<RequireAuth role="student"><StudentGroups /></RequireAuth>} />
        <Route path="/student/inbox" element={<RequireAuth role="student"><StudentInbox /></RequireAuth>} />
        <Route path="/student/open-circle" element={<RequireAuth role="student"><LazyBoundary><LazyStudentOpenCircle /></LazyBoundary></RequireAuth>} />
        <Route path="/student/report-incident" element={<RequireAuth role="student"><StudentReportIncident /></RequireAuth>} />
        <Route path="/student/help-batchmates" element={<RequireAuth role="student"><StudentHelpBatchmates /></RequireAuth>} />
        <Route path="/student/profile" element={<RequireAuth role="student"><StudentProfile /></RequireAuth>} />

        <Route path="/teacher" element={<RequireAuth role="teacher"><Navigate to="/teacher/dashboard" replace /></RequireAuth>} />
        <Route path="/teacher/dashboard" element={<RequireAuth role="teacher"><TeacherDashboard /></RequireAuth>} />
        <Route path="/teacher/broadcast" element={<RequireAuth role="teacher"><TeacherBroadcast /></RequireAuth>} />
        <Route path="/teacher/students" element={<RequireAuth role="teacher"><TeacherStudents /></RequireAuth>} />
        <Route path="/teacher/students/:id" element={<RequireAuth role="teacher"><TeacherObservationChecklist /></RequireAuth>} />
        <Route path="/teacher/profile" element={<RequireAuth role="teacher"><TeacherProfile /></RequireAuth>} />

        <Route path="/parent" element={<RequireAuth role="parent"><Navigate to="/parent/dashboard" replace /></RequireAuth>} />
        <Route path="/parent/dashboard" element={<RequireAuth role="parent"><ParentDashboard /></RequireAuth>} />
        <Route path="/parent/message" element={<RequireAuth role="parent"><ParentMessage /></RequireAuth>} />
        <Route path="/parent/checklist" element={<RequireAuth role="parent"><ParentObservationChecklist /></RequireAuth>} />
        <Route path="/parent/report-incident" element={<RequireAuth role="parent"><ParentReportIncident /></RequireAuth>} />
        <Route path="/parent/profile" element={<RequireAuth role="parent"><ParentProfile /></RequireAuth>} />

        <Route path="/counselor" element={<RequireAuth role="counselor"><Navigate to="/counselor/dashboard" replace /></RequireAuth>} />
        <Route path="/counselor/dashboard" element={<RequireAuth role="counselor"><CounselorDashboard /></RequireAuth>} />
        <Route path="/counselor/flags" element={<RequireAuth role="counselor"><CounselorFlags /></RequireAuth>} />
        <Route path="/counselor/students" element={<RequireAuth role="counselor"><CounselorStudents /></RequireAuth>} />
        <Route path="/counselor/students/:id" element={<RequireAuth role="counselor"><LazyBoundary><LazyCounselorStudentDetail /></LazyBoundary></RequireAuth>} />
        <Route path="/counselor/assessments/phq9" element={<RequireAuth role="counselor"><LazyBoundary><LazyCounselorAssessmentPhq9 /></LazyBoundary></RequireAuth>} />
        <Route path="/counselor/assessments/gad7" element={<RequireAuth role="counselor"><LazyBoundary><LazyCounselorAssessmentGad7 /></LazyBoundary></RequireAuth>} />
        <Route path="/counselor/assessments/cssrs" element={<RequireAuth role="counselor"><LazyBoundary><LazyCounselorAssessmentCssrs /></LazyBoundary></RequireAuth>} />
        <Route path="/counselor/crisis-actions" element={<RequireAuth role="counselor"><CounselorCrisisActions /></RequireAuth>} />
        <Route path="/counselor/broadcast" element={<RequireAuth role="counselor"><CounselorBroadcast /></RequireAuth>} />
        <Route path="/counselor/profile" element={<RequireAuth role="counselor"><CounselorProfile /></RequireAuth>} />

        <Route path="/principal" element={<RequireAuth role="principal"><Navigate to="/principal/dashboard" replace /></RequireAuth>} />
        <Route path="/principal/dashboard" element={<RequireAuth role="principal"><PrincipalDashboard /></RequireAuth>} />
        <Route path="/principal/reports" element={<RequireAuth role="principal"><LazyBoundary><LazyPrincipalReports /></LazyBoundary></RequireAuth>} />
        <Route path="/principal/broadcast" element={<RequireAuth role="principal"><PrincipalBroadcast /></RequireAuth>} />
        <Route path="/principal/profile" element={<RequireAuth role="principal"><PrincipalProfile /></RequireAuth>} />
      </Route>

      <Route path="*" element={<Navigate to="/welcome" replace />} />
    </Routes>
  )
}
