import { submitAssessment } from '../api'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useNefera } from './state'
import { Badge, Button, Card, CardBody, CardHeader, Page, Select, Toast, cx } from './ui'

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

export function CounselorAssessmentPhq9() {
  const { state, dispatch } = useNefera()
  const navigate = useNavigate()
  const students = state.counselor.students
  const [studentId, setStudentId] = useState<string>(students[0]?.id ?? '')
  const selected = students.find((s) => s.id === studentId) ?? students[0]
  const [answers, setAnswers] = useState<number[]>(selected?.phq9?.answers ?? Array.from({ length: 9 }, () => 0))
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

  await submitAssessment({
    type: "PHQ9",
    answers,
  });

  dispatch({ type: 'counselor/savePhq9', studentId: selected?.id ?? 's_1', answers, createdAt })

  setToast(true)
}

  return (
    <Page emoji="📋" title="PHQ-9" subtitle="Score and save a student questionnaire.">
      <Card>
        <CardBody className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">Student</div>
            <div className="mt-1">
              <Select
                value={selected?.id ?? ''}
                onChange={(v) => {
                  setStudentId(v)
                  const next = students.find((s) => s.id === v)
                  setAnswers(next?.phq9?.answers ?? Array.from({ length: 9 }, () => 0))
                }}
                options={students.map((s) => ({ value: s.id, label: `${s.name} • ${s.grade}` }))}
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
              <Select value={String(answers[idx] ?? 0)} onChange={(v) => setAnswers((arr) => arr.map((x, i) => (i === idx ? Number(v) : x)))} options={scaleOptions} />
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
  const { state, dispatch } = useNefera()
  const navigate = useNavigate()
  const students = state.counselor.students
  const [studentId, setStudentId] = useState<string>(students[0]?.id ?? '')
  const selected = students.find((s) => s.id === studentId) ?? students[0]
  const [answers, setAnswers] = useState<number[]>(selected?.gad7?.answers ?? Array.from({ length: 7 }, () => 0))
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

  await submitAssessment({
    type: "GAD7",
    answers,
  });

  dispatch({ type: 'counselor/saveGad7', studentId: selected?.id ?? 's_1', answers, createdAt })

  setToast(true)
}

  return (
    <Page emoji="🧭" title="GAD-7" subtitle="Score and save a student questionnaire.">
      <Card>
        <CardBody className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">Student</div>
            <div className="mt-1">
              <Select
                value={selected?.id ?? ''}
                onChange={(v) => {
                  setStudentId(v)
                  const next = students.find((s) => s.id === v)
                  setAnswers(next?.gad7?.answers ?? Array.from({ length: 7 }, () => 0))
                }}
                options={students.map((s) => ({ value: s.id, label: `${s.name} • ${s.grade}` }))}
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
              <Select value={String(answers[idx] ?? 0)} onChange={(v) => setAnswers((arr) => arr.map((x, i) => (i === idx ? Number(v) : x)))} options={scaleOptions} />
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
  const { state, dispatch } = useNefera()
  const navigate = useNavigate()
  const students = state.counselor.students
  const [studentId, setStudentId] = useState<string>(students[0]?.id ?? '')
  const selected = students.find((s) => s.id === studentId) ?? students[0]
  const [answers, setAnswers] = useState<boolean[]>(selected?.cssrs?.answers ?? Array.from({ length: 6 }, () => false))
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

  await submitAssessment({
    type: "CSSRS",
    answers: answers.map(a => a ? 1 : 0),
  });

  dispatch({ type: 'counselor/saveCssrs', studentId: selected?.id ?? 's_1', answers, createdAt })

  setToast(true)
}

  return (
    <Page emoji="🛟" title="C-SSRS" subtitle="Record and save suicide risk screening responses.">
      <Card>
        <CardBody className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">Student</div>
            <div className="mt-1">
              <Select
                value={selected?.id ?? ''}
                onChange={(v) => {
                  setStudentId(v)
                  const next = students.find((s) => s.id === v)
                  setAnswers(next?.cssrs?.answers ?? Array.from({ length: 6 }, () => false))
                }}
                options={students.map((s) => ({ value: s.id, label: `${s.name} • ${s.grade}` }))}
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
            onClick={() => setAnswers((arr) => arr.map((x, i) => (i === idx ? !x : x)))}
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
  const [toast, setToast] = useState(false)

  const [phq9, setPhq9] = useState<number[]>(student?.phq9?.answers ?? Array.from({ length: 9 }, () => 0))
  const [gad7, setGad7] = useState<number[]>(student?.gad7?.answers ?? Array.from({ length: 7 }, () => 0))
  const [cssrs, setCssrs] = useState<boolean[]>(student?.cssrs?.answers ?? Array.from({ length: 6 }, () => false))

  if (!student) {
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

  const studentId = student.id

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

  return (
    <Page emoji="🧑‍🎓" title={student.name} subtitle="Questionnaires and follow-up planning.">
      <Card>
        <CardBody className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">Grade</div>
            <div className="text-sm font-extrabold text-[rgb(var(--nefera-ink))]">{student.grade}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={flagTone(student.flags)}>{flagLabel(student.flags)}</Badge>
            <Select
              value={student.flags}
              onChange={(v) => dispatch({ type: 'teacher/setStudentFlags', studentId: student.id, flags: v as 'orange' | 'red' | 'crisis' | 'none' })}
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

      <div className="mt-4 grid gap-4">
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
