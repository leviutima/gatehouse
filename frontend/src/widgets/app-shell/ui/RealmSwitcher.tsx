import { Select } from '@leviutima/ds'
import { useNavigate } from '@tanstack/react-router'
import { useRealmsQuery } from '@/entities/realm'

interface RealmSwitcherProps {
  realm: string | undefined
}

export function RealmSwitcher({ realm }: RealmSwitcherProps) {
  const navigate = useNavigate()
  const { data } = useRealmsQuery()
  const names = data?.map(({ name }) => name) ?? []
  const options = realm && !names.includes(realm) ? [realm, ...names] : names

  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        Realm
      </span>
      <Select
        value={realm ?? ''}
        onChange={(event) =>
          void navigate({
            to: '/realms/$realm/roles',
            params: { realm: event.target.value },
          })
        }
        className="font-mono text-sm"
      >
        {!realm && <option value="">Choose a realm…</option>}
        {options.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </Select>
    </label>
  )
}
