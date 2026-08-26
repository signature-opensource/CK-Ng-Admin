# CK.Ng.Admin.UserManagement

Angular CKomposable package that brings the `/admin/user` page: workspace user management - listing,
direct creation, edit, and forced password reset.

Base feature only. Invitations and banished users are brought by separate packages that inject into the
components below through `.t` transformers and register their own command types; the anchors they use
are part of this package contract.

## What it brings.

| | |
|---|---|
| Route | `/admin/user` - [`UserManagementPageComponent`](UserManagementPage/UserManagementPageComponent.cs), lazy child of `AdminPageComponent` |
| Components | [`UsersTabComponent`](UsersTab/UsersTabComponent.cs), [`EditUserFormComponent`](EditUserForm/EditUserFormComponent.cs), [`ForceResetPasswordFormComponent`](ForceResetPasswordForm/ForceResetPasswordFormComponent.cs), [`UserWorkspaceGroupPickerComponent`](UserWorkspaceGroupPicker/UserWorkspaceGroupPickerComponent.cs) |
| Helper | [`password-generator.ts`](Res/password-generator.ts) - `generateStrongPassword`, shared by the creation form and the force-reset modal |
| Q commands | `IGetWorkspaceUsersQCommand`, `IGetWorkspaceUserEditDataQCommand` |
| Commands | `ICreateWorkspaceUserCommand`, `IEditWorkspaceUserCommand`, `IForceResetUserPasswordCommand` |
| Translations | the `CK.Admin.UserManagement.*` keys, in [default.jsonc](Res/ts-locales/default.jsonc) and [fr.jsonc](Res/ts-locales/fr.jsonc) |

## Requires.

- [`AdminTSPackage`](../CK.Ng.Admin/README.md) and
  `CK.Ng.UserProfile.UserPassword.Reset` - a user created here starts with a temporary password, and
  the reset flow is what makes the user choose a real one at first login.
- `CK.IO.UserManagement` for the command definitions, `CK.Ng.Zorro.BackOffice` for the layout.

## Direct creation hands out a temporary password.

The base flow is deliberately the simple one: an administrator creates the user, a strong password is
generated client-side by `generateStrongPassword`, and the user is forced through the temporary
password reset at first login. That is why `UserProfilePasswordResetPackage` is a hard requirement
rather than an option - without it the created user would keep a password it never chose.

The invitation-based flow, where the user receives a link and sets its own password, is not part of this
package.

## The forced reset modal does not use GenericForm.

[`ForceResetPasswordFormComponent`](ForceResetPasswordForm/ForceResetPasswordFormComponent.cs) is a
single password field, pre-filled with a strong value and regenerable. It deliberately does **not**
use the shared `GenericForm`: the regenerate button is a suffix of the input, which `GenericForm`
cannot render. The field otherwise mirrors the one of the creation flow, so the two stay consistent by
convention rather than by sharing code.
