import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react'


export type Role = 'student' | 'teacher' | 'parent' | 'counselor' | 'principal'
export type AgeGroup = '6-10' | '11-17'
export type Feeling = 'happy' | 'neutral' | 'flat' | 'worried' | 'sad'

export type User = {
  id: string
  name: string
  role: Role
}

export type StudentCheckIn = {
  id: string
  createdAt: string
  feeling: Feeling
  ageGroup: AgeGroup
  answers: Record<string, unknown>
}

export type JournalEntry = {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt?: number
  dateKey: string // YYYY-MM-DD
}

export type Habit = {
  id: string
  name: string
  emoji: string
  createdAt: string
  completedDates: string[]
}

export type Message = {
  id: string
  createdAt: string
  fromRole: Role
  fromName: string
  toRole: Role
  subject: string
  body: string
  readAt?: string
}

export type OpenCirclePost = {
  id: string
  createdAt: string
  authorName: string
  anonymous: boolean
  body: string
  likes: string[]
  comments: { id: string; createdAt: string; authorName: string; body: string }[]
}

export type IncidentReport = {
  id: string
  createdAt: string
  type: string
  description: string
  anonymous: boolean
  status: 'received' | 'reviewing' | 'resolved'
}

export type StudentRecord = {
  id: string
  name: string
  grade: string
  flags: 'orange' | 'red' | 'crisis' | 'none'
  latestFeeling?: Feeling
  phq9?: { answers: number[]; createdAt: string }
  gad7?: { answers: number[]; createdAt: string }
  cssrs?: { answers: boolean[]; createdAt: string }
  notes: string[]
}

export type NeferaState = {
  selectedRole?: Role
  user?: User

  student: {
    ageGroup?: AgeGroup
    checkIns: StudentCheckIn[]
    sleepLogs: { id: string; createdAt: string; hours: number; quality: number; notes: string }[]
    journal: JournalEntry[]
    habits: Habit[]
    groups: { id: string; name: string; emoji: string; joined: boolean }[]
    inbox: Message[]
    openCircle: OpenCirclePost[]
    incidents: IncidentReport[]
    lastPromptedJournalAt?: string
  }

  teacher: {
    classes: { id: string; name: string; studentIds: string[] }[]
    students: StudentRecord[]
    broadcasts: { id: string; createdAt: string; title: string; body: string }[]
  }

  parent: {
    children: { id: string; name: string; grade: string }[]
    sent: { id: string; createdAt: string; toChildId: string; body: string }[]
    reports: { id: string; createdAt: string; type: string; body: string }[]
  }

  counselor: {
    students: StudentRecord[]
    broadcasts: { id: string; createdAt: string; title: string; body: string }[]
    crisisActions: { id: string; createdAt: string; body: string; done: boolean }[]
  }

  principal: {
    broadcasts: { id: string; createdAt: string; title: string; body: string }[]
    reports: IncidentReport[]
  }
}

