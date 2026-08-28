# CK-Ng-Admin

[![Licence](https://img.shields.io/github/license/signature-opensource/CK-Ng-Admin.svg)](LICENSE)

The Angular administration back office: the `/admin` page and the workspace user management that hangs
off it.

The base packages own their pages as anchored files; each feature satellite adds its columns, filters,
actions and commands by transforming them. Reference only what the application needs.

| Package | Description |
|---------|-------------|
| [CK.Ng.Admin](CK.Ng.Admin/README.md) | The `/admin` page shell, and the `isAdmin` signal on the user service. |
| [CK.Ng.Admin.UserManagement](CK.Ng.Admin.UserManagement/README.md) | The `/admin/user` page: listing, direct creation, edit, forced password reset. |
| [CK.Ng.Admin.UserManagement.UserInvitation](CK.Ng.Admin.UserManagement.UserInvitation/README.md) | Invitations tab, e-mail column, and the anonymous registration page. |
| [CK.Ng.Admin.UserManagement.UserBanned](CK.Ng.Admin.UserManagement.UserBanned/README.md) | Ban and unban actions, banned filter and tag. |
| [CK.Ng.UserProfile.UserBanned](CK.Ng.UserProfile.UserBanned/README.md) | The client side of a banishment: the banished user is ejected from the application. |
| [SLog.Mail.Branding](SLog.Mail.Branding/README.md) | Tenant-specific mail branding for Signature One deployments. Unrelated to the admin page. |

Two of these do not follow the repository naming: `CK.Ng.UserProfile.UserBanned` belongs to the
`CK.Ng.UserProfile.*` family (it extends the user profile, not the admin page), and
`SLog.Mail.Branding` is neither `CK.*` nor an Angular package.

`Sample/` builds a runnable application over these packages.
