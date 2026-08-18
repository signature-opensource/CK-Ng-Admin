using CK.Core;
using CK.IO.UserManagement;
using CK.Ng.Zorro;
using CK.TypeScript;

namespace CK.Ng.Admin.UserManagement;

[TypeScriptPackage]
[Requires<AdminTSPackage, UserProfile.UserPassword.Reset.UserProfilePasswordResetPackage>]

// Strong password generation, shared by the creation form and the force-reset modal.
[TypeScriptFile( "password-generator.ts", "generateStrongPassword" )]

// Base workspace-user management: direct (basic) user creation + listing + edit. Invitation and
// banned-user features are brought by the CK.Ng.Admin.UserManagement.{UserInvitation,UserBanned}
// sibling packages, which register their own command types.

// Q Commands
[RegisterTypeScriptType( typeof( IGetWorkspaceUserEditDataQCommand ) )]
[RegisterTypeScriptType( typeof( IGetWorkspaceUsersQCommand ) )]

// Commands
[RegisterTypeScriptType( typeof( ICreateWorkspaceUserCommand ) )]
[RegisterTypeScriptType( typeof( IEditWorkspaceUserCommand ) )]
[RegisterTypeScriptType( typeof( IForceResetUserPasswordCommand ) )]

public class UserManagementTSPackage : TypeScriptPackage
{
}
