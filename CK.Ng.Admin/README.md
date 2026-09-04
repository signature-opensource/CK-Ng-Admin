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

## What your application must supply.

`isAdmin` reads `Groups` and the current workspace off the loaded user profile - so those fields have
to be there. The default handler for `IGetUserProfileQCommand` lives in the database layer and returns
a plainer profile that carries neither - the test handler linked below names it in its own summary.
An application using this package therefore provides its own:

```csharp
public class GetUserProfileCommandHandler : IAutoService, ICommandHandler<IGetUserProfileQCommand>
{
    readonly UserQueries _queries;

    public GetUserProfileCommandHandler( UserQueries queries )
    {
        _queries = queries;
    }

    [CommandHandler]
    public Task<CK.IO.UserProfile.Workspace.IUserProfile?> GetUserProfileAsync( ISqlCallContext ctx,
                                                                               IGetUserProfileQCommand cmd )
        => _queries.GetUserProfileAsync( ctx, cmd.UserId );
}
```

Two mechanisms in that declaration, and both are load-bearing:

- **The return type is the specialized `IUserProfile` shape** that comes with
  `CK.Ng.UserProfile.Workspace`, the package referenced here - the shape carrying
  `PreferredWorkspaceId` and the `Groups` list. That is what `isAdmin` consumes. Return the base shape
  and the signal has nothing to evaluate.
- **Declaring `ICommandHandler<IGetUserProfileQCommand>` is what wins the election.** The handler's own
  comment states it: doing so *"makes the Cris engine elect this service over any other
  `[CommandHandler]` for the same command"*. You do not deregister the default; you declare the
  interface and it is superseded.

So this package's contribution is the *rule*, and the profile it evaluates is the application's
responsibility. Note that nothing in this package asserts the profile carries `Groups`: the signal
reads them off the payload, so supplying the base shape leaves it nothing to evaluate rather than
raising anything.

The [`GetUserProfileCommandHandler`](../Tests/CK.Ng.Admin.Tests/User/GetUserProfileCommandHandler.cs)
of this package's tests is the reference - its `UserQueries` is test-only Dapper machinery, not package
API. Engine wiring for a test host is in the test project's `AdminTests`, and
`Sample/CK.Ng.Admin.Sample.App` shows the whole thing in an application.

> This signal drives what the UI *offers*. It is not a security mechanism: what makes an
> administrative action possible is the server accepting the command.
