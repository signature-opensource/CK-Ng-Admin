using CK.Core;
using CK.IO.UserManagement;
using CK.TypeScript;

namespace CK.Ng.Admin.UserManagement.UserBanned;

/// <summary>
/// Angular package that brings the banished-user features to the admin user management: the "show
/// banned" filter, the banned tag next to the user name and the ban / unban actions. It injects into
/// the base <see cref="UserManagementTSPackage"/> components via <c>.t</c> transformers.
/// </summary>
[TypeScriptPackage]
[Requires<UserManagementTSPackage>]
[RegisterTypeScriptType( typeof( ISetUserBannedAdminCommand ) )]
[RegisterTypeScriptType( typeof( IDestroyUserBannedAdminCommand ) )]
public class UserManagementUserBannedPackage : TypeScriptPackage
{
}
