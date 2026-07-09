using CK.Core;
using CK.IO.UserManagement;
using CK.TypeScript;

namespace CK.Ng.Admin.UserManagement.BinnedUser;

/// <summary>
/// Angular package that brings the archived-user (recycle-bin) features to the admin user management:
/// the "show archived" filter and the archive / restore actions. It injects into the base
/// <see cref="UserManagementTSPackage"/> components via <c>.t</c> transformers.
/// </summary>
[TypeScriptPackage]
[Requires<UserManagementTSPackage>]
[RegisterTypeScriptType( typeof( IArchiveUsersAdminCommand ) )]
[RegisterTypeScriptType( typeof( IRestoreUsersAdminCommand ) )]
public class UserManagementBinnedUserPackage : TypeScriptPackage
{
}