type Action =
  | { type: 'selectRole'; role: Role }
  | { type: 'login'; name: string; role: Role }
  | { type: 'logout' }
  | { type: 'student/setInbox'; inbox: Message[] }
  | { type: 'student/setAgeGroup'; ageGroup: AgeGroup }
  | { type: 'student/addCheckIn'; checkIn: StudentCheckIn }
  | { type: 'student/addSleepLog'; log: { id: string; createdAt: string; hours: number; quality: number; notes: string } }
  | { type: 'student/addJournal'; payload: JournalEntry }
  | { type: 'student/updateJournal'; payload: { id: string; title?: string; content?: string; updatedAt?: number } }
  | { type: 'student/toggleGroup'; groupId: string }
  | { type: 'student/markMessageRead'; messageId: string }
  | { type: 'student/addPost'; post: OpenCirclePost }
  | { type: 'student/toggleLikePost'; postId: string; userId: string }
  | { type: 'student/addComment'; postId: string; comment: OpenCirclePost['comments'][number] }
  | { type: 'student/addIncident'; incident: IncidentReport }
  | { type: 'student/addHabit'; habit: Habit }
  | { type: 'student/toggleHabitToday'; habitId: string; isoDate: string }
  | { type: 'teacher/addBroadcast'; item: { id: string; createdAt: string; title: string; body: string } }
  | { type: 'teacher/setStudentFlags'; studentId: string; flags: StudentRecord['flags'] }
  | { type: 'counselor/addBroadcast'; item: { id: string; createdAt: string; title: string; body: string } }
  | { type: 'counselor/savePhq9'; studentId: string; answers: number[]; createdAt: string }
  | { type: 'counselor/saveGad7'; studentId: string; answers: number[]; createdAt: string }
  | { type: 'counselor/saveCssrs'; studentId: string; answers: boolean[]; createdAt: string }
  | { type: 'counselor/toggleCrisisAction'; id: string }
  | { type: 'parent/sendMessage'; item: { id: string; createdAt: string; toChildId: string; body: string } }
  | { type: 'parent/addReport'; item: { id: string; createdAt: string; type: string; body: string } }
  | { type: 'principal/addBroadcast'; item: { id: string; createdAt: string; title: string; body: string } }
  | { type: 'principal/addReport'; report: IncidentReport }

const STORAGE_KEY = 'nefera.v2'

function isoDate(d: Date) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

function loadState(): NeferaState | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return undefined
    return JSON.parse(raw) as NeferaState
  } catch {
    return undefined
  }
}

