import { LinkButton } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { DoomsdayBackground } from '@/components/effects/DoomsdayBackground'

/**
 * Problem statements are PRIVATE event content.
 * Organizers allocate one unique statement per team — teams see theirs in
 * the leader portal the moment it is assigned.
 */
export default function ProblemsPage() {
  return (
    <div className="relative">
      <DoomsdayBackground intensity="low" showWarningGlow={false} />
      <Container className="relative z-10 py-20 sm:py-28">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-hud text-primary/70">CLASSIFIED</p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            Mission briefs are sealed.
          </h1>
          <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-steel-bright sm:text-base">
            Problem statements are not public. Each registered team receives
            its own unique brief, allocated by the organizers — check your
            team portal once allocation opens.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <LinkButton to="/register" size="lg" className="glow-reactor w-full sm:w-auto">
              REGISTER YOUR TEAM
            </LinkButton>
            <LinkButton to="/login" size="lg" variant="outline" className="w-full sm:w-auto">
              OPEN TEAM PORTAL
            </LinkButton>
          </div>
        </div>
      </Container>
    </div>
  )
}
