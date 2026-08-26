# CK.Ng.Admin

Angular CKomposable package that brings the `/admin` page: the administration shell that the actual
administration features hang off, plus the single answer to "is the current user an administrator?".

## What it brings.

| | |
|---|---|
| Route | `/admin` - [`AdminPageComponent`](AdminPage/AdminPageComponent.cs), a lazy child of `INgPrivatePageComponent`, declared with `HasRoutes = true` so satellites can register their own child routes |
| Transformer | [`user-service.t`](Res/user-service.t) adds the `isAdmin` signal to the user service |
| Registered type | `GrantLevel` |
| Translations | `CK.Admin.SideBar.Label`, in [default.jsonc](Res/ts-locales/default.jsonc) and [fr.jsonc](Res/ts-locales/fr.jsonc) |

## Requires.

- [`UserProfileWorkspacePackage`](https://github.com/signature-opensource/CK-Ng-User-UserProfile) -
  the workspace notion is what `isAdmin` is relative to.

## isAdmin is computed, and it has two branches.

`user-service.t` injects an `isAdmin` signal that reads the groups of the loaded user profile:

1. **Platform administrator** - if the user belongs to the `AdminZone` group with a grant level of at
   least `SafeAdministrator`, it is an administrator everywhere, and the computation stops there.
2. **Workspace administrator** - otherwise the grant level held on the *current* workspace group
   decides, again against `SafeAdministrator`.

So `isAdmin` is not a role, it is a grant level threshold evaluated against a scope that changes when
the user switches workspace. A workspace administrator loses `isAdmin` by switching to a workspace
where it is a plain member, with no round trip.

The injected code carries its own anchors - `PrePlatformAdmin` / `PostPlatformAdmin` and
`PreWorkspaceAdmin` / `PostWorkspaceAdmin` - so a deployment with an extra notion of administrator can
extend the rule without rewriting it.

> This signal drives what the UI *offers*. It is not a security mechanism: what makes an
> administrative action possible is the server accepting the command.