function saveState(state: NeferaState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function getTodayISO() {
  return isoDate(new Date())
}

export function makeId(prefix: string) {
  return uid(prefix)
}

export function feelingLabel(feeling: Feeling) {
  switch (feeling) {
    case 'happy':
      return 'Happy'
    case 'neutral':
      return 'Neutral'
    case 'flat':
      return 'Flat'
    case 'worried':
      return 'Worried'
    case 'sad':
      return 'Sad'
  }
}

export function feelingEmoji(feeling: Feeling) {
  switch (feeling) {
    case 'happy':
      return '😃'
    case 'neutral':
      return '🙂'
    case 'flat':
      return '😐'
    case 'worried':
      return '😟'
    case 'sad':
      return '😢'
  }
}

function initialState(): NeferaState {
  const today = getTodayISO()

  const studentRecords: StudentRecord[] = []

  return {
    selectedRole: undefined,
    user: undefined,
    student: {
      ageGroup: undefined,
      checkIns: [],
      sleepLogs: [],
      journal: [],
      habits: [],
      groups: [],
      inbox: [],
      openCircle: [],
      incidents: [],
      lastPromptedJournalAt: undefined,
    },
    teacher: {
      classes: [],
      students: studentRecords,
      broadcasts: [],
    },
    parent: {
      children: [],
      sent: [],
      reports: [],
    },
    counselor: {
      students: studentRecords,
      broadcasts: [],
      crisisActions: [
        { id: 'ca_1', createdAt: new Date().toISOString(), body: 'Call guardian and document safety plan', done: false },
        { id: 'ca_2', createdAt: new Date().toISOString(), body: 'Schedule 1:1 check-in within 24h', done: false },
        { id: 'ca_3', createdAt: new Date().toISOString(), body: 'Coordinate with principal for supervision', done: false },
      ],
    },
    principal: {
      broadcasts: [],
      reports: [],
    },
  }
}

function reducer(state: NeferaState, action: Action): NeferaState {
  switch (action.type) {
    case 'selectRole':
      return { ...state, selectedRole: action.role }
    case 'login': {
      return { ...state, user: { id: uid('user'), name: action.name.trim() || 'Guest', role: action.role } }
    }
    case 'logout':
      return { ...state, user: undefined }
    case 'student/setAgeGroup':
      return { ...state, student: { ...state.student, ageGroup: action.ageGroup } }
    case 'student/addCheckIn': {
      const next = [action.checkIn, ...state.student.checkIns].slice(0, 200)
      return { ...state, student: { ...state.student, checkIns: next } }
    }
    case 'student/addSleepLog': {
      const next = [action.log, ...state.student.sleepLogs].slice(0, 200)
      return { ...state, student: { ...state.student, sleepLogs: next } }
    }
    case 'student/addJournal': {
      const next = [action.payload, ...state.student.journal].slice(0, 400)
      return { ...state, student: { ...state.student, journal: next } }
    }
    case 'student/updateJournal':
      return {
        ...state,
        student: {
          ...state.student,
          journal: state.student.journal.map((j) => (j.id === action.payload.id ? { ...j, ...action.payload } : j)),
        },
      }
    case 'student/toggleGroup': {
      const groups = state.student.groups.map((g) => (g.id === action.groupId ? { ...g, joined: !g.joined } : g))
      return { ...state, student: { ...state.student, groups } }
    }
    case 'student/markMessageRead': {
      const now = new Date().toISOString()
      const inbox = state.student.inbox.map((m) => (m.id === action.messageId ? { ...m, readAt: m.readAt ?? now } : m))
      return { ...state, student: { ...state.student, inbox } }
    }
    case 'student/setInbox':
      return { ...state, student: { ...state.student, inbox: action.inbox } }
    case 'student/addPost': {
      const next = [action.post, ...state.student.openCircle].slice(0, 200)
      return { ...state, student: { ...state.student, openCircle: next } }
    }
    case 'student/toggleLikePost': {
      const openCircle = state.student.openCircle.map((p) => {
        if (p.id !== action.postId) return p
        const has = p.likes.includes(action.userId)
        return { ...p, likes: has ? p.likes.filter((x) => x !== action.userId) : [action.userId, ...p.likes] }
      })
      return { ...state, student: { ...state.student, openCircle } }
    }
    case 'student/addComment': {
      const openCircle = state.student.openCircle.map((p) =>
        p.id === action.postId ? { ...p, comments: [...p.comments, action.comment] } : p,
      )
      return { ...state, student: { ...state.student, openCircle } }
    }
    case 'student/addIncident': {
      const incidents = [action.incident, ...state.student.incidents].slice(0, 200)
      const principalReports = [action.incident, ...state.principal.reports].slice(0, 200)
      return { ...state, student: { ...state.student, incidents }, principal: { ...state.principal, reports: principalReports } }
    }
    case 'student/addHabit':
      return { ...state, student: { ...state.student, habits: [action.habit, ...state.student.habits] } }
    case 'student/toggleHabitToday': {
      const habits = state.student.habits.map((h) => {
        if (h.id !== action.habitId) return h
        const has = h.completedDates.includes(action.isoDate)
        return { ...h, completedDates: has ? h.completedDates.filter((d) => d !== action.isoDate) : [action.isoDate, ...h.completedDates] }
      })
      return { ...state, student: { ...state.student, habits } }
    }
    case 'teacher/addBroadcast': {
      const broadcasts = [action.item, ...state.teacher.broadcasts].slice(0, 100)
      const inboxItem: Message = {
        id: uid('msg'),
        createdAt: action.item.createdAt,
        fromRole: 'teacher',
        fromName: state.user?.name ?? 'Teacher',
        toRole: 'student',
        subject: action.item.title,
        body: action.item.body,
      }
      return { ...state, teacher: { ...state.teacher, broadcasts }, student: { ...state.student, inbox: [inboxItem, ...state.student.inbox] } }
    }
    case 'teacher/setStudentFlags': {
      const students = state.teacher.students.map((s) => (s.id === action.studentId ? { ...s, flags: action.flags } : s))
      const counselorStudents = state.counselor.students.map((s) => (s.id === action.studentId ? { ...s, flags: action.flags } : s))
      return { ...state, teacher: { ...state.teacher, students }, counselor: { ...state.counselor, students: counselorStudents } }
    }
    case 'counselor/addBroadcast': {
      const broadcasts = [action.item, ...state.counselor.broadcasts].slice(0, 100)
      const inboxItem: Message = {
        id: uid('msg'),
        createdAt: action.item.createdAt,
        fromRole: 'counselor',
        fromName: state.user?.name ?? 'Counselor',
        toRole: 'student',
        subject: action.item.title,
        body: action.item.body,
      }
      return { ...state, counselor: { ...state.counselor, broadcasts }, student: { ...state.student, inbox: [inboxItem, ...state.student.inbox] } }
    }
    case 'counselor/savePhq9': {
      const upd = (s: StudentRecord) => (s.id === action.studentId ? { ...s, phq9: { answers: action.answers, createdAt: action.createdAt } } : s)
      return { ...state, counselor: { ...state.counselor, students: state.counselor.students.map(upd) }, teacher: { ...state.teacher, students: state.teacher.students.map(upd) } }
    }
    case 'counselor/saveGad7': {
      const upd = (s: StudentRecord) => (s.id === action.studentId ? { ...s, gad7: { answers: action.answers, createdAt: action.createdAt } } : s)
      return { ...state, counselor: { ...state.counselor, students: state.counselor.students.map(upd) }, teacher: { ...state.teacher, students: state.teacher.students.map(upd) } }
    }
    case 'counselor/saveCssrs': {
      const upd = (s: StudentRecord) => (s.id === action.studentId ? { ...s, cssrs: { answers: action.answers, createdAt: action.createdAt } } : s)
      return { ...state, counselor: { ...state.counselor, students: state.counselor.students.map(upd) }, teacher: { ...state.teacher, students: state.teacher.students.map(upd) } }
    }
    case 'counselor/toggleCrisisAction': {
      const crisisActions = state.counselor.crisisActions.map((a) => (a.id === action.id ? { ...a, done: !a.done } : a))
      return { ...state, counselor: { ...state.counselor, crisisActions } }
    }
    case 'parent/sendMessage': {
      const sent = [action.item, ...state.parent.sent].slice(0, 200)
      const inboxItem: Message = {
        id: uid('msg'),
        createdAt: action.item.createdAt,
        fromRole: 'parent',
        fromName: state.user?.name ?? 'Parent',
        toRole: 'student',
        subject: 'Message from home',
        body: action.item.body,
      }
      return { ...state, parent: { ...state.parent, sent }, student: { ...state.student, inbox: [inboxItem, ...state.student.inbox] } }
    }
    case 'parent/addReport': {
      const reports = [action.item, ...state.parent.reports].slice(0, 200)
      const principalReports: IncidentReport = {
        id: action.item.id,
        createdAt: action.item.createdAt,
        type: action.item.type,
        description: action.item.body,
        anonymous: false,
        status: 'received',
      }
      return { ...state, parent: { ...state.parent, reports }, principal: { ...state.principal, reports: [principalReports, ...state.principal.reports] } }
    }
    case 'principal/addBroadcast': {
      const broadcasts = [action.item, ...state.principal.broadcasts].slice(0, 200)
      return { ...state, principal: { ...state.principal, broadcasts } }
    }
    case 'principal/addReport':
      return { ...state, principal: { ...state.principal, reports: [action.report, ...state.principal.reports] } }
  }
}

type NeferaCtx = {
  state: NeferaState
  dispatch: React.Dispatch<Action>
}

const Ctx = createContext<NeferaCtx | undefined>(undefined)

export function NeferaProvider({ children }: { children: React.ReactNode }) {
  const loaded = useMemo(() => loadState(), [])
  const [state, dispatch] = useReducer(reducer, loaded ?? initialState())

  const didHydrate = useRef(false)
  useEffect(() => {
    if (!didHydrate.current) {
      didHydrate.current = true
      return
    }
    saveState(state)
  }, [state])

  const value = useMemo(() => ({ state, dispatch }), [state])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useNefera() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('NeferaProvider missing')
  return ctx
}

export function useAuth() {
  const { state, dispatch } = useNefera()
  const selectRole = (role: Role) => dispatch({ type: 'selectRole', role })
  const login = (name: string, role: Role) => dispatch({ type: 'login', name, role })
  const logout = () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    dispatch({ type: 'logout' })
  }

  return { user: state.user, selectedRole: state.selectedRole, selectRole, login, logout }
}
