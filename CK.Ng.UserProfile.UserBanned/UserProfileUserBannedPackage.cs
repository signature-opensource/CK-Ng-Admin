using CK.AspNet.SessionChannel;
using CK.Core;
using CK.TS.Angular;
using CK.TypeScript;

namespace CK.Ng.UserProfile.UserBanned;

/// <summary>
/// Brings the banishment flow to the client: as soon as a user is banished it is logged out and sent
/// back to the authentication page, where the login is already refused by <c>CK.sAuthUserOnLogin</c>.
/// <para>
/// Three independent paths lead there, by decreasing speed: the push on the session channel (the user
/// is ejected the instant an administrator confirms the ban), the rejection of the channel
/// registration (the case of a user that was unreachable and comes back), and the navigation guard
/// (a hard reload or a typed URL). None of them is a security mechanism: what actually makes a
/// banishment effective is the server refusing the commands of a banished actor.
/// </para>
/// <para>
/// Same shape as <c>CK.Ng.UserProfile.UserPassword.Reset</c>: a flag on the user profile, a
/// <c>CanActivateFn</c>, and an <c>AppRoutes.t</c> that hooks it onto the private page.
/// </para>
/// </summary>
[TypeScriptPackage]
[Requires<UserProfilePackage, SessionChannelPackage, CK.Ng.WebSocketChannel.NgWebSocketChannelPackage>]
// Navigation guard of the banishment flow, registered on the private page by AppRoutes.t.
[TypeScriptFile( "banned-guard.ts", "bannedGuard" )]
// Holds the session channel and owns the single logout path shared by all three detections.
[TypeScriptFile( "banned-session.ts", "BannedSession" )]
[NgProviderImport( "BannedSession" )]
[NgProviderImport( "provideAppInitializer", From = "@angular/core" )]
// Forced at startup: the channel must be listening before the user does anything, and nothing else
// injects BannedSession until a navigation happens.
[NgProvider( "provideAppInitializer( () => { inject( BannedSession ); } )" )]
public class UserProfileUserBannedPackage : TypeScriptPackage
{
}
