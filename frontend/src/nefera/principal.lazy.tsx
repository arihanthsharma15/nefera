import { useEffect, useState } from 'react'
import { getPrincipalReports } from '../api'
import { Badge, Card, CardBody, CardHeader, Page } from './ui'

type PrincipalReportItem = {
  id: string | number
  incident_type?: string | null
  status?: string | null
  created_at?: string | number | null
  description?: string | null
  is_anonymous?: boolean | null
  class_name?: string | null
  student_name?: string | null
  student_login_id?: string | null
}

function formatShort(value: string | number) {
  const d = new Date(value)
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function PrincipalReports() {
  const [reports, setReports] = useState<PrincipalReportItem[]>([])

  useEffect(() => {
    getPrincipalReports().then(setReports).catch(console.error)
  }, [])
  return (
    <Page emoji="🧾" title="Reports" subtitle="Safety and wellbeing reports.">
      <div className="grid gap-3">
        {reports.map((r) => (
          <Card key={r.id}>
            <CardBody className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-base font-extrabold tracking-tight text-[rgb(var(--nefera-ink))]">{r.incident_type}</div>
                <Badge
                  tone={
                    String(r.status || '').toUpperCase() === 'RESOLVED'
                      ? 'ok'
                      : String(r.status || '').toUpperCase() === 'REVIEWED'
                        ? 'warn'
                        : 'neutral'
                  }
                >
                  {String(r.status || '').toUpperCase()}
                </Badge>
              </div>
              <div className="text-xs font-semibold text-[rgb(var(--nefera-muted))]">{formatShort(r.created_at)}</div>
              <div className="text-sm leading-6 text-[rgb(var(--nefera-muted))] whitespace-pre-wrap">{r.description}</div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[rgb(var(--nefera-muted))]">
                <span>Anonymous: {r.is_anonymous ? 'Yes' : 'No'}</span>
                {r.class_name ? <span>Class: {r.class_name}</span> : null}
                {!r.is_anonymous && r.student_name ? <span>Student: {r.student_name}</span> : null}
                {!r.is_anonymous && r.student_login_id ? <span>Login ID: {r.student_login_id}</span> : null}
              </div>
            </CardBody>
          </Card>
        ))}
        {reports.length === 0 ? (
          <Card>
            <CardHeader emoji="🌿" title="No reports yet" subtitle="Reports will appear here as they are submitted." />
            <CardBody className="text-sm text-[rgb(var(--nefera-muted))]">This page helps leadership review and route follow-up.</CardBody>
          </Card>
        ) : null}
      </div>
    </Page>
  )
}
