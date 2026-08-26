# CK.Ng.Admin.UserManagement.UserInvitation

Angular CKomposable package that brings everything invitation-related to the admin user management: the
pending invitations tab, the anonymous registration page, the e-mail column and field, and the
invitation-based user creation flow. It injects into the base
[CK.Ng.Admin.UserManagement](../CK.Ng.Admin.UserManagement/README.md) components via `.t` transformers.

## What it brings.

| | |
|---|---|
| Route | `/auth/register/:token` - [`RegisterComponent`](Register/RegisterComponent.cs), a lazy **anonymous** child of the authentication page |
| Components | [`InvitationsTableComponent`](InvitationsTable/InvitationsTableComponent.cs), [`UserFormComponent`](UserForm/UserFormComponent.cs) |
| Q commands | `IGetPlatformPendingInvitationsQCommand`, `IGetWorkspacePendingInvitationsQCommand`, `IGetWorkspaceInvitationDataQCommand` |
| Commands | `ICreateInvitationCommand`, `IResendInvitationsCommand`, `IDeactivateInvitationsCommand`, `IDestroyInvitationsCommand`, `IValidateInvitationTokenCommand`, `ICompleteRegistrationCommand` |
| Transformers | [`users-tab.t`](Res/users-tab.t), [`user-management-page.t`](Res/user-management-page.t) |
| Translations | the `CK.Admin.UserManagement.Invitation.*`, `Tab.Invitations`, `Column.*` and `User.Email` keys |

## Requires.

- [`UserManagementTSPackage`](../CK.Ng.Admin.UserManagement/README.md)
- `CK.Ng.UserProfile.UserPassword.Lost` - the invitation link and the password-recovery link are the
  same kind of anonymous token flow, and the mail infrastructure comes from there. This is why
  referencing this package pulls the e-mail feature in.
- `CK.IO.UserManagement.UserInvitation`

## It extends a generated command.

Besides its own commands, this package registers
`CK.IO.UserManagement.UserInvitation.IEditWorkspaceUserCommand`. That is not a second command: it is an
e-mail-aware extension that adds the `Email` property to the generated `EditWorkspaceUserCommand` of
the base package. The base package knows nothing about e-mail addresses; referencing this one is what
puts the field on the edit form and the column in the table.

## Two ways to create a user, and they do not overlap.

The base package creates the user directly with a generated temporary password. This package adds the
invitation: the administrator sends a link, and the invited person registers itself at
`/auth/register/:token`, choosing its own password. Both flows stay available side by side - the
invitation tab lists what is pending, with resend, deactivate and delete actions.

## Transformer anchors.

- [`users-tab.t`](Res/users-tab.t): `PostUsersTabSearchPredicate`, `PostUsersTabTranslationKeys`,
  `PostUsersTabColumns`, `PostUsersTabInit`, `PostUsersTabMethods` (twice), `PostUsersTabItemInfo`.
- [`user-management-page.t`](Res/user-management-page.t): `PostPageImports`,
  `PostPageComponentImports`, `PostViewChildren`, `PostOnUserCreated`, `PostUsersTab` - the last one
  is where the invitations tab is added next to the users tab.
