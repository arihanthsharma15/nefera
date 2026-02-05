import { getCounselorClasses, getCounselorStudents, getCounselorStudentDetail, submitCounselorAssessment } from '../api'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useNefera } from './state'
import { Badge, Button, Card, CardBody, CardHeader, Page, Select, Toast, cx } from './ui'

type CounselorStudentItem = {
  id: string
  name: string
  class_name?: string
  risk_status?: string
  phq9?: { answers: number[] }
  gad7?: { answers: number[] }
  cssrs?: { answers: boolean[] }
}

type CounselorStudentRow = {
  id: string | number
  name?: string | null
  email?: string | null
  class_name?: string | null
  risk_status?: string | null
}

function useCounselorClassStudents() {
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([])
  const [classId, setClassId] = useState<number | null>(null)
  const [students, setStudents] = useState<CounselorStudentItem[]>([])

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
      return
    }
    getCounselorStudents(classId)
      .then((rows) => {
        const list = (rows ?? []).map((s: CounselorStudentRow) => ({
          id: String(s.id),
          name: s.name || s.email || 'Student',
          class_name: s.class_name || 'Class',
          risk_status: s.risk_status,
        }))
        setStudents(list)
      })
      .catch(console.error)
  }, [classId])

  return { classes, classId, setClassId, students }
}

function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0)
}

function flagTone(flag: 'orange' | 'red' | 'crisis' | 'none') {
  switch (flag) {
    case 'none':
      return 'neutral'
    case 'orange':
      return 'warn'
    case 'red':
      return 'danger'
    case 'crisis':
      return 'danger'
  }
}

function flagLabel(flag: 'orange' | 'red' | 'crisis' | 'none') {
  switch (flag) {
    case 'none':
      return 'No flag'
    case 'orange':
      return 'Watch'
    case 'red':
      return 'High'
    case 'crisis':
      return 'Crisis'
  }
}

function riskToFlag(risk?: string): 'orange' | 'red' | 'crisis' | 'none' {
  if (!risk) return 'none'
  const upper = risk.toUpperCase()
  if (upper === 'ORANGE') return 'orange'
  if (upper === 'RED') return 'red'
  if (upper === 'CRISIS') return 'crisis'
  return 'none'
}

export function CounselorAssessmentPhq9() {
  const { dispatch } = useNefera()
  const navigate = useNavigate()
  const { classes, classId, setClassId, students } = useCounselorClassStudents()
  const [studentId, setStudentId] = useState<string>('')
  const [answersByStudent, setAnswersByStudent] = useState<Record<string, number[]>>({})
  const selectedId = studentId && students.find((s) => s.id === studentId) ? studentId : students[0]?.id ?? ''
  const selected = students.find((s) => s.id === selectedId)
  const answers = answersByStudent[selectedId] ?? selected?.phq9?.answers ?? Array.from({ length: 9 }, () => 0)
  const [toast, setToast] = useState(false)

  const scaleOptions = [
    { value: '0', label: '0' },
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
  ]

  const items = [
    'Little interest or pleasure in doing things',
    'Feeling down, depressed, or hopeless',
    'Trouble falling or staying asleep, or sleeping too much',
    'Feeling tired or having little energy',
    'Poor appetite or overeating',
    'Feeling bad about yourself',
    'Trouble concentrating on things',
    'Moving or speaking slowly, or being fidgety/restless',
    'Thoughts of self-harm or that you would be better off dead',
  ]

  const total = sum(answers)

  async function onSave() {
    const createdAt = new Date().toISOString()

    if (!selectedId) return

    await submitCounselorAssessment({
      student_id: selectedId,
      type: "PHQ9",
      answers,
    })

    dispatch({ type: 'counselor/savePhq9', studentId: selectedId, answers, createdAt })

    setToast(true)
  }

  return (
    <Page emoji="📋" title="PHQ-9" subtitle="Score and save a student questionnaire.">
      <Card>
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
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">Student</div>
            <div className="mt-1">
              <Select
                value={selectedId}
                onChange={(v) => {
                  setStudentId(v)
                  const next = students.find((s) => s.id === v)
                  setAnswersByStudent((prev) => ({
                    ...prev,
                    [v]: next?.phq9?.answers ?? Array.from({ length: 9 }, () => 0),
                  }))
                }}
                options={students.map((s) => ({ value: s.id, label: `${s.name} • ${s.class_name ?? 'Class'}` }))}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Total: {total}</Badge>
            <Button variant="secondary" onClick={() => navigate('/counselor/dashboard')}>
              Back
            </Button>
          </div>
        </CardBody>
      </Card>

      <div className="mt-4 grid gap-3">
        {items.map((q, idx) => (
          <div key={q} className="rounded-2xl border border-white/70 bg-white/60 p-4">
            <div className="text-sm font-semibold text-[rgb(var(--nefera-ink))]">{q}</div>
            <div className="mt-3">
              <Select
                value={String(answers[idx] ?? 0)}
                onChange={(v) => {
                  if (!selectedId) return
                  setAnswersByStudent((prev) => {
                    const current = prev[selectedId] ?? selected?.phq9?.answers ?? Array.from({ length: 9 }, () => 0)
                    const next = current.map((x, i) => (i === idx ? Number(v) : x))
                    return { ...prev, [selectedId]: next }
                  })
                }}
                options={scaleOptions}
              />
            </div>
          </div>
        ))}
        <div className="hidden justify-end md:flex">
          <Button onClick={onSave}>Save PHQ-9</Button>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[88px] z-40 md:hidden">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-lg shadow-black/10 backdrop-blur">
            <div className="flex items-center justify-end gap-2">
              <Button className="min-w-40" onClick={onSave}>
                Save PHQ-9
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Toast open={toast} message="Saved PHQ-9." onClose={() => setToast(false)} />
    </Page>
  )
}

