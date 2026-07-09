using CK.Core;
using CK.IO.UserManagement;
using CK.Ng.Zorro;
using CK.TypeScript;

namespace CK.Ng.Admin.UserManagement;

[TypeScriptPackage]
[Requires<AdminTSPackage>]

// Base workspace-user management: direct (basic) user creation + listing + edit. Invitation and
// archived-user features are brought by the CK.Ng.Admin.UserManagement.{UserInvitation,BinnedUser}
// sibling packages, which register their own command types.

// Q Commands
[RegisterTypeScriptType( typeof( IGetWorkspaceUserEditDataQCommand ) )]
[RegisterTypeScriptType( typeof( IGetWorkspaceUsersQCommand ) )]

// Commands
[RegisterTypeScriptType( typeof( ICreateWorkspaceUserCommand ) )]
[RegisterTypeScriptType( typeof( IEditWorkspaceUserCommand ) )]

public class UserManagementTSPackage : TypeScriptPackage
{
}
