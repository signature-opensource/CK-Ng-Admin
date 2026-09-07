# CK-Ng-Admin

[![Licence](https://img.shields.io/github/license/signature-opensource/CK-Ng-Admin.svg)](LICENSE)

The Angular administration back office: the `/admin` page and the workspace user management that hangs
off it.

The base packages own their pages as anchored files; each feature satellite adds its columns, filters,
actions and commands by transforming them. Reference only what the application needs.

| Package | Description | Latest stable |
|---------|-------------|---------------|
| [CK.Ng.Admin](CK.Ng.Admin/README.md) | The `/admin` page shell, and the `isAdmin` signal on the user service. | [![nuget](https://img.shields.io/nuget/v/CK.Ng.Admin.svg?label=CK.Ng.Admin)](https://www.nuget.org/packages/CK.Ng.Admin/) |
| [CK.Ng.Admin.UserManagement](CK.Ng.Admin.UserManagement/README.md) | The `/admin/user` page: listing, direct creation, edit, forced password reset. | [![nuget](https://img.shields.io/nuget/v/CK.Ng.Admin.UserManagement.svg?label=CK.Ng.Admin.UserManagement)](https://www.nuget.org/packages/CK.Ng.Admin.UserManagement/) |
| [CK.Ng.Admin.UserManagement.UserInvitation](CK.Ng.Admin.UserManagement.UserInvitation/README.md) | Invitations tab, e-mail column, and the anonymous registration page. | [![nuget](https://img.shields.io/nuget/v/CK.Ng.Admin.UserManagement.UserInvitation.svg?label=CK.Ng.Admin.UserManagement.UserInvitation)](https://www.nuget.org/packages/CK.Ng.Admin.UserManagement.UserInvitation/) |
| [CK.Ng.Admin.UserManagement.UserBanned](CK.Ng.Admin.UserManagement.UserBanned/README.md) | Ban and unban actions, banned filter and tag. | [![nuget](https://img.shields.io/nuget/v/CK.Ng.Admin.UserManagement.UserBanned.svg?label=CK.Ng.Admin.UserManagement.UserBanned)](https://www.nuget.org/packages/CK.Ng.Admin.UserManagement.UserBanned/) |
| [SLog.Mail.Branding](SLog.Mail.Branding/README.md) | Tenant-specific mail branding for Signature One deployments. Unrelated to the admin page. | [![nuget](https://img.shields.io/nuget/v/SLog.Mail.Branding.svg?label=SLog.Mail.Branding)](https://www.nuget.org/packages/SLog.Mail.Branding/) |

One of these does not follow the repository naming: `SLog.Mail.Branding` is neither `CK.*` nor an
Angular package.

The client side of a banishment - the ejection of the banished user - lives in
`CK.Ng.UserProfile.UserBanned`, in the
[CK-Ng-User-UserProfile](https://github.com/signature-opensource/CK-Ng-User-UserProfile) repository:
it extends the user profile, not the admin page. The ban and unban *actions* are here, in
[CK.Ng.Admin.UserManagement.UserBanned](CK.Ng.Admin.UserManagement.UserBanned/README.md).

`Sample/` builds a runnable application over these packages.