export function CounselorAssessmentGad7() {
  const { dispatch } = useNefera()
  const navigate = useNavigate()
  const { classes, classId, setClassId, students } = useCounselorClassStudents()
  const [studentId, setStudentId] = useState<string>('')
  const [answersByStudent, setAnswersByStudent] = useState<Record<string, number[]>>({})
  const selectedId = studentId && students.find((s) => s.id === studentId) ? studentId : students[0]?.id ?? ''
  const selected = students.find((s) => s.id === selectedId)
  const answers = answersByStudent[selectedId] ?? selected?.gad7?.answers ?? Array.from({ length: 7 }, () => 0)
  const [toast, setToast] = useState(false)

  const scaleOptions = [
    { value: '0', label: '0' },
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
  ]

  const items = [
    'Feeling nervous, anxious, or on edge',
    'Not being able to stop or control worrying',
    'Worrying too much about different things',
    'Trouble relaxing',
    'Being so restless that it is hard to sit still',
    'Becoming easily annoyed or irritable',
    'Feeling afraid as if something awful might happen',
  ]

  const total = sum(answers)

  async function onSave() {
    const createdAt = new Date().toISOString()

    if (!selectedId) return

    await submitCounselorAssessment({
      student_id: selectedId,
      type: "GAD7",
      answers,
    })

    dispatch({ type: 'counselor/saveGad7', studentId: selectedId, answers, createdAt })

    setToast(true)
  }

  return (
    <Page emoji="🧭" title="GAD-7" subtitle="Score and save a student questionnaire.">
      <Card>
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
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">Student</div>
            <div className="mt-1">
              <Select
                value={selectedId}
                onChange={(v) => {
                  setStudentId(v)
                  const next = students.find((s) => s.id === v)
                  setAnswersByStudent((prev) => ({
                    ...prev,
                    [v]: next?.gad7?.answers ?? Array.from({ length: 7 }, () => 0),
                  }))
                }}
                options={students.map((s) => ({ value: s.id, label: `${s.name} • ${s.class_name ?? 'Class'}` }))}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Total: {total}</Badge>
            <Button variant="secondary" onClick={() => navigate('/counselor/dashboard')}>
              Back
            </Button>
          </div>
        </CardBody>
      </Card>

      <div className="mt-4 grid gap-3">
        {items.map((q, idx) => (
          <div key={q} className="rounded-2xl border border-white/70 bg-white/60 p-4">
            <div className="text-sm font-semibold text-[rgb(var(--nefera-ink))]">{q}</div>
            <div className="mt-3">
              <Select
                value={String(answers[idx] ?? 0)}
                onChange={(v) => {
                  if (!selectedId) return
                  setAnswersByStudent((prev) => {
                    const current = prev[selectedId] ?? selected?.gad7?.answers ?? Array.from({ length: 7 }, () => 0)
                    const next = current.map((x, i) => (i === idx ? Number(v) : x))
                    return { ...prev, [selectedId]: next }
                  })
                }}
                options={scaleOptions}
              />
            </div>
          </div>
        ))}
        <div className="hidden justify-end md:flex">
          <Button onClick={onSave}>Save GAD-7</Button>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[88px] z-40 md:hidden">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-lg shadow-black/10 backdrop-blur">
            <div className="flex items-center justify-end gap-2">
              <Button className="min-w-40" onClick={onSave}>
                Save GAD-7
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Toast open={toast} message="Saved GAD-7." onClose={() => setToast(false)} />
    </Page>
  )
}

