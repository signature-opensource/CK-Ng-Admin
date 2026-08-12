using CK.Core;
using CK.TS.Angular;
using CK.TypeScript;

namespace CK.Ng.Admin.UserManagement;

/// <summary>
/// Modal content capturing the banishment parameters (reason, start date and optional end date) before
/// a <c>SetUserBannedCommand</c> is sent. The scalar fields are rendered by the shared
/// <c>GenericForm</c>; this component owns the "eternal ban" toggle that clears the end date.
/// </summary>
[NgComponent]
[Package<UserBanned.UserManagementUserBannedPackage>]
public sealed class BanUserFormComponent : NgComponent
{
}
