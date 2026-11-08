export const metadata = { title: 'Privacy Policy | HR Nest' }

export default function Privacy() {
  return (
    <div className="wrap" style={{ maxWidth: 760 }}>
      <div className="nav"><div className="logo"><span>✓</span>HR Nest</div><a href="/">Back to app</a></div>
      <p className="banner" style={{ marginTop: 16 }}>Template: replace the parts in [brackets] and have a lawyer review this page before you launch.</p>
      <h1>Privacy Policy</h1>
      <p className="muted">Last updated: [date]</p>
      <h3>Who we are</h3>
      <p>HR Nest is operated by [your business name], [address], contact: [email]. HR Nest is software that companies use to manage hiring, attendance, leave and payroll.</p>
      <h3>Roles</h3>
      <p>Each company that uses HR Nest decides what employee and candidate data it enters and why. That company is responsible for having a lawful basis and for informing its employees and candidates. We process that data on the company's behalf to run the service.</p>
      <h3>Data the service handles</h3>
      <ul>
        <li>Account data: email address and password (stored as a secure hash).</li>
        <li>Employee data: name, ID or passport number, date of birth, contact details, photo, department, designation, salary, attendance, leave and payslips.</li>
        <li>Candidate data: CVs and the contact details and skills found in them.</li>
        <li>Optional: face data (a numeric face template) and phone location, only when the company turns these features on. Face recognition must only be used with each employee's consent.</li>
      </ul>
      <h3>How data is used</h3>
      <p>To provide the features above, to keep the service secure, and to help users (for example, reading text from scanned CVs and answering questions in the HR assistant, which sends the relevant text to Google's Gemini API). We do not sell personal data.</p>
      <h3>Where data is stored</h3>
      <p>Data is stored with our infrastructure providers: Supabase (database and file storage) and Vercel (hosting). [Add region and any other providers you use.]</p>
      <h3>Retention and deletion</h3>
      <p>Data is kept until the company deletes it or closes its account. Employees and candidates can ask their company to access, correct or delete their data; the company can also contact us at [email] for help.</p>
      <h3>Security</h3>
      <p>Access is restricted by role, data is transmitted over HTTPS, and email passwords entered for CV collection are stored encrypted. No system is completely secure, and we will notify affected companies of a breach as the law requires.</p>
      <h3>Contact</h3>
      <p>[email]</p>
    </div>
  )
}