export function CounselorAssessmentCssrs() {
  const { dispatch } = useNefera()
  const navigate = useNavigate()
  const { classes, classId, setClassId, students } = useCounselorClassStudents()
  const [studentId, setStudentId] = useState<string>('')
  const [answersByStudent, setAnswersByStudent] = useState<Record<string, boolean[]>>({})
  const selectedId = studentId && students.find((s) => s.id === studentId) ? studentId : students[0]?.id ?? ''
  const selected = students.find((s) => s.id === selectedId)
  const answers = answersByStudent[selectedId] ?? selected?.cssrs?.answers ?? Array.from({ length: 6 }, () => false)
  const [toast, setToast] = useState(false)

  const items = [
    'Wish to be dead',
    'Non-specific active thoughts of suicide',
    'Active thoughts with any methods',
    'Active thoughts with some intent',
    'Active thoughts with intent and plan',
    'Suicidal behavior',
  ]

  const positive = answers.filter(Boolean).length

  async function onSave() {
    const createdAt = new Date().toISOString()

    if (!selectedId) return

    await submitCounselorAssessment({
      student_id: selectedId,
      type: "CSSRS",
      answers: answers.map((a) => (a ? 1 : 0)),
    })

    dispatch({ type: 'counselor/saveCssrs', studentId: selectedId, answers, createdAt })

    setToast(true)
  }

  return (
    <Page emoji="🛟" title="C-SSRS" subtitle="Record and save suicide risk screening responses.">
      <Card>
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
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">Student</div>
            <div className="mt-1">
              <Select
                value={selectedId}
                onChange={(v) => {
                  setStudentId(v)
                  const next = students.find((s) => s.id === v)
                  setAnswersByStudent((prev) => ({
                    ...prev,
                    [v]: next?.cssrs?.answers ?? Array.from({ length: 6 }, () => false),
                  }))
                }}
                options={students.map((s) => ({ value: s.id, label: `${s.name} • ${s.class_name ?? 'Class'}` }))}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{positive} positive</Badge>
            <Button variant="secondary" onClick={() => navigate('/counselor/dashboard')}>
              Back
            </Button>
          </div>
        </CardBody>
      </Card>

      <div className="mt-4 grid gap-2">
        {items.map((q, idx) => (
          <button
            key={q}
            type="button"
            onClick={() => {
              if (!selectedId) return
              setAnswersByStudent((prev) => {
                const current = prev[selectedId] ?? selected?.cssrs?.answers ?? Array.from({ length: 6 }, () => false)
                const next = current.map((x, i) => (i === idx ? !x : x))
                return { ...prev, [selectedId]: next }
              })
            }}
            className={cx(
              'flex items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/60 p-4 text-left shadow-lg shadow-black/5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-xl active:translate-y-0',
              answers[idx] ? 'ring-4 ring-[rgba(244,63,94,0.14)]' : '',
            )}
          >
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[rgb(var(--nefera-ink))]">{q}</div>
            </div>
            <Badge tone={answers[idx] ? 'danger' : 'neutral'}>{answers[idx] ? 'Yes' : 'No'}</Badge>
          </button>
        ))}
        <div className="hidden justify-end md:flex">
          <Button onClick={onSave}>Save C-SSRS</Button>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[88px] z-40 md:hidden">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-lg shadow-black/10 backdrop-blur">
            <div className="flex items-center justify-end gap-2">
              <Button className="min-w-40" onClick={onSave}>
                Save C-SSRS
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Toast open={toast} message="Saved C-SSRS." onClose={() => setToast(false)} />
    </Page>
  )
}

