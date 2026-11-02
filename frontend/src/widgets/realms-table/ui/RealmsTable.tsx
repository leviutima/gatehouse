import { useRealmsQuery } from '@/entities/realm'
import { SessionExpiredError } from '@/entities/session'
import { hasHttpStatus } from '@/shared/api'
import { Button } from '@/shared/ui'

const CELL = 'border-b border-line px-4 py-[0.6rem] text-left'

export function RealmsTable() {
  const { data, error, isFetching, refetch } = useRealmsQuery()

  if (isFetching || error instanceof SessionExpiredError) {
    return <p className="my-4 text-muted">Loading realms…</p>
  }
  if (hasHttpStatus(error, 403)) {
    return (
      <p role="alert" className="my-4">
        This account is not an administrator of the master realm, so it cannot
        list realms.
      </p>
    )
  }
  if (!data) {
    return (
      <div role="alert">
        <p className="my-4">The realms could not be loaded.</p>
        <Button onClick={() => void refetch()}>Try again</Button>
      </div>
    )
  }
  return (
    <table className="w-full border border-line bg-card">
      <thead>
        <tr>
          <th scope="col" className={`${CELL} text-sm text-muted`}>
            Name
          </th>
          <th scope="col" className={`${CELL} text-sm text-muted`}>
            Display name
          </th>
          <th scope="col" className={`${CELL} text-sm text-muted`}>
            Status
          </th>
        </tr>
      </thead>
      <tbody>
        {data.map((realm) => (
          <tr key={realm.id} className="last:[&>td]:border-b-0">
            <td className={CELL}>
              <code>{realm.name}</code>
            </td>
            <td className={CELL}>{realm.displayName}</td>
            <td className={CELL}>{realm.enabled ? 'Enabled' : 'Disabled'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
