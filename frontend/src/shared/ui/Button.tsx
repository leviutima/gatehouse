import type { ComponentProps } from 'react'

export function Button(props: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className="cursor-pointer rounded-md bg-accent px-[0.9rem] py-[0.4rem] text-on-accent"
      {...props}
    />
  )
}
