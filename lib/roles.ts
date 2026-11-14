const ALL = ['admin', 'hr', 'payroll', 'viewer']
const STAFF = ['admin', 'hr', 'viewer']
const HR = ['admin', 'hr']

export const ACCESS: Record<string, string[]> = {
  Dashboard: ALL, 'HR Desk': HR, Profile: [...ALL, 'employee', 'manager'], Team: ['manager'], Portal: ['employee', 'manager'], Attendance: STAFF, Records: STAFF, Leave: STAFF, Employees: ALL, Payroll: ['admin', 'payroll'],
  Departments: ALL, Holidays: ALL, 'ID Cards': HR, Reports: STAFF, Assistant: STAFF,
  Candidates: STAFF, Interviews: STAFF, Jobs: STAFF, Letters: HR, Users: ['admin'], Settings: ['admin'],
  Templates: HR, Community: [...ALL, 'employee', 'manager']
}

export const WRITE: Record<string, string[]> = {
  Dashboard: [], 'HR Desk': HR, Profile: [...ALL, 'employee', 'manager'], Team: ['manager'], Portal: ['employee', 'manager'], Attendance: HR, Records: [], Leave: HR, Employees: HR, Payroll: ['admin', 'payroll'],
  Departments: ['admin'], Holidays: HR, 'ID Cards': HR, Reports: HR, Assistant: STAFF,
  Candidates: HR, Interviews: HR, Jobs: HR, Letters: HR, Users: ['admin'], Settings: ['admin'],
  Templates: HR, Community: [...ALL, 'employee', 'manager']
}

export const SELF_CONTAINED = ['Team', 'Community', 'Dashboard', 'HR Desk', 'Profile', 'Records', 'Reports', 'Portal', 'ID Cards', 'Letters']

// Pages that open on their own link (new tab) instead of inside the dashboard
export const LINKS: Record<string, string> = { 'ID Cards': '/id-cards' }

export const NAV: { label: string; items: string[] }[] = [
  { label: 'Platform', items: ['Dashboard', 'HR Desk', 'Portal', 'Attendance', 'Records', 'Leave', 'Employees', 'Payroll'] },
  { label: 'Organisation', items: ['Departments', 'Holidays', 'ID Cards'] },
  { label: 'Insights', items: ['Reports', 'Assistant'] },
  { label: 'Hiring', items: ['Candidates', 'Interviews', 'Jobs', 'Letters'] },
  { label: 'Admin', items: ['Users', 'Settings'] },
  { label: 'Account', items: ['Profile'] }
]

// The sidebar shows only these few sections. Everything else is a tab inside its section.
export const SECTIONS: { id: string; label: string; icon: string; pages: string[] }[] = [
  { id: 'Home', label: 'Home', icon: 'Dashboard', pages: ['Dashboard', 'HR Desk', 'Team', 'Portal'] },
  { id: 'Hiring', label: 'Hiring', icon: 'Candidates', pages: ['Candidates', 'Jobs', 'Interviews', 'Templates', 'Letters'] },
  { id: 'People', label: 'People', icon: 'Employees', pages: ['Employees', 'Departments', 'Holidays', 'ID Cards'] },
  { id: 'Time', label: 'Attendance', icon: 'Attendance', pages: ['Attendance', 'Records', 'Leave'] },
  { id: 'Pay', label: 'Payroll', icon: 'Payroll', pages: ['Payroll'] },
  { id: 'Insights', label: 'Insights', icon: 'Reports', pages: ['Reports', 'Assistant'] },
  { id: 'Community', label: 'Community', icon: 'Community', pages: ['Community'] },
  { id: 'Admin', label: 'Admin', icon: 'Users', pages: ['Users', 'Settings'] },
  { id: 'Account', label: 'My Profile', icon: 'Profile', pages: ['Profile'] }
]

export const TABLABEL: Record<string, string> = {
  Portal: 'My Portal', Team: 'My Team', Attendance: 'Kiosk', Records: 'Records', Leave: 'Leave', Templates: 'Email templates', Reports: 'Reports', Assistant: 'Assistant', Users: 'Users & security', Settings: 'Settings'
}

export const LABEL: Record<string, string> = {
  Portal: 'My Portal', Attendance: 'Attendance & Kiosk', Records: 'Attendance Records', Leave: 'Leave Management', Reports: 'Reports & Analytics'
}

export const TITLES: Record<string, [string, string]> = {
  Dashboard: ['Executive Overview', 'Who is in, who is late and who is away today'],
  'HR Desk': ['HR Desk', 'Your private workspace: approvals, leave and performance remarks'],
  Profile: ['My Profile', 'Your photo, name and password'],
  Portal: ['My Portal', 'Your attendance, leave and payslips'],
  Attendance: ['Attendance & Kiosk', 'Scan faces or QR codes and see today'],
  Records: ['Attendance Records', 'Daily check-ins, working hours and late arrivals'],
  Leave: ['Leave Management', 'Requests, balances and approvals'],
  Employees: ['Employees', 'Profiles, departments, designations and salaries'],
  Departments: ['Departments', 'Only an admin can add or remove departments'],
  Holidays: ['Holidays', 'Days off that are not counted as working days'],
  'ID Cards': ['ID Cards', 'Opens on its own page for HR'],
  Payroll: ['Payroll', 'Monthly salaries and deductions'],
  Reports: ['Reports & Analytics', 'Employee, attendance and performance reports'],
  Candidates: ['Candidates', 'Upload CVs or paste a link, and see ranked matches'],
  Interviews: ['Interviews', 'Scheduled interviews and results'],
  Jobs: ['Jobs', 'Open positions and public apply links'],
  Letters: ['Letters', 'Offer and experience letters, ready to print on A4'],
  Assistant: ['HR Assistant', 'Ask questions by typing or speaking'],
  Team: ['My Team', 'Your team today: who is in, leave requests and remarks'],
  Templates: ['Email templates', 'Write each email once, it fills in for every candidate'],
  Community: ['Community', 'Ask questions and get answers from HR'],
  Users: ['Users & Security', 'Roles, passwords and the private activity log'],
  Settings: ['System Settings', 'Company rules, location and email inbox']
}
