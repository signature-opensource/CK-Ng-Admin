using CK.Core;
using CK.IO.Actor;
using CK.IO.UserManagement;
using CK.Ng.Zorro;
using CK.TypeScript;

namespace CK.Ng.Admin.UserManagement;

[TypeScriptPackage]
[Requires<AdminTSPackage>]

// Q Commands
[RegisterTypeScriptType( typeof( IGetWorkspaceUserEditDataQCommand ) )]
[RegisterTypeScriptType( typeof( IGetPlatformPendingInvitationsQCommand ) )]
[RegisterTypeScriptType( typeof( IGetWorkspacePendingInvitationsQCommand ) )]
[RegisterTypeScriptType( typeof( IGetWorkspaceInvitationDataQCommand ) )]
[RegisterTypeScriptType( typeof( IGetWorkspaceUsersQCommand ) )]

// Commands
[RegisterTypeScriptType( typeof( IResendInvitationsCommand ) )]
[RegisterTypeScriptType( typeof( IDeactivateInvitationsCommand ) )]
[RegisterTypeScriptType( typeof( IDestroyInvitationsCommand ) )]
[RegisterTypeScriptType( typeof( IArchiveUsersAdminCommand ) )]
[RegisterTypeScriptType( typeof( ICreateInvitationCommand ) )]
[RegisterTypeScriptType( typeof( IEditWorkspaceUserCommand ) )]
[RegisterTypeScriptType( typeof( IRestoreUsersAdminCommand ) )]
[RegisterTypeScriptType( typeof( IValidateInvitationTokenCommand ) )]
[RegisterTypeScriptType( typeof( ICompleteRegistrationCommand ) )]

public class UserManagementTSPackage : TypeScriptPackage
{
}
