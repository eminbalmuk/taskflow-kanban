'use client'

import { useSession } from 'next-auth/react'
import Dashboard from '@/components/dashboard/Dashboard'
import LandingPage from './LandingPage'
import Loading from '@/components/kanban/Loading'

export default function Home() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <Loading />
  }

  if (status === 'authenticated') {
    return <Dashboard />
  }

  return <LandingPage />
}
