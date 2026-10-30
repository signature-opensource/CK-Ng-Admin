Adds the invitation flow to the admin user management: the pending invitations tab with its resend,
deactivate and delete actions, the e-mail column and field, and the anonymous registration page
reached through the invited link.

It also extends the generated edit command with the Email property, so referencing this package is what
puts the address on the form. The invitations and their mails are handled by CK.UserManagement.UserInvitation,
where the database is.