export function CounselorStudentDetail() {
  const { state, dispatch } = useNefera()
  const params = useParams()
  const navigate = useNavigate()
  const student = state.counselor.students.find((s) => s.id === params.id)
  const [studentData, setStudentData] = useState<{
    id: string
    name: string
    grade: string
    flags: 'orange' | 'red' | 'crisis' | 'none'
    phone?: string | null
    parents?: Array<{ id: number | string; name?: string | null; email?: string | null; phone?: string | null }>
    recent_moods?: Array<{ id: number | string; date: string; mood?: string | null; sleep_hours?: number | null }>
  } | null>(student ? { id: student.id, name: student.name, grade: student.grade, flags: student.flags } : null)
  const [toast, setToast] = useState(false)

  const [phq9, setPhq9] = useState<number[]>(student?.phq9?.answers ?? Array.from({ length: 9 }, () => 0))
  const [gad7, setGad7] = useState<number[]>(student?.gad7?.answers ?? Array.from({ length: 7 }, () => 0))
  const [cssrs, setCssrs] = useState<boolean[]>(student?.cssrs?.answers ?? Array.from({ length: 6 }, () => false))

  useEffect(() => {
    if (studentData || !params.id) return
    getCounselorStudentDetail(params.id)
      .then((data) => {
        if (!data) return
        setStudentData({
          id: String(data.id),
          name: data.name || data.email || 'Student',
          grade: data.class_name || 'Class',
          flags: riskToFlag(data.risk_status),
          phone: data.phone,
          parents: data.parents ?? [],
          recent_moods: data.recent_moods ?? [],
        })
        setPhq9(Array.from({ length: 9 }, () => 0))
        setGad7(Array.from({ length: 7 }, () => 0))
        setCssrs(Array.from({ length: 6 }, () => false))
      })
      .catch(console.error)
  }, [params.id, studentData])

  if (!student && !studentData) {
    return (
      <Page emoji="🧑‍🎓" title="Student" subtitle="Not found.">
        <Card>
          <CardBody className="flex items-center justify-between gap-3">
            <div className="text-sm text-[rgb(var(--nefera-muted))]">Student not found.</div>
            <Button variant="secondary" onClick={() => navigate('/counselor/flags', { replace: true })}>
              Back
            </Button>
          </CardBody>
        </Card>
      </Page>
    )
  }

  const studentId = student?.id ?? studentData?.id ?? ''

  function onSave() {
    const createdAt = new Date().toISOString()
    dispatch({ type: 'counselor/savePhq9', studentId, answers: phq9, createdAt })
    dispatch({ type: 'counselor/saveGad7', studentId, answers: gad7, createdAt })
    dispatch({ type: 'counselor/saveCssrs', studentId, answers: cssrs, createdAt })
    setToast(true)
  }

  const scaleOptions = [
    { value: '0', label: '0' },
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
  ]

  const phq9Items = [
    'Little interest or pleasure in doing things',
    'Feeling down, depressed, or hopeless',
    'Trouble falling or staying asleep, or sleeping too much',
    'Feeling tired or having little energy',
    'Poor appetite or overeating',
    'Feeling bad about yourself',
    'Trouble concentrating on things',
    'Moving or speaking slowly, or being fidgety/restless',
    'Thoughts of self-harm or that you would be better off dead',
  ]

  const gad7Items = [
    'Feeling nervous, anxious, or on edge',
    'Not being able to stop or control worrying',
    'Worrying too much about different things',
    'Trouble relaxing',
    'Being so restless that it is hard to sit still',
    'Becoming easily annoyed or irritable',
    'Feeling afraid as if something awful might happen',
  ]

  const cssrsItems = [
    'Wish to be dead',
    'Non-specific active thoughts of suicide',
    'Active thoughts with any methods',
    'Active thoughts with some intent',
    'Active thoughts with intent and plan',
    'Suicidal behavior',
  ]

  const display = studentData ?? student
  const recentMoods =
    display && 'recent_moods' in display ? display.recent_moods : undefined

  return (
    <Page emoji="🧑‍🎓" title={display?.name ?? 'Student'} subtitle="Questionnaires and follow-up planning.">
      <Card>
        <CardBody className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">Grade</div>
            <div className="text-sm font-extrabold text-[rgb(var(--nefera-ink))]">{display?.grade ?? 'Class'}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={flagTone(display?.flags ?? 'none')}>{flagLabel(display?.flags ?? 'none')}</Badge>
            <Select
              value={display?.flags ?? 'none'}
              onChange={(v) => setStudentData((prev) => (prev ? { ...prev, flags: v as 'orange' | 'red' | 'crisis' | 'none' } : prev))}
              options={[
                { value: 'none', label: 'None' },
                { value: 'orange', label: 'Watch' },
                { value: 'red', label: 'High' },
                { value: 'crisis', label: 'Crisis' },
              ]}
            />
            <Button variant="secondary" onClick={() => navigate('/counselor/flags')}>
              Back
            </Button>
          </div>
        </CardBody>
      </Card>

      <div className="mt-4 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader emoji="📞" title="Contact info" subtitle="For urgent follow-up if needed." />
          <CardBody className="space-y-3">
            <div className="rounded-2xl border border-white/70 bg-white/60 p-4">
              <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">Student phone</div>
              <div className="mt-1 text-sm font-extrabold text-[rgb(var(--nefera-ink))]">
                {display?.phone || 'Not available'}
              </div>
            </div>
            {display?.parents?.length ? (
              <div className="space-y-2">
                {display.parents.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-white/70 bg-white/60 p-4">
                    <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">Parent/Guardian</div>
                    <div className="mt-1 text-sm font-extrabold text-[rgb(var(--nefera-ink))]">{p.name || 'Parent'}</div>
                    <div className="mt-1 text-xs text-[rgb(var(--nefera-muted))]">{p.email || 'No email'}</div>
                    <div className="mt-1 text-sm font-semibold text-[rgb(var(--nefera-ink))]">{p.phone || 'No phone'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/70 bg-white/60 p-4 text-sm text-[rgb(var(--nefera-muted))]">
                No parent contact linked yet.
              </div>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader emoji="📅" title="Recent moods" subtitle="Last 14 days (from check-ins)." />
          <CardBody className="space-y-2">
            {recentMoods?.length ? (
              recentMoods.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/60 px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-[rgb(var(--nefera-ink))]">{m.mood || '—'}</div>
                    <div className="text-xs text-[rgb(var(--nefera-muted))]">{new Date(m.date).toLocaleString()}</div>
                  </div>
                  <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">
                    {typeof m.sleep_hours === 'number' ? `${m.sleep_hours}h sleep` : 'sleep —'}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-white/70 bg-white/60 p-4 text-sm text-[rgb(var(--nefera-muted))]">
                No check-ins yet.
              </div>
            )}
          </CardBody>
        </Card>
        <div className="grid gap-4">
        <Card>
          <CardHeader emoji="📋" title="PHQ-9" subtitle={`Total: ${sum(phq9)}`} />
          <CardBody className="grid gap-3">
            {phq9Items.map((q, idx) => (
              <div key={q} className="rounded-2xl border border-white/70 bg-white/60 p-4">
                <div className="text-sm font-semibold text-[rgb(var(--nefera-ink))]">{q}</div>
                <div className="mt-3">
                  <Select value={String(phq9[idx] ?? 0)} onChange={(v) => setPhq9((arr) => arr.map((x, i) => (i === idx ? Number(v) : x)))} options={scaleOptions} />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader emoji="🧭" title="GAD-7" subtitle={`Total: ${sum(gad7)}`} />
          <CardBody className="grid gap-3">
            {gad7Items.map((q, idx) => (
              <div key={q} className="rounded-2xl border border-white/70 bg-white/60 p-4">
                <div className="text-sm font-semibold text-[rgb(var(--nefera-ink))]">{q}</div>
                <div className="mt-3">
                  <Select value={String(gad7[idx] ?? 0)} onChange={(v) => setGad7((arr) => arr.map((x, i) => (i === idx ? Number(v) : x)))} options={scaleOptions} />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader emoji="🛟" title="C-SSRS" subtitle={`${cssrs.filter(Boolean).length} positive response${cssrs.filter(Boolean).length === 1 ? '' : 's'}`} />
          <CardBody className="grid gap-2">
            {cssrsItems.map((q, idx) => (
              <button
                key={q}
                type="button"
                onClick={() => setCssrs((arr) => arr.map((x, i) => (i === idx ? !x : x)))}
                className={cx(
                  'flex items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/60 p-4 text-left shadow-lg shadow-black/5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-xl active:translate-y-0',
                  cssrs[idx] ? 'ring-4 ring-[rgba(244,63,94,0.14)]' : '',
                )}
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[rgb(var(--nefera-ink))]">{q}</div>
                </div>
                <Badge tone={cssrs[idx] ? 'danger' : 'neutral'}>{cssrs[idx] ? 'Yes' : 'No'}</Badge>
              </button>
            ))}
          </CardBody>
        </Card>

          <div className="hidden justify-end md:flex">
            <Button onClick={onSave}>Save questionnaires</Button>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[88px] z-40 md:hidden">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-lg shadow-black/10 backdrop-blur">
            <div className="flex items-center justify-end gap-2">
              <Button className="min-w-40" onClick={onSave}>
                Save questionnaires
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Toast open={toast} message="Saved questionnaires." onClose={() => setToast(false)} />
    </Page>
  )
}
