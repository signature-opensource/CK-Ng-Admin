using CK.Core;
using CK.TypeScript;

namespace CK.Ng.Admin;

[TypeScriptPackage]
[Requires<UserProfile.Workspace.UserProfileWorkspacePackage>]
[RegisterTypeScriptType( typeof( GrantLevel ) )]
// The IsPlatformAdmin of the user profile (the server rule), read by the isAdmin signal.
[RegisterTypeScriptType( typeof( CK.IO.Admin.IUserProfile ) )]
public class AdminTSPackage : TypeScriptPackage
{
}
