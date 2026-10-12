'use client'
import { useState } from 'react'
import { Info } from 'lucide-react'
import { AdminDialog } from './admin-dialog'
const guides: Record<string, [string, string, string]> = {
 '/admin': ['Your daily overview', 'This is the starting point for managing PYPC. The numbers summarise activity on the platform.', 'Choose a section in the menu to view records or complete a task. Only sections you can access appear.'],
 '/admin/roles': ['Who can do what?', 'A role is a set of tasks a team member is allowed to do. Standard roles are fixed. Custom roles let you choose the tasks yourself.', 'Select Add role, give it a name and choose allowed tasks. To change a custom role, select Edit in its row. Then open Members & users to assign the role to a person.'],
 '/admin/users': ['Manage your team and members', 'This page lists registered accounts and their access to PYPC.', 'Find a person and open their account controls to update their status or assign a role. A role controls which admin tasks they can do.'],
 '/admin/content': ['Update the homepage', 'Manage the content visitors see on the website homepage.', 'Choose an item to edit its text or image. Check its publication status before making it visible to visitors.'],
 '/admin/media': ['Your images and files', 'Store images and documents used on the website.', 'Upload a file, then use it in the relevant content section. Check whether a file is still needed before deleting it.'],
 '/admin/events': ['Manage events', 'Create and update events that people can attend.', 'Open an event to edit its details. Publishing makes it visible to visitors.'],
 '/admin/programmes': ['Manage programmes', 'Organise the programmes offered by PYPC.', 'Create or edit a programme, check its details, then publish it when ready.'],
 '/admin/opportunities': ['Manage opportunities', 'Manage opportunities people can apply for.', 'Edit the details and application dates, then publish the opportunity when ready.'],
 '/admin/applications': ['Review applications', 'Applications submitted by members appear here.', 'Open an application, review the supporting information and update the decision using the available controls.'],
 '/admin/partnerships': ['Requests to work with PYPC', 'Universities, organisations and sponsors use the public partnership form to ask about working with PYPC. MoU means a written agreement between organisations.', 'When a request arrives, read the proposal, contact the person using their email and update its status. Changing the status records your decision; it does not sign an agreement.'],
 '/admin/visa-letters': ['Visa support requests', 'Review requests for a supporting invitation letter for an event. A letter is not a visa approval.', 'Read the request and supporting information, then record your decision using the available controls.'],
 '/admin/certificates': ['Manage certificates', 'View certificates issued by PYPC and check their validity.', 'Use the issue action to create a certificate. Revoking a certificate makes it invalid when someone checks it.'],
 '/admin/payments': ['Check payments', 'Review recorded payments for memberships or activities.', 'Check the payment evidence before confirming a payment. A record here is not proof that money reached the bank.'],
 '/admin/messages': ['Messages from visitors', 'Contact form messages sent through the website appear here.', 'Read the message, use the sender’s contact details to reply and update its status when handled.'],
 '/admin/emails': ['Check email delivery', 'This page shows records of emails sent or attempted by the website.', 'Check delivery status when a member reports a missing email. This is a delivery history, not an email inbox.'],
 '/admin/audit': ['History of admin changes', 'See who made changes and when. This history helps the team track decisions.', 'Look for the relevant account, action or date to understand what happened. This page is for checking history.']
}
export function AdminPageHelp({ pathname }: { pathname: string }) {
 const [open, setOpen] = useState(false)
 const guide = guides[pathname] ?? guides['/admin']
 return <div className="mt-4"><button type="button" className="admin-action" onClick={() => setOpen(true)} aria-haspopup="dialog"><Info size={17} /> How to use this page</button>{open && <AdminDialog title={guide[0]} onClose={() => setOpen(false)}><p className="text-sm leading-7">{guide[1]}</p><h3 className="mt-5 font-bold">What do I do here?</h3><p className="mt-2 text-sm leading-7">{guide[2]}</p><button className="admin-action admin-action-primary mt-6" onClick={() => setOpen(false)}>Got it</button></AdminDialog>}</div>
}
