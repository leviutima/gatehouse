import { useRealmsQuery } from '@/entities/realm'
import { SessionExpiredError } from '@/entities/session'
import { hasHttpStatus } from '@/shared/api'

export function RealmsTable() {
  const { data, error, isFetching, refetch } = useRealmsQuery()

  if (isFetching || error instanceof SessionExpiredError) {
    return <p className="muted">Loading realms…</p>
  }
  if (hasHttpStatus(error, 403)) {
    return (
      <p role="alert">
        This account is not an administrator of the master realm, so it cannot
        list realms.
      </p>
    )
  }
  if (!data) {
    return (
      <div role="alert">
        <p>The realms could not be loaded.</p>
        <button type="button" onClick={() => void refetch()}>
          Try again
        </button>
      </div>
    )
  }
  return (
    <table>
      <thead>
        <tr>
          <th scope="col">Name</th>
          <th scope="col">Display name</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
        {data.map((realm) => (
          <tr key={realm.id}>
            <td>
              <code>{realm.name}</code>
            </td>
            <td>{realm.displayName}</td>
            <td>{realm.enabled ? 'Enabled' : 'Disabled'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
