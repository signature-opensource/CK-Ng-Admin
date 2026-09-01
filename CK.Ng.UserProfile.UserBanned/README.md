# CK.Ng.UserProfile.UserBanned

Angular CKomposable package that brings the banishment flow to the client: as soon as a user is
banished it is logged out and sent back to the authentication page, where the login is already refused
by `CK.sAuthUserOnLogin`.

Four pieces: a `CanActivateFn`, the `BannedSession` service that owns the single logout path, an
`AppRoutes.t` that hooks the guard onto the private page, and the translations. The `isBanned` flag they
all read is not one of them - it is supplied by the application's user profile, and only read here.

> Note that this package sits in the CK-Ng-Admin repository but belongs to the `CK.Ng.UserProfile.*`
> family - it extends the user profile, not the admin page.

## What it brings.

| | |
|---|---|
| Guard | [`banned-guard.ts`](Res/banned-guard.ts) - `bannedGuard`, registered on the private page |
| Service | [`banned-session.ts`](Res/banned-session.ts) - `BannedSession`, holds the session channel and owns the single logout path |
| Transformer | [`AppRoutes.t`](Res/AppRoutes.t) |
| Translations | `CK.Auth.Banned.Message`, in [default.jsonc](Res/ts-locales/default.jsonc) and [fr.jsonc](Res/ts-locales/fr.jsonc) |

`BannedSession` is forced at startup through `provideAppInitializer`: the channel must be listening
before the user does anything, and nothing else would inject the service until a navigation happens.

## Requires.

- `CK.Ng.UserProfile`, `CK.AspNet.ActorChannel`, `CK.Ng.AspNet.WebSocketChannel`

## Three detections, one exit.

Three independent paths lead to the logout, by decreasing speed:

1. **The push on the session channel** - the user is ejected the instant an administrator confirms the
   ban.
2. **The rejection of the channel registration** - the case of a user that was unreachable and comes
   back.
3. **The navigation guard** - a hard reload, or a typed URL.

All three converge on the single logout path owned by `BannedSession`, which is why the service exists
at all rather than the logic living in the guard.

**None of them is a security mechanism.** What actually makes a banishment effective is the server
refusing the commands of a banished actor. These three paths only stop the client from displaying an
application it can no longer use.

## Why AppRoutes.t is additive.

`CK.Ng.UserProfile.UserPassword.Reset` writes the whole `runGuardsAndResolvers` + `canActivate` block
of the private page. Writing it again here would produce a duplicate key and silently drop one of the
two guards. So this transformer inserts into the array instead:

```
insert "bannedGuard, " after single "canActivate: [";
```

Both guards survive, whatever order the two transformers are applied in.

## An undeclared dependency on CK.Ng.UserProfile.UserPassword.Reset.

`insert ... after single "canActivate: ["` needs that array to already exist, and `single` requires
exactly one match. The engine does not emit it: in a configuration that references neither guard, the
generated `CK/Angular/routes.ts` ends at `, children: rPrivatePage` with no `canActivate` at all. The
array is created by the `AppRoutes.t` of `CK.Ng.UserProfile.UserPassword.Reset` - the only other file in
the stack that writes `canActivate` on the app routes.

Yet this package declares

```csharp
[Requires<UserProfilePackage, ActorChannelPackage, CK.Ng.AspNet.WebSocketChannel.NgWebSocketChannelPackage>]
```

with no dependency on Reset. **The dependency is real but undeclared**, and it holds today only by
composition: the single configuration that uses this package also references
`CK.Ng.Admin.UserManagement`, which depends on Reset, so the anchor happens to be there.

Referencing this package for the banishment ejection *without* the temporary-password flow leaves the
transformer with nothing to match. Adding `[Requires<UserProfilePasswordResetPackage>]` would state the
constraint where it belongs - or the array should be emitted by whoever owns the private page route.
