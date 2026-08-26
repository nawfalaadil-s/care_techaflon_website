import { lazy, Suspense, useState } from 'react'
import { Route, Routes } from 'react-router-dom'

import { RequireAdmin, RequireAuth } from '@/components/common'
import { AdminShell } from '@/components/admin/AdminShell'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { Spinner } from '@/components/ui/spinner'
import { VideoIntro } from '@/components/effects/VideoIntro'
import HomePage from '@/pages/public/HomePage'
import PlaceholderPage from '@/pages/public/PlaceholderPage'

// Route-level code splitting: heavy/rarely-visited pages are loaded on demand
// so the landing experience stays fast on mobile connections.
const DesignSystemPage = lazy(() => import('@/pages/design/DesignSystemPage'))
const RegistrationPage = lazy(() => import('@/pages/public/RegistrationPage'))
const LoginPage = lazy(() => import('@/pages/public/LoginPage'))
const ChangePasswordPage = lazy(
  () => import('@/pages/public/ChangePasswordPage'),
)
const ProblemsPage = lazy(() => import('@/pages/public/ProblemsPage'))
const FaqPage = lazy(() => import('@/pages/public/FaqPage'))
const RulesPage = lazy(() => import('@/pages/public/RulesPage'))
const AccountPage = lazy(() => import('@/pages/public/AccountPage'))
const PortalPage = lazy(() => import('@/pages/team/PortalPage'))
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'))
const RegistrationsPage = lazy(() => import('@/pages/admin/RegistrationsPage'))
const AdminSubmissionsPage = lazy(
  () => import('@/pages/admin/AdminSubmissionsPage'),
)
const AdminVenuePage = lazy(() => import('@/pages/admin/AdminVenuePage'))
const AdminAllocationsPage = lazy(
  () => import('@/pages/admin/AdminAllocationsPage'),
)
const ProblemsAdminPage = lazy(() => import('@/pages/admin/ProblemsAdminPage'))
const AdminEmailsPage = lazy(() => import('@/pages/admin/AdminEmailsPage'))

const AdminCertificatesPage = lazy(
  () => import('@/pages/admin/AdminCertificatesPage'),
)
const AdminAnalyticsPage = lazy(() => import('@/pages/admin/AdminAnalyticsPage'))
const AdminSettingsPage = lazy(() => import('@/pages/admin/AdminSettingsPage'))
const AdminAccountPage = lazy(() => import('@/pages/admin/AdminAccountPage'))

function NotFoundPage() {
  return (
    <PlaceholderPage
      title="404 - Page Not Found"
      description="The page you are looking for does not exist."
    />
  )
}

function RouteFallback() {
  return (
    <div className="flex min-h-[64vh] items-center justify-center gap-3 text-muted-foreground">
      <Spinner /> Loading...
    </div>
  )
}

export default function App() {
  const [introComplete, setIntroComplete] = useState(false)

  return (
    <>
      {!introComplete && (
        <VideoIntro onComplete={() => setIntroComplete(true)} />
      )}

      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/design-system" element={<DesignSystemPage />} />
            <Route path="/register" element={<RegistrationPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/problems" element={<ProblemsPage />} />
            <Route
              path="/account"
              element={
                <RequireAuth>
                  <AccountPage />
                </RequireAuth>
              }
            />
            <Route
              path="/change-password"
              element={
                <RequireAuth>
                  <ChangePasswordPage />
                </RequireAuth>
              }
            />
            <Route
              path="/portal"
              element={
                <RequireAuth>
                  <PortalPage />
                </RequireAuth>
              }
            />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/rules" element={<RulesPage />} />
            <Route
              element={
                <RequireAdmin>
                  <AdminShell />
                </RequireAdmin>
              }
            >
              <Route path="/admin" element={<DashboardPage />} />
              <Route path="/admin/registrations" element={<RegistrationsPage />} />
              <Route path="/admin/submissions" element={<AdminSubmissionsPage />} />
              <Route path="/admin/venue" element={<AdminVenuePage />} />
              <Route path="/admin/allocations" element={<AdminAllocationsPage />} />
              <Route path="/admin/problems" element={<ProblemsAdminPage />} />
              <Route path="/admin/emails" element={<AdminEmailsPage />} />
              <Route path="/admin/certificates" element={<AdminCertificatesPage />} />
              <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
              <Route path="/admin/account" element={<AdminAccountPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}
