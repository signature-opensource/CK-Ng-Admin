using CK.Core;
using CK.IO.UserManagement;
using CK.TypeScript;

namespace CK.Ng.Admin.UserManagement.UserInvitation;

/// <summary>
/// Angular package that brings everything invitation-related to the admin user management: the pending
/// invitations tab, the (anonymous) registration page, the e-mail column / field, and the
/// invitation-based user creation flow. It injects into the base <see cref="UserManagementTSPackage"/>
/// components via <c>.t</c> transformers.
/// </summary>
[TypeScriptPackage]
[Requires<UserManagementTSPackage, UserProfile.UserPassword.Lost.UserProfilePasswordLostPackage>]

// Q Commands
[RegisterTypeScriptType( typeof( IGetPlatformPendingInvitationsQCommand ) )]
[RegisterTypeScriptType( typeof( IGetWorkspacePendingInvitationsQCommand ) )]
[RegisterTypeScriptType( typeof( IGetWorkspaceInvitationDataQCommand ) )]

// Commands
[RegisterTypeScriptType( typeof( ICreateInvitationCommand ) )]
[RegisterTypeScriptType( typeof( IResendInvitationsCommand ) )]
[RegisterTypeScriptType( typeof( IDeactivateInvitationsCommand ) )]
[RegisterTypeScriptType( typeof( IDestroyInvitationsCommand ) )]
[RegisterTypeScriptType( typeof( IValidateInvitationTokenCommand ) )]
[RegisterTypeScriptType( typeof( ICompleteRegistrationCommand ) )]
// E-mail-aware edit extension: adds the Email property to the generated EditWorkspaceUserCommand.
[RegisterTypeScriptType( typeof( CK.IO.UserManagement.UserInvitation.IEditWorkspaceUserCommand ) )]
public class UserManagementUserInvitationPackage : TypeScriptPackage
{
}
