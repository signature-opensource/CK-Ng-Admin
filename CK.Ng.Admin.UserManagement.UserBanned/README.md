# CK.Ng.Admin.UserManagement.UserBanned

Angular CKomposable package that brings the banished-user features to the admin user management: the
"show banned" filter, the banned tag next to the user name, and the ban / unban actions. It injects
into the base [CK.Ng.Admin.UserManagement](../CK.Ng.Admin.UserManagement/README.md) components via
`.t` transformers.

## What it brings.

| | |
|---|---|
| Component | [`BanUserFormComponent`](BanUserForm/BanUserFormComponent.cs) - the modal capturing reason and duration |
| Commands | `ISetUserBannedAdminCommand`, `IDestroyUserBannedAdminCommand` |
| Transformer | [`users-tab.t`](Res/users-tab.t) |
| Translations | the `CK.Admin.UserManagement.Ban.*` and `Filter.Banned` keys, plus `Button.Ban` / `Button.Unban` |

## Requires.

- [`UserManagementTSPackage`](../CK.Ng.Admin.UserManagement/README.md)
- `CK.IO.UserManagement.UserBanned`

## The UI says "disabled", not "banned".

Every user-facing label of this package speaks of disabling and re-enabling
(`"Filter.Banned": "Disabled"`, `Button.Ban` renders as "Disable"). The code, the commands and the
database keep the "banned" vocabulary. This is deliberate - the operator-facing wording is softer than
the technical one - and it means a search for "ban" in the translation files finds the keys, not the
texts.

## The reason cannot contain LIKE wildcards.

The ban form refuses `%`, `_`, `[` and `]` in the reason
(`CK.Admin.UserManagement.Ban.ReasonInvalidChars`). This is not cosmetic: server-side,
[`CK.sUserBannedSet`](https://github.com/signature-opensource/CK-DB-User-UserBanned) matches the
existing banishment with `KeyReason like @KeyReason`, so a reason carrying a wildcard would update
somebody else's row. The client-side rule is what keeps the operator away from that.

The reason is also capped at 128 characters, which is the width of `CK.tUserBanned.KeyReason`.

## Durations are presets, with an escape hatch.

The modal offers 1 hour, 1 day, 1 week, 1 month, a custom end date, and a permanent deactivation. A
permanent ban is not a special state: it is the eternal end date (`9999-12-31`) the stored procedure
uses as its default, so unbanning a permanent ban and unbanning a timed one are the same operation.

## Transformer anchors.

[`users-tab.t`](Res/users-tab.t) injects into `PostLocalVariables`,
`PostUsersTabTranslationKeys`, `PostUsersTabFilterLabels`, `PostUsersTabFilters`, `PostInitFilters`,
`PostComputeFiltered`, `PostUsersTabRightActions`, `PostUsersTabRowActions`, `PostUsersTabMethods` and
`PostUserNameCellTags` of the base users tab.

## This package only lets an administrator ban.

Ejecting a user that has just been banned from the running application is a separate concern, brought
by a separate package. Nothing here logs anybody out.
