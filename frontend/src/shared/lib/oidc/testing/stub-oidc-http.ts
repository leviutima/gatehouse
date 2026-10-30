import { fakeAdapter } from '@/shared/api/testing/fake-adapter.ts'
import type { FakeHandler } from '@/shared/api/testing/fake-adapter.ts'
import { oidcHttp } from '../oidc-http.ts'

export function stubOidcHttp(handler: FakeHandler): void {
  oidcHttp.defaults.adapter = fakeAdapter(handler)
}
