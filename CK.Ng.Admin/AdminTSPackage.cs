using CK.Core;
using CK.TypeScript;

namespace CK.Ng.Admin;

[TypeScriptPackage]
[Requires<UserProfile.Workspace.UserProfileWorkspacePackage>]
[RegisterTypeScriptType( typeof( GrantLevel ) )]
public class AdminTSPackage : TypeScriptPackage
{
}
