import './globals.css'
import { Toaster } from '@/components/Toast'

export const metadata = { title: 'HR Nest', description: 'Hiring, attendance and payroll in one place' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}<Toaster /></body>
    </html>
  )
}
