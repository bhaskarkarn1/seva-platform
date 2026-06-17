import { useEffect, useRef } from 'react'

export function useReveal() {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible')
          observer.unobserve(el)
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return ref
}

export function RevealSection({ className = '', children, ...props }) {
  const ref = useReveal()
  return (
    <div ref={ref} className={`reveal ${className}`} {...props}>
      {children}
    </div>
  )
}

export function StaggerGrid({ className = '', children }) {
  const ref = useReveal()
  return (
    <div ref={ref} className={`stagger ${className}`}>
      {children}
    </div>
  )
}
